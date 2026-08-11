// server/adapters/opencode/index.ts
//
// Implements HarnessAdapter against @opencode-ai/sdk. This is the template
// for codex/claude adapters later — same interface, different SDK/CLI calls
// and a different mappers.ts.

import type { Event } from '@opencode-ai/sdk/v2';

import { getOpencodeClient } from '@/server/adapters/opencode/client';

import {
  toAeroMessage,
  toAeroPart,
  toAeroSession,
  toAeroSessionV2,
} from './mappers';
import { unwrap } from './unwrap';
import { PAGINATION_LIMIT } from '../../helper';
import type {
  AeroEvent,
  AeroPart,
  AeroTocItem,
  HarnessAdapter,
  StreamEventsOptions,
} from '../../services/harness/types';

export async function createOpencodeAdapter(): Promise<HarnessAdapter> {
  const client = await getOpencodeClient();

  return {
    id: 'opencode',

    async listSessions({
      cursor,
      limit = PAGINATION_LIMIT,
      search,
    }: {
      cursor?: string;
      limit?: number;
      search?: string;
    }) {
      const sessions = unwrap(
        await client.v2.session.list({
          cursor,
          limit,
          search,
        }),
      );

      const items = (sessions.data ?? [])
        .filter((s) => !s?.time?.archived)
        .map(toAeroSessionV2);

      return {
        items,
        nextCursor: sessions.cursor?.next,
      };
    },

    async listArchivedSessions() {
      const sessions = unwrap(
        await client.experimental.session.list({
          limit: 1000,
        }),
      );

      return sessions.map(toAeroSession);
    },

    async createSession(input) {
      const session = unwrap(
        await client.session.create({
          title: input.title,
        }),
      );

      return toAeroSession(session);
    },

    async getSession(sessionID) {
      const session = unwrap(await client.session.get({ sessionID }));
      return toAeroSession(session);
    },

    async deleteSession(sessionID) {
      return unwrap(await client.session.delete({ sessionID }));
    },

    async listMessages(sessionID) {
      const entries = unwrap(await client.session.messages({ sessionID }));
      return entries.map(toAeroMessage);
    },

    async listTocs(sessionID) {
      const entries = unwrap(await client.session.messages({ sessionID }));

      const messages = entries.map(toAeroMessage);

      // Group messages by consecutive roles to track virtualized group indices
      const items: AeroTocItem[] = [];
      let groupIndex = -1;
      let currentRole: string | null = null;

      for (const msg of messages) {
        if (msg.role !== currentRole) {
          groupIndex++;
          currentRole = msg.role;
        }

        // Only extract items for user messages (taking the first user message in a group)
        if (msg.role === 'user') {
          const userText = (msg.parts ?? [])
            .filter((p) => p.type === 'text')
            .map((p) => (p as { type: 'text'; text: string }).text)
            .join(' ')
            .trim();

          // Avoid duplicate TOC entries if multiple user messages are grouped together
          const lastItem = items.at(-1);
          if (!lastItem || lastItem.groupIndex !== groupIndex) {
            items.push({
              id: msg.id,
              groupIndex,
              label: userText.slice(0, 80) || `Prompt ${items.length + 1}`,
            });
          }
        }
      }

      return items;
    },

    async messagesToMarkdown(sessionID) {
      const sessionItem = unwrap(await client.session.get({ sessionID }));

      const entries = unwrap(await client.session.messages({ sessionID }));

      const messages = entries.map(toAeroMessage);

      const formatPart = (part: AeroPart): string | null => {
        switch (part.type) {
          case 'text':
            return part.text.trim().length > 0 ? part.text.trim() : null;

          case 'reasoning':
          case 'tool':
            return null;

          // case 'reasoning':
          //   return part.text.trim().length > 0
          //     ? `> *Thinking:*\n> ${part.text.trim().replace(/\n/g, '\n> ')}`
          //     : null;

          // case 'tool': {
          //   const header = `*[Tool: ${part.toolName} (${part.status})]*`;
          //   if (part.error) {
          //     return `${header}\n\`\`\`\nError: ${part.error}\n\`\`\``;
          //   }
          //   if (part.output) {
          //     const formattedOutput =
          //       typeof part.output === 'string'
          //         ? part.output
          //         : JSON.stringify(part.output, null, 2);
          //     return `${header}\n\`\`\`json\n${formattedOutput}\n\`\`\``;
          //   }
          //   return header;
          // }

          case 'file':
            return `*[File: ${part.path}]*`;

          default:
            return null;
        }
      };

      // 1. Map messages to text blocks
      const formattedMessages = messages
        .map((msg) => {
          const content = msg.parts
            .map(formatPart)
            .filter((text): text is string => text !== null)
            .join('\n\n');

          return {
            role: msg.role === 'user' ? 'User' : 'Assistant',
            content,
          };
        })
        // 2. Drop any messages that ended up empty
        .filter((msg) => msg.content.length > 0);

      // 3. Determine title from session or first user message
      const title = sessionItem.title;

      // 4. Export Date (YYYY-MM-DD)
      const exportDate = new Date().toISOString().split('T')[0];

      // 5. Build full Markdown Document
      const header = `# ${title}\n\n*Exported on ${exportDate}*`;

      const body = formattedMessages
        .map((msg) => `### ${msg.role}\n\n${msg.content}`)
        .join('\n\n---\n\n');

      return {
        title,
        markdown: `${header}\n\n---\n\n${body}`,
      };
    },

    async archiveSession(sessionID) {
      const session = unwrap(
        await client.session.update({
          sessionID,
          time: {
            archived: Date.now(),
          },
        }),
      );

      return toAeroSession(session);
    },

    async unarchiveSession(sessionID) {
      const session = unwrap(
        await client.session.update({
          sessionID,
          time: {
            archived: undefined,
          },
        }),
      );

      return toAeroSession(session);
    },

    async renameSession({ sessionId, title }) {
      const session = unwrap(
        await client.session.update({
          sessionID: sessionId,
          title,
        }),
      );

      return toAeroSession(session);
    },

    async sendMessage(sessionID, input) {
      unwrap(
        await client.session.promptAsync({
          sessionID,
          parts: input.parts.map((p) =>
            p.type === 'text' ? { type: 'text', text: p.text } : (p as never),
          ),
          model: input.model
            ? {
                providerID: input.model.providerId,
                modelID: input.model.modelId,
              }
            : undefined,
        }),
      );
    },

    async sendMessageSync(sessionID, input) {
      const { info, parts } = unwrap(
        await client.session.prompt({
          sessionID,
          parts: input.parts.map((p) =>
            p.type === 'text' ? { type: 'text', text: p.text } : (p as never),
          ),
          model: input.model
            ? {
                providerID: input.model.providerId,
                modelID: input.model.modelId,
              }
            : undefined,
        }),
      );
      return toAeroMessage({ info, parts });
    },

    async abortSession(sessionID) {
      return unwrap(await client.session.abort({ sessionID }));
    },

    async *streamEvents(
      options: StreamEventsOptions = {},
    ): AsyncIterable<AeroEvent> {
      const { sessionId, signal } = options;
      // event.subscribe()'s docs example uses `events.stream` directly,
      // suggesting this one isn't wrapped in {data,error} like the other
      // client methods. If TS disagrees here too, wrap with
      // `unwrap(await client.event.subscribe()).stream` instead.
      const events = await client.event.subscribe();

      for await (const event of events.stream) {
        if (signal?.aborted) return;

        const mapped = mapOpencodeEvent(event);
        if (!mapped) continue; // e.g. "server.connected" — nothing for Aero to relay

        // opencode's /event stream is global; scope it down to one session
        // here since that's what the SSE route exposes to the frontend.
        if (
          sessionId &&
          'sessionId' in mapped &&
          mapped.sessionId !== sessionId
        )
          continue;

        yield mapped;
      }
    },
  };
}

// `Event` is a real discriminated union from the SDK (EventMessageUpdated |
// EventSessionIdle | ... | EventServerConnected). Switching on event.type
// narrows event.properties to the matching variant automatically — no `any`
// needed, and TS will now tell you immediately if a property path below is
// wrong instead of failing silently at runtime.
//
// NOTE: EventMessageUpdated only carries `properties.info` (the Message
// itself), not its parts — parts arrive incrementally via separate
// message.part.updated events. toAeroMessage() below is called with an
// empty parts array here; the frontend should merge in parts as
// message.part.updated events for the same messageId arrive, rather than
// expecting a full message on every message.updated event.
function mapOpencodeEvent(event: Event): AeroEvent | null {
  switch (event.type) {
    case 'message.updated': {
      const { info } = event.properties;
      return {
        type: 'message.updated',
        sessionId: info.sessionID,
        message: toAeroMessage({ info, parts: [] }),
      };
    }

    case 'message.part.updated': {
      const { part } = event.properties;
      return {
        type: 'message.part.updated',
        sessionId: part.sessionID,
        messageId: part.messageID,
        part: toAeroPart(part),
      };
    }

    case 'session.idle':
      return { type: 'session.idle', sessionId: event.properties.sessionID };

    case 'session.error':
      return {
        type: 'session.error',
        sessionId: event.properties.sessionID,
        // Verify this against EventSessionError's actual `properties` shape
        // in your generated types — flagging since it wasn't in what you
        // pasted, only inferred from the naming pattern of the others.
        error:
          (event.properties as { error?: { message?: string } }).error
            ?.message ?? 'Unknown error',
      };

    default:
      return null;
  }
}
