import { getActiveAdapter } from '@/server/services/harness/registry';
import { ContextObligatoryMessage } from '@/server/types/opencode-sdk';

const MESSAGE_FETCH_LIMIT = 20;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

interface ContextState {
  metadata: Record<string, unknown>;
  aero: Record<string, unknown>;
  messages: ContextObligatoryMessage[];
}

const readContextState = (session: unknown): ContextState => {
  const sessionRecord = isRecord(session) ? session : {};
  const metadata = isRecord(sessionRecord.metadata)
    ? sessionRecord.metadata
    : {};
  const aero = isRecord(metadata.aero) ? metadata.aero : {};

  const messages = Array.isArray(aero.context_obligatory_messages)
    ? (aero.context_obligatory_messages as unknown[]).filter(
        (item): item is ContextObligatoryMessage =>
          isRecord(item) &&
          typeof item.id === 'string' &&
          typeof item.createdAt === 'number' &&
          (item.role === 'user' || item.role === 'assistant'),
      )
    : [];

  return { metadata, aero, messages };
};

const buildContextPrompt = (
  entries: Array<{ pinned: ContextObligatoryMessage; text: string }>,
): string => {
  const timeline = entries
    .map(({ pinned, text }) => {
      const timestamp = new Date(pinned.createdAt).toISOString();
      return `## ${pinned.role} — ${timestamp}\n\n${text}`;
    })
    .join('\n\n---\n\n');

  return [
    'The following messages are from the compacted conversation. The user explicitly marked them as important and required in your context. Pay close attention to them; they may have been sent by either the user or you before compaction.',
    'Use them while continuing the pre-compaction work. Do not treat this context restoration as a new standalone task.',
    'If any tasks or next steps remain, do not acknowledge, summarize, or mention this restored context in a separate response. Simply continue the work and use it silently as background context. Do not append a recap of it after completing those tasks. Only if no tasks or next steps remain, give the user a very brief summary of the important restored context in no more than one short paragraph, without lists or a detailed recap.',
    '',
    timeline,
  ].join('\n');
};

const extractTextFromParts = (parts: unknown): string => {
  if (!Array.isArray(parts)) return '';

  return parts
    .filter(
      (part): part is { type: 'text'; text: string } =>
        isRecord(part) && part.type === 'text' && typeof part.text === 'string',
    )
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join('\n\n');
};

export interface CreateContextObligatoryRuntimeOptions {
  harnessId?: string;
}

export const createContextObligatoryRuntime = ({
  harnessId = 'opencode',
}: CreateContextObligatoryRuntimeOptions = {}) => {
  const inflight = new Set<string>();
  let stopped = false;

  const tick = async (
    sessionId: string,
    directoryHint: string,
  ): Promise<void> => {
    const harness = await getActiveAdapter(harnessId);

    const session = await harness.getSession(sessionId);

    // Skip sub-sessions.
    if ((session as { parentID?: string }).parentID) return;

    const state = readContextState(session);

    // Nothing to restore — bail before touching the message history.
    if (state.messages.length === 0) return;

    const directory = session.workspace || directoryHint;

    // Fetch recent messages so we can find the compaction summary and the
    // pre-compaction assistant's provider/model/agent.
    const allMessages = await harness.listMessages(sessionId);
    const recent = allMessages.slice(-MESSAGE_FETCH_LIMIT);
    if (recent.length === 0) return;

    const reversed = [...recent].reverse();

    const summary = reversed.find(
      (message) =>
        message.role === 'assistant' &&
        (message as { summary?: boolean }).summary === true,
    );

    const summaryId = (summary as { id?: string } | undefined)?.id;
    const summaryCompleted = (
      summary as { time?: { completed?: number } } | undefined
    )?.time?.completed;

    if (!summaryId || !summaryCompleted) return;

    // Already injected for this compaction — replay guard.
    if (
      state.aero.context_obligatory_last_compaction_message_id === summaryId
    ) {
      return;
    }

    // Fetch every pinned message individually. Promise.allSettled lets us
    // tolerate missing entries without discarding the rest.
    const fetched = await Promise.allSettled(
      state.messages.map(async (pinned) => {
        const message = await harness.getSessionMessage(sessionId, pinned.id);
        const text = extractTextFromParts(
          (message as { parts?: unknown } | undefined)?.parts,
        );
        return { pinned, text };
      }),
    );

    const entries = fetched
      .filter(
        (
          result,
        ): result is PromiseFulfilledResult<{
          pinned: ContextObligatoryMessage;
          text: string;
        }> => result.status === 'fulfilled' && Boolean(result.value.text),
      )
      .map((result) => result.value)
      .sort((left, right) => left.pinned.createdAt - right.pinned.createdAt);

    if (entries.length === 0) return;

    // Use the most recent non-summary assistant turn for provider/model/agent.
    const executionInfo = reversed.find(
      (message) =>
        message.role === 'assistant' &&
        (message as { summary?: boolean }).summary !== true,
    ) as
      | {
          providerID?: string;
          modelID?: string;
          agent?: string;
          mode?: string;
        }
      | undefined;

    const providerID =
      typeof executionInfo?.providerID === 'string'
        ? executionInfo.providerID
        : '';
    const modelID =
      typeof executionInfo?.modelID === 'string' ? executionInfo.modelID : '';

    if (!providerID || !modelID) {
      throw new Error('no pre-compaction assistant provider/model');
    }

    const agent =
      typeof executionInfo?.agent === 'string'
        ? executionInfo.agent
        : executionInfo?.mode;

    // Send the synthetic restoration turn.
    await harness.sendSyntheticMessage(
      sessionId,
      {
        parts: [
          {
            type: 'text',
            text: buildContextPrompt(entries),
            synthetic: true,
          } as never,
        ],
        model: { providerId: providerID, modelId: modelID },
        ...(typeof agent === 'string' && agent ? { agent } : {}),
      },
      directory,
    );

    // Re-read the session so we don't clobber any metadata written while the
    // send was in flight, then merge-write the cursor.
    const fresh = await harness.getSession(sessionId);
    const freshState = readContextState(fresh);

    await harness.updateSessionMetadata({
      sessionID: sessionId,
      metadata: {
        ...freshState.metadata,
        aero: {
          ...freshState.aero,
          context_obligatory_last_compaction_message_id: summaryId,
        },
      },
    });
  };

  const processPayload = (
    payload: {
      type?: string;
      properties?: { sessionID?: string; directory?: string };
    },
    directoryHint = '',
  ): Promise<void> | undefined => {
    if (stopped || payload?.type !== 'session.compacted') return;

    const sessionId = payload?.properties?.sessionID;
    if (typeof sessionId !== 'string' || inflight.has(sessionId)) return;

    const directory = payload?.properties?.directory || directoryHint;

    inflight.add(sessionId);

    return tick(sessionId, directory)
      .catch((error) => {
        console.warn(
          '[context-obligatory] injection failed:',
          (error as Error)?.message || error,
        );
      })
      .finally(() => inflight.delete(sessionId));
  };

  const stop = () => {
    stopped = true;
  };

  return { processPayload, stop };
};

export const contextObligatoryRuntime = createContextObligatoryRuntime({
  harnessId: 'opencode',
});
