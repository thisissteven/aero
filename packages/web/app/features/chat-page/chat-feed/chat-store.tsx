import { logger } from '@aero/ui';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  buildFlatConversationItems,
  type FlatConversationVirtualItem,
  type UsageExceeded,
} from '@/app/components/message-view/lib';
import { handleSessionUpdated } from '@/app/features/chat-page/chat-feed/event-handlers/session-updated';
import { sessionKeys } from '@/app/hooks/api/sessions';
import { queryClient } from '@/app/providers';
import { useActiveSessionStore } from '@/app/stores/active-session-id';
import {
  useMainChatScrollStore,
  useSideChatScrollStore,
} from '@/app/stores/chat-scroll-store';
import { useKeepMountedStoreFeed } from '@/app/stores/keep-mounted';
import type {
  AeroConversationTurn,
  AeroEvent,
  AeroMessage,
  AeroPart,
  AeroPermission,
  AeroSessionStatus,
} from '@/server/services/harness/types';
import { SHELL_TEMPLATE_TEXT } from '@/server/shared';

interface PendingDelta {
  field: 'text';
  delta: string;
}

type RevertedMessage = {
  preview: string;
  messageId: string;
};

export interface AeroQuestion {
  question: string;
  header?: string;
  multiple?: boolean;
  options?: Array<{ label: string; description?: string }>;
}

export interface AeroQuestionRequest {
  /** Stable request key. We use the tool part's callID. */
  id: string;
  sessionID: string;
  callID: string;
  messageID: string;
  questions: AeroQuestion[];
}

export interface SessionScrollState {
  /** Auto-scroll follows streaming output? */
  pinned: boolean;
  /** Within BOTTOM_THRESHOLD of the bottom? Drives the scroll-to-bottom button. */
  isAtBottom: boolean;
  /** New flat items since the user left the bottom. */
  unreadCount: number;
  /** Group index of the topmost visible user message. Drives TOC highlight. */
  activeGroupIndex: number;
}

const EMPTY_SCROLL: SessionScrollState = {
  pinned: true,
  isAtBottom: true,
  unreadCount: 0,
  activeGroupIndex: 0,
};

interface SessionRuntime {
  turns: AeroConversationTurn[];
  flatItems: FlatConversationVirtualItem[];
  groupFlatIndex: number[];
  revertedMessages: RevertedMessage[];

  status: AeroSessionStatus;
  isStreaming: boolean;
  streamStartedAt: number | null;

  usageExceeded?: UsageExceeded;

  hasLiveStatus: boolean;
  hasHydrated: boolean;

  messageTurnIds: Record<string, string>;
  permissions: AeroPermission[];
  questions: AeroQuestionRequest[];
}

interface ChatStore {
  activeSessionId: string | undefined;
  activeSideChatSessionId: string | undefined;
  activeSession: SessionRuntime;

  sessions: Record<string, SessionRuntime>;

  scrollBySession: Record<string, SessionScrollState>;

  patchScroll: (sessionId: string, patch: Partial<SessionScrollState>) => void;

  resetScroll: (sessionId: string) => void;

  runningSessions: string[];
  awaitingQuestions: string[];
  unreadSessions: Array<{
    sessionId: string;
    status: 'success' | 'error';
  }>;

  setActiveSession: (sessionId: string, revertMessageId?: string) => void;

  setConversationData: (
    sessionId: string,
    turns: AeroConversationTurn[],
    revertMessageId?: string,
  ) => void;

  setStatus: (
    sessionId: string,
    status: AeroSessionStatus,
    source?: 'query' | 'stream',
  ) => void;

  handleStreamEvent: (
    sessionId: string,
    event: AeroEvent,
    revertMessageId?: string,
  ) => void;

  addRunningSession: (sessionId: string) => void;
  removeRunningSession: (sessionId: string) => void;

  addAwaitingQuestion: (sessionId: string) => void;
  removeAwaitingQuestion: (sessionId: string) => void;

  addPermission: (permission: AeroPermission) => void;
  removePermission: (sessionId: string, requestId: string) => void;

  removeQuestion: (sessionId: string, requestId: string) => void;

  addUnreadSession: (sessionId: string, status: 'success' | 'error') => void;
  removeUnreadSession: (sessionId: string) => void;

  resetSession: (sessionId: string) => void;
}

const IDLE: AeroSessionStatus = { type: 'idle' };

function getLastUserMessageTime(turns: AeroConversationTurn[]) {
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].role === 'user') {
      return turns[i].createdAt;
    }
  }

  return null;
}

function scrollToBottom(
  event: {
    sessionId?: string;
  },
  sessionId: string,
) {
  const currentSessionId = event.sessionId;
  const currentSessionState = useChatStore.getState();
  if (currentSessionId) {
    if (currentSessionState.scrollBySession[currentSessionId].isAtBottom) {
      if (currentSessionState.activeSessionId === sessionId) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            useMainChatScrollStore.getState().scrollToBottom();
          });
        });
      } else {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            useSideChatScrollStore.getState().scrollToBottom();
          });
        });
      }
    }
  }
}

function getStreamStartTime(
  turns: AeroConversationTurn[],
  status: AeroSessionStatus,
  current: number | null,
) {
  if (status.type === 'idle') {
    return null;
  }

  return current ?? getLastUserMessageTime(turns) ?? Date.now();
}

function buildMessageTurnIds(
  turns: AeroConversationTurn[],
): Record<string, string> {
  const map: Record<string, string> = {};

  for (const turn of turns) {
    map[turn.id] = turn.id;

    for (const part of turn.parts) {
      if (part.messageID) {
        map[part.messageID] = turn.id;
      }
    }
  }

  return map;
}

function buildRuntime(
  turns: AeroConversationTurn[],
  isStreaming: boolean,
  revertMessageId?: string,
  usageExceeded?: UsageExceeded,
  prevRuntime?: SessionRuntime,
): Pick<
  SessionRuntime,
  'turns' | 'flatItems' | 'groupFlatIndex' | 'revertedMessages' | 'isStreaming'
> {
  const prev = prevRuntime
    ? {
        turns: prevRuntime.turns,
        flatItems: prevRuntime.flatItems,
        groupFlatIndex: prevRuntime.groupFlatIndex,
        revertedMessages: prevRuntime.revertedMessages,
        isStreaming: prevRuntime.isStreaming,
        revertMessageId,
        usageExceeded: prevRuntime.usageExceeded,
      }
    : undefined;

  const { flatItems, groupFlatIndex, revertedMessages } =
    buildFlatConversationItems(
      turns,
      isStreaming,
      revertMessageId,
      usageExceeded,
      prev,
    );

  return {
    turns,
    flatItems,
    groupFlatIndex,
    revertedMessages,
    isStreaming,
  };
}

const EMPTY_RUNTIME: SessionRuntime = Object.freeze({
  status: IDLE,
  streamStartedAt: null,
  usageExceeded: undefined,
  hasLiveStatus: false,
  hasHydrated: false,
  messageTurnIds: {},
  permissions: [],
  questions: [],
  flatItems: [],
  groupFlatIndex: [],
  isStreaming: false,
  revertedMessages: [],
  turns: [],
});

function createEmptyRuntime(): SessionRuntime {
  return EMPTY_RUNTIME;
}

function getRuntime(
  sessions: Record<string, SessionRuntime>,
  sessionId: string,
) {
  return sessions[sessionId] ?? createEmptyRuntime();
}

function commitRuntime(
  state: ChatStore,
  sessionId: string,
  runtime: SessionRuntime,
) {
  const sessions = {
    ...state.sessions,
    [sessionId]: runtime,
  };

  const runningSessions = runtime.isStreaming
    ? state.runningSessions.includes(sessionId)
      ? state.runningSessions
      : [...state.runningSessions, sessionId]
    : state.runningSessions.filter((id) => id !== sessionId);

  const awaitingQuestions = hasAwaitingQuestion(runtime.turns)
    ? state.awaitingQuestions.includes(sessionId)
      ? state.awaitingQuestions
      : [...state.awaitingQuestions, sessionId]
    : state.awaitingQuestions.filter((id) => id !== sessionId);

  return {
    sessions,
    runningSessions,
    awaitingQuestions,
    activeSession:
      state.activeSessionId === sessionId ? runtime : state.activeSession,
  };
}

function hasAwaitingQuestion(turns: AeroConversationTurn[]) {
  return turns.some((turn) =>
    turn.parts.some(
      (part) =>
        part.type === 'tool' &&
        part.toolName === 'question' &&
        part.status === 'running',
    ),
  );
}

function upsertPermission(
  permissions: AeroPermission[],
  permission: AeroPermission,
) {
  const existingIndex = permissions.findIndex(
    (item) => item.id === permission.id,
  );

  if (existingIndex === -1) {
    return [...permissions, permission];
  }

  const next = permissions.slice();
  next[existingIndex] = permission;
  return next;
}

function removePermissionFromRuntime(
  runtime: SessionRuntime,
  requestId: string,
) {
  const permissions = runtime.permissions.filter(
    (permission) => permission.id !== requestId,
  );

  if (permissions.length === runtime.permissions.length) {
    return runtime;
  }

  return {
    ...runtime,
    permissions,
  };
}

function upsertQuestion(
  questions: AeroQuestionRequest[],
  question: AeroQuestionRequest,
) {
  const existingIndex = questions.findIndex((q) => q.id === question.id);
  if (existingIndex === -1) return [...questions, question];
  const next = questions.slice();
  next[existingIndex] = question;
  return next;
}

function removeQuestionFromRuntime(runtime: SessionRuntime, requestId: string) {
  const questions = runtime.questions.filter((q) => q.id !== requestId);
  if (questions.length === runtime.questions.length) return runtime;
  return { ...runtime, questions };
}

function getQuestionCallId(part: AeroPart): string | null {
  if (part.type !== 'tool') return null;
  if (part.toolName !== 'question') return null;
  return part.callID ?? null;
}

function extractQuestionRequest(
  part: AeroPart,
  fallbackSessionId: string,
): AeroQuestionRequest | null {
  if (part.type !== 'tool') return null;
  if (part.toolName !== 'question') return null;
  if (part.status !== 'running') return null;

  const rawInput = (part as { input?: { questions?: unknown } }).input;
  if (!rawInput || !Array.isArray(rawInput.questions)) return null;
  if (rawInput.questions.length === 0) return null;

  return {
    id: part.callID,
    sessionID: part.sessionID ?? fallbackSessionId,
    callID: part.callID,
    messageID: part.messageID,
    questions: rawInput.questions as AeroQuestion[],
  };
}

function findTurnIndexByMessageId(runtime: SessionRuntime, messageId: string) {
  const mappedTurnId = runtime.messageTurnIds[messageId];

  if (mappedTurnId) {
    const mappedIndex = runtime.turns.findIndex(
      (turn) => turn.id === mappedTurnId,
    );

    if (mappedIndex !== -1) {
      return mappedIndex;
    }
  }

  return runtime.turns.findIndex(
    (turn) =>
      turn.id === messageId ||
      turn.parts.some((part) => part.messageID === messageId),
  );
}

function replaceMessageParts(
  turn: AeroConversationTurn,
  messageId: string,
  incomingParts: AeroPart[],
) {
  const incomingIds = new Set(incomingParts.map((part) => part.id));

  const nextParts = turn.parts.filter(
    (part) => part.messageID !== messageId || incomingIds.has(part.id),
  );

  for (const incomingPart of incomingParts) {
    const index = nextParts.findIndex((part) => part.id === incomingPart.id);

    if (index === -1) {
      nextParts.push(incomingPart);
    } else {
      nextParts[index] = incomingPart;
    }
  }

  return nextParts;
}

function updateFlatAssistantPart(
  flatItems: FlatConversationVirtualItem[],
  turnId: string,
  partIndex: number,
  part: AeroPart,
): FlatConversationVirtualItem[] | null {
  for (let i = flatItems.length - 1; i >= 0; i--) {
    const item = flatItems[i];

    if (
      item.type === 'assistant-part' &&
      item.turnId === turnId &&
      item.partIndex === partIndex
    ) {
      const nextFlatItems = flatItems.slice();
      nextFlatItems[i] = {
        ...item,
        part,
      };
      return nextFlatItems;
    }
  }

  return null;
}

function appendIncomingMessage(
  runtime: SessionRuntime,
  incoming: AeroMessage,
): SessionRuntime {
  const existingTurnId = runtime.messageTurnIds[incoming.id];

  if (existingTurnId) {
    const turnIndex = runtime.turns.findIndex(
      (turn) => turn.id === existingTurnId,
    );

    if (turnIndex !== -1) {
      const nextTurns = runtime.turns.slice();
      const turn = nextTurns[turnIndex];

      nextTurns[turnIndex] = {
        ...turn,
        parts:
          incoming.parts.length > 0
            ? replaceMessageParts(turn, incoming.id, incoming.parts)
            : turn.parts,
        createdAt:
          turn.id === incoming.id ? incoming.createdAt : turn.createdAt,
        error: incoming.error ?? turn.error,
      };

      const messageTurnIds = { ...runtime.messageTurnIds };
      for (const part of incoming.parts) {
        if (part.messageID) {
          messageTurnIds[part.messageID] = existingTurnId;
        }
      }

      return {
        ...runtime,
        ...buildRuntime(
          nextTurns,
          runtime.isStreaming,
          undefined,
          runtime.usageExceeded,
          runtime,
        ),
        messageTurnIds,
      };
    }
  }

  const previous = runtime.turns.at(-1);

  if (previous?.role === incoming.role) {
    const nextTurns = [
      ...runtime.turns.slice(0, -1),
      {
        ...previous,
        parts: [...previous.parts, ...incoming.parts],
        error: incoming.error ?? previous.error,
      },
    ];

    const messageTurnIds = {
      ...runtime.messageTurnIds,
      [incoming.id]: previous.id,
    };

    for (const part of incoming.parts) {
      if (part.messageID) {
        messageTurnIds[part.messageID] = previous.id;
      }
    }

    return {
      ...runtime,
      ...buildRuntime(
        nextTurns,
        runtime.isStreaming,
        undefined,
        runtime.usageExceeded,
        runtime,
      ),
      messageTurnIds,
    };
  }

  const nextTurn: AeroConversationTurn = {
    id: incoming.id,
    role: incoming.role,
    parts: [...incoming.parts],
    createdAt: incoming.createdAt,
    error: incoming.error,
    providerID: incoming.providerID,
    modelID: incoming.modelID,
    agent: incoming.agent,
    mode: incoming.mode,
  };

  const messageTurnIds = {
    ...runtime.messageTurnIds,
    [incoming.id]: incoming.id,
  };

  for (const part of incoming.parts) {
    if (part.messageID) {
      messageTurnIds[part.messageID] = incoming.id;
    }
  }

  return {
    ...runtime,
    ...buildRuntime(
      [...runtime.turns, nextTurn],
      runtime.isStreaming,
      undefined,
      runtime.usageExceeded,
      runtime,
    ),
    messageTurnIds,
  };
}

function getNextStatusRuntime(
  current: SessionRuntime,
  status: AeroSessionStatus,
  source: 'query' | 'stream',
  revertMessageId?: string,
) {
  const isStreaming = status.type !== 'idle';

  const usageExceeded =
    status.type === 'retry' && status.action?.reason === 'free_tier_limit'
      ? {
          title: status.action.title,
          message: status.action.message,
          label: status.action.label,
          link: status.action.link,
        }
      : status.type === 'idle'
        ? undefined
        : current.usageExceeded;

  return {
    ...current,
    status,
    usageExceeded,
    hasLiveStatus: source === 'stream' ? true : current.hasLiveStatus,
    streamStartedAt: getStreamStartTime(
      current.turns,
      status,
      current.streamStartedAt,
    ),
    ...buildRuntime(
      current.turns,
      isStreaming,
      revertMessageId,
      usageExceeded,
      current,
    ),
    isStreaming,
  };
}

function buildUpdatedMessageRuntime(
  current: SessionRuntime,
  message: AeroMessage,
  pendingParts: AeroPart[] | undefined,
  revertMessageId?: string,
) {
  const runtime = appendIncomingMessage(current, message);

  if (!pendingParts?.length) {
    return runtime;
  }

  const turnIndex = findTurnIndexByMessageId(runtime, message.id);
  if (turnIndex === -1) {
    return runtime;
  }

  const nextTurns = runtime.turns.slice();
  const turn = nextTurns[turnIndex];
  const nextParts = turn.parts.slice();

  for (const part of pendingParts) {
    const partIndex = nextParts.findIndex((p) => p.id === part.id);
    if (partIndex === -1) {
      nextParts.push(part);
    } else {
      nextParts[partIndex] = part;
    }
  }

  nextTurns[turnIndex] = {
    ...turn,
    parts: nextParts,
  };

  return {
    ...runtime,
    ...buildRuntime(
      nextTurns,
      runtime.isStreaming,
      revertMessageId,
      runtime.usageExceeded,
      runtime,
    ),
  };
}

function updatePartInRuntime(
  current: SessionRuntime,
  event: Extract<AeroEvent, { type: 'message.part.updated' }>,
  part: AeroPart,
  revertMessageId?: string,
) {
  const turnIndex = findTurnIndexByMessageId(current, event.messageId);

  if (turnIndex === -1) {
    return null;
  }

  const nextTurns = current.turns.slice();
  const currentTurn = nextTurns[turnIndex];
  const partIndex = currentTurn.parts.findIndex(
    (currentPart) => currentPart.id === part.id,
  );

  if (partIndex === -1) {
    nextTurns[turnIndex] = {
      ...currentTurn,
      parts: [...currentTurn.parts, part],
    };
  } else {
    const nextParts = currentTurn.parts.slice();
    nextParts[partIndex] = part;
    nextTurns[turnIndex] = {
      ...currentTurn,
      parts: nextParts,
    };
  }

  const runtime: SessionRuntime = {
    ...current,
    ...buildRuntime(
      nextTurns,
      current.isStreaming,
      revertMessageId,
      current.usageExceeded,
      current,
    ),
    streamStartedAt:
      current.streamStartedAt ??
      getStreamStartTime(nextTurns, current.status, null),
  };

  return runtime;
}

function updatePartDeltaInRuntime(
  current: SessionRuntime,
  event: Extract<AeroEvent, { type: 'message.part.delta' }>,
  revertMessageId?: string,
) {
  const turnIndex = findTurnIndexByMessageId(current, event.messageId);
  if (turnIndex === -1) {
    return null;
  }

  const turn = current.turns[turnIndex];
  const partIndex = turn.parts.findIndex(
    (currentPart) => currentPart.id === event.partId,
  );

  if (partIndex === -1) {
    return null;
  }

  const part = turn.parts[partIndex];
  if (
    event.field !== 'text' ||
    (part.type !== 'text' && part.type !== 'reasoning')
  ) {
    return current;
  }

  const updatedPart: AeroPart = {
    ...part,
    text: part.text + event.delta,
  };

  const isCurrentStreamingPart =
    current.isStreaming &&
    turnIndex === current.turns.length - 1 &&
    partIndex === turn.parts.length - 1;

  if (isCurrentStreamingPart) {
    const nextFlatItems = updateFlatAssistantPart(
      current.flatItems,
      turn.id,
      partIndex,
      updatedPart,
    );

    if (nextFlatItems) {
      const nextTurns = current.turns.slice();
      const nextParts = turn.parts.slice();
      nextParts[partIndex] = updatedPart;
      nextTurns[turnIndex] = {
        ...turn,
        parts: nextParts,
      };

      return {
        ...current,
        turns: nextTurns,
        flatItems: nextFlatItems,
        streamStartedAt:
          current.streamStartedAt ??
          getStreamStartTime(nextTurns, current.status, null),
      };
    }
  }

  const nextTurns = current.turns.slice();
  const nextParts = turn.parts.slice();
  nextParts[partIndex] = updatedPart;
  nextTurns[turnIndex] = {
    ...turn,
    parts: nextParts,
  };

  return {
    ...current,
    ...buildRuntime(
      nextTurns,
      current.isStreaming,
      revertMessageId,
      current.usageExceeded,
      current,
    ),
    streamStartedAt:
      current.streamStartedAt ??
      getStreamStartTime(nextTurns, current.status, null),
  };
}

function handleSessionStatus(
  state: ChatStore,
  sessionId: string,
  current: SessionRuntime,
  status: AeroSessionStatus,
  source: 'query' | 'stream',
  revertMessageId?: string,
) {
  const runtime = getNextStatusRuntime(
    current,
    status,
    source,
    revertMessageId,
  );

  return commitRuntime(state, sessionId, runtime);
}

function handleSessionError(
  state: ChatStore,
  sessionId: string,
  current: SessionRuntime,
  error: NonNullable<Extract<AeroEvent, { type: 'session.error' }>['error']>,
  revertMessageId?: string,
) {
  let turnIndex = -1;

  for (let i = current.turns.length - 1; i >= 0; i--) {
    if (current.turns[i].role === 'assistant') {
      turnIndex = i;
      break;
    }
  }

  if (turnIndex === -1) {
    return state;
  }

  const nextTurns = current.turns.slice();
  nextTurns[turnIndex] = {
    ...nextTurns[turnIndex],
    error,
  };

  const runtime: SessionRuntime = {
    ...current,
    ...buildRuntime(
      nextTurns,
      current.isStreaming,
      revertMessageId,
      current.usageExceeded,
      current,
    ),
  };

  return commitRuntime(state, sessionId, runtime);
}

function handleMessageUpdated(
  state: ChatStore,
  sessionId: string,
  current: SessionRuntime,
  event: Extract<AeroEvent, { type: 'message.updated' }>,
  pendingPartUpdates: Map<string, AeroPart[]>,
  revertMessageId?: string,
) {
  const pendingKey = `${sessionId}:${event.message.id}`;
  const pendingParts = pendingPartUpdates.get(pendingKey);

  if (pendingParts?.length) {
    pendingPartUpdates.delete(pendingKey);
  }

  const runtime = buildUpdatedMessageRuntime(
    current,
    event.message,
    pendingParts,
    revertMessageId,
  );

  return commitRuntime(state, sessionId, runtime);
}

function handleMessagePartUpdated(
  state: ChatStore,
  sessionId: string,
  current: SessionRuntime,
  event: Extract<AeroEvent, { type: 'message.part.updated' }>,
  pendingDeltas: Map<string, PendingDelta[]>,
  pendingPartUpdates: Map<string, AeroPart[]>,
  revertMessageId?: string,
) {
  const key = `${sessionId}:${event.part.id}`;
  const pending = pendingDeltas.get(key) ?? [];
  pendingDeltas.delete(key);

  let part = event.part;

  if (
    (part.type === 'text' || part.type === 'reasoning') &&
    pending.length > 0
  ) {
    const textDelta = pending
      .filter((delta) => delta.field === 'text')
      .map((delta) => delta.delta)
      .join('');

    if (textDelta) {
      part = {
        ...part,
        text: part.text + textDelta,
      };
    }
  }

  // ── Capture / retire question payload straight off the tool part ───────
  // Use `event.part` (full AeroPart union), NOT the `part` local above —
  // that local was reassigned inside the delta-merge branch and TS keeps
  // it narrowed to the text/reasoning variant from then on.
  let workingRuntime = current;

  const sourcePart = event.part;
  if (sourcePart.type === 'tool' && sourcePart.toolName === 'question') {
    if (sourcePart.status === 'running') {
      const req = extractQuestionRequest(sourcePart, sessionId);
      if (req) {
        workingRuntime = {
          ...workingRuntime,
          questions: upsertQuestion(workingRuntime.questions, req),
        };
      }
    } else {
      workingRuntime = removeQuestionFromRuntime(
        workingRuntime,
        sourcePart.callID,
      );
    }
  }
  // ───────────────────────────────────────────────────────────────────────

  if (part.type === 'tool' && part.toolName === 'task') {
    queryClient.invalidateQueries({
      queryKey: sessionKeys.children(undefined, sessionId),
    });
  }

  const previousTurn = current.turns.at(-2);
  const lastTurn = current.turns.at(-1);

  const isPreviousUserToolMessage =
    previousTurn?.role === 'user' &&
    lastTurn?.role === 'assistant' &&
    previousTurn.parts?.some(
      (part) => part.type === 'text' && part.text === SHELL_TEMPLATE_TEXT,
    ) &&
    event.part.type === 'tool' &&
    event.part.status === 'completed';

  if (isPreviousUserToolMessage) {
    useKeepMountedStoreFeed
      .getState()
      .setKeep(`${event.messageId}-part-0`, true);

    setTimeout(() => {
      scrollToBottom(event, sessionId);
      if (useChatStore.getState().scrollBySession[event.sessionId].isAtBottom) {
        if (state.activeSessionId === sessionId) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              useMainChatScrollStore.getState().scrollToBottom();
            });
          });
        } else {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              useSideChatScrollStore.getState().scrollToBottom();
            });
          });
        }
      }
    }, 300);
  }

  if (
    lastTurn?.role === 'user' &&
    part.messageID === lastTurn.id &&
    part.type === 'text'
  ) {
    if (state.activeSessionId === sessionId) {
      queryClient.invalidateQueries({
        queryKey: sessionKeys.toc(undefined, sessionId),
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          useMainChatScrollStore.getState().scrollToBottom();
        });
      });
    } else {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          useSideChatScrollStore.getState().scrollToBottom();
        });
      });
    }
  }

  const runtime = updatePartInRuntime(
    workingRuntime,
    event,
    part,
    revertMessageId,
  );

  if (!runtime) {
    const pendingMessageKey = `${sessionId}:${event.messageId}`;
    const pendingMessageParts = pendingPartUpdates.get(pendingMessageKey) ?? [];

    pendingPartUpdates.set(pendingMessageKey, [...pendingMessageParts, part]);

    // Keep the question we stashed even though the turn isn't materialized yet.
    const sessions = {
      ...state.sessions,
      [sessionId]: workingRuntime,
    };

    return {
      ...state,
      sessions,
      activeSession:
        state.activeSessionId === sessionId
          ? workingRuntime
          : state.activeSession,
      awaitingQuestions:
        part.type === 'tool' &&
        part.toolName === 'question' &&
        part.status === 'running'
          ? state.awaitingQuestions.includes(sessionId)
            ? state.awaitingQuestions
            : [...state.awaitingQuestions, sessionId]
          : state.awaitingQuestions,
    };
  }

  return commitRuntime(state, sessionId, runtime);
}

function handleMessagePartDelta(
  state: ChatStore,
  sessionId: string,
  current: SessionRuntime,
  event: Extract<AeroEvent, { type: 'message.part.delta' }>,
  pendingDeltas: Map<string, PendingDelta[]>,
  revertMessageId?: string,
) {
  const runtime = updatePartDeltaInRuntime(current, event, revertMessageId);

  if (!runtime) {
    const key = `${sessionId}:${event.partId}`;
    const pending = pendingDeltas.get(key) ?? [];

    pendingDeltas.set(key, [
      ...pending,
      {
        field: event.field,
        delta: event.delta,
      },
    ]);

    return state;
  }

  return commitRuntime(state, sessionId, runtime);
}

function handleMessagePartRemoved(
  state: ChatStore,
  sessionId: string,
  current: SessionRuntime,
  event: Extract<AeroEvent, { type: 'message.part.removed' }>,
  pendingDeltas: Map<string, PendingDelta[]>,
  revertMessageId?: string,
) {
  pendingDeltas.delete(`${sessionId}:${event.partId}`);

  const turnIndex = findTurnIndexByMessageId(current, event.messageId);
  if (turnIndex === -1) {
    return state;
  }

  const nextTurns = current.turns.slice();
  const turn = nextTurns[turnIndex];
  nextTurns[turnIndex] = {
    ...turn,
    parts: turn.parts.filter((part) => part.id !== event.partId),
  };

  const runtime: SessionRuntime = {
    ...current,
    ...buildRuntime(
      nextTurns,
      current.isStreaming,
      revertMessageId,
      current.usageExceeded,
      current,
    ),
  };

  return commitRuntime(state, sessionId, runtime);
}

function handleMessageRemoved(
  state: ChatStore,
  sessionId: string,
  current: SessionRuntime,
  event: Extract<AeroEvent, { type: 'message.removed' }>,
  pendingPartUpdates: Map<string, AeroPart[]>,
  revertMessageId?: string,
) {
  const turnIndex = findTurnIndexByMessageId(current, event.messageId);
  pendingPartUpdates.delete(`${sessionId}:${event.messageId}`);

  if (turnIndex === -1) {
    return state;
  }

  const turn = current.turns[turnIndex];
  const removedMessagePartIds = new Set(
    turn.parts
      .filter((part) => part.messageID === event.messageId)
      .map((part) => part.id),
  );

  const nextParts = turn.parts.filter(
    (part) => part.messageID !== event.messageId,
  );

  const nextTurns = current.turns.slice();
  if (nextParts.length > 0) {
    nextTurns[turnIndex] = {
      ...turn,
      parts: nextParts,
    };
  } else {
    nextTurns.splice(turnIndex, 1);
  }

  const messageTurnIds = { ...current.messageTurnIds };
  delete messageTurnIds[event.messageId];

  for (const partId of removedMessagePartIds) {
    delete messageTurnIds[partId];
  }

  const runtime: SessionRuntime = {
    ...current,
    ...buildRuntime(
      nextTurns,
      current.isStreaming,
      revertMessageId,
      current.usageExceeded,
      current,
    ),
    messageTurnIds,
  };

  return commitRuntime(state, sessionId, runtime);
}

function handleSessionIdle(
  state: ChatStore,
  sessionId: string,
  current: SessionRuntime,
  revertMessageId?: string,
) {
  queryClient.invalidateQueries({
    queryKey: sessionKeys.context(undefined, sessionId),
  });

  const lastTurn = current.turns.at(-1);
  const unreadStatus: 'success' | 'error' = lastTurn?.error?.data?.message
    ? 'error'
    : 'success';

  const activeId = useActiveSessionStore.getState().activeId;
  const shouldMarkUnread = activeId !== sessionId;

  const runtime: SessionRuntime = {
    ...current,
    status: IDLE,
    streamStartedAt: null,
    hasLiveStatus: true,
    usageExceeded: undefined,
    questions: [],
    ...buildRuntime(current.turns, false, revertMessageId, undefined, current),
    isStreaming: false,
  };

  const committed = commitRuntime(state, sessionId, runtime);

  const unreadSessions = shouldMarkUnread
    ? [
        ...state.unreadSessions.filter((item) => item.sessionId !== sessionId),
        { sessionId, status: unreadStatus },
      ]
    : state.unreadSessions;

  return {
    ...committed,
    unreadSessions,
    awaitingQuestions: state.awaitingQuestions.filter((id) => id !== sessionId),
    runningSessions: state.runningSessions.filter((id) => id !== sessionId),
  };
}

type PersistedChatState = {
  runningSessions: string[];
  awaitingQuestions: string[];
  unreadSessions: Array<{
    sessionId: string;
    status: 'success' | 'error';
  }>;
};

const PERSIST_DELAY = 250;
const persistedTimers = new Map<string, ReturnType<typeof setTimeout>>();
const persistedValues = new Map<string, string>();

const debouncedStateStorage = {
  getItem(name: string) {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(name);
  },

  setItem(name: string, value: string) {
    if (typeof window === 'undefined') return;

    persistedValues.set(name, value);

    const existingTimer = persistedTimers.get(name);
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      persistedTimers.delete(name);

      const latest = persistedValues.get(name);
      if (latest === undefined) return;

      persistedValues.delete(name);
      window.localStorage.setItem(name, latest);
    }, PERSIST_DELAY);

    persistedTimers.set(name, timer);
  },

  removeItem(name: string) {
    if (typeof window === 'undefined') return;

    const existingTimer = persistedTimers.get(name);
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
      persistedTimers.delete(name);
    }

    persistedValues.delete(name);
    window.localStorage.removeItem(name);
  },
};

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => {
      const pendingDeltas = new Map<string, PendingDelta[]>();
      const pendingPartUpdates = new Map<string, AeroPart[]>();

      return {
        activeSessionId: undefined,
        activeSideChatSessionId: undefined,
        activeSession: createEmptyRuntime(),
        sessions: {},

        scrollBySession: {},

        patchScroll: (sessionId, patch) => {
          set((state) => {
            const current = state.scrollBySession[sessionId] ?? EMPTY_SCROLL;

            let changed = false;

            for (const key of Object.keys(patch) as Array<
              keyof SessionScrollState
            >) {
              if (current[key] !== patch[key]) {
                changed = true;
                break;
              }
            }

            if (!changed) return state;

            return {
              scrollBySession: {
                ...state.scrollBySession,
                [sessionId]: { ...current, ...patch },
              },
            };
          });
        },

        resetScroll: (sessionId) => {
          set((state) => {
            if (state.scrollBySession[sessionId] === undefined) {
              return state;
            }

            const next = { ...state.scrollBySession };
            delete next[sessionId];

            return { scrollBySession: next };
          });
        },

        runningSessions: [],
        awaitingQuestions: [],
        unreadSessions: [],

        setActiveSession: (sessionId, revertMessageId) => {
          set((state) => {
            const runtime = getRuntime(state.sessions, sessionId);
            const nextRuntime: SessionRuntime = {
              ...runtime,
              ...buildRuntime(
                runtime.turns,
                runtime.isStreaming,
                revertMessageId,
                runtime.usageExceeded,
                runtime,
              ),
            };

            const sessions = {
              ...state.sessions,
              [sessionId]: nextRuntime,
            };

            return {
              activeSessionId: sessionId,
              activeSession: nextRuntime,
              sessions,
            };
          });
        },

        setConversationData: (sessionId, turns, revertMessageId) => {
          set((state) => {
            const current = getRuntime(state.sessions, sessionId);
            if (current.hasHydrated) return state;

            const isStreaming = current.status.type !== 'idle';

            const runtime: SessionRuntime = {
              ...current,
              ...buildRuntime(
                turns,
                isStreaming,
                revertMessageId,
                current.usageExceeded,
                current,
              ),
              status: current.status,
              isStreaming,
              streamStartedAt: getStreamStartTime(
                turns,
                current.status,
                current.streamStartedAt,
              ),
              hasHydrated: true,
              messageTurnIds: buildMessageTurnIds(turns),
            };

            return commitRuntime(state, sessionId, runtime);
          });
        },

        setStatus: (sessionId, status, source = 'stream') => {
          set((state) => {
            const current = getRuntime(state.sessions, sessionId);

            if (source === 'query' && current.hasLiveStatus) {
              return state;
            }

            return handleSessionStatus(
              state,
              sessionId,
              current,
              status,
              source,
            );
          });
        },

        addRunningSession: (sessionId) => {
          set((state) => {
            if (state.runningSessions.includes(sessionId)) return state;
            return {
              runningSessions: [...state.runningSessions, sessionId],
            };
          });
        },

        removeRunningSession: (sessionId) => {
          set((state) => {
            const runningSessions = state.runningSessions.filter(
              (id) => id !== sessionId,
            );

            if (runningSessions.length === state.runningSessions.length) {
              return state;
            }

            return { runningSessions };
          });
        },

        addAwaitingQuestion: (sessionId) => {
          set((state) => {
            if (state.awaitingQuestions.includes(sessionId)) return state;
            return {
              awaitingQuestions: [...state.awaitingQuestions, sessionId],
            };
          });
        },

        removeAwaitingQuestion: (sessionId) => {
          set((state) => {
            const awaitingQuestions = state.awaitingQuestions.filter(
              (id) => id !== sessionId,
            );

            if (awaitingQuestions.length === state.awaitingQuestions.length) {
              return state;
            }

            return { awaitingQuestions };
          });
        },

        addPermission: (permission) => {
          set((state) => {
            const current = getRuntime(state.sessions, permission.sessionId);
            const runtime: SessionRuntime = {
              ...current,
              permissions: upsertPermission(current.permissions, permission),
            };

            return commitRuntime(state, permission.sessionId, runtime);
          });
        },

        removePermission: (sessionId, requestId) => {
          set((state) => {
            const current = getRuntime(state.sessions, sessionId);
            const runtime = removePermissionFromRuntime(current, requestId);

            if (runtime === current) return state;
            return commitRuntime(state, sessionId, runtime);
          });
        },

        removeQuestion: (sessionId, requestId) => {
          set((state) => {
            const current = getRuntime(state.sessions, sessionId);
            const runtime = removeQuestionFromRuntime(current, requestId);

            if (runtime === current) return state;
            return commitRuntime(state, sessionId, runtime);
          });
        },

        addUnreadSession: (sessionId, status) => {
          set((state) => ({
            unreadSessions: [
              ...state.unreadSessions.filter(
                (item) => item.sessionId !== sessionId,
              ),
              { sessionId, status },
            ],
          }));
        },

        removeUnreadSession: (sessionId) => {
          set((state) => {
            const unreadSessions = state.unreadSessions.filter(
              (item) => item.sessionId !== sessionId,
            );

            if (unreadSessions.length === state.unreadSessions.length) {
              return state;
            }

            return { unreadSessions };
          });
        },

        handleStreamEvent: (sessionId, event, revertMessageId) => {
          switch (event.type) {
            case 'session.updated': {
              handleSessionUpdated(event.session);
              return;
            }

            case 'session.status':
              set((state) => {
                const current = getRuntime(state.sessions, sessionId);
                return handleSessionStatus(
                  state,
                  sessionId,
                  current,
                  event.status,
                  'stream',
                  revertMessageId,
                );
              });
              return;

            case 'session.error': {
              if (!event.error) return;

              set((state) => {
                const current = getRuntime(state.sessions, sessionId);
                return handleSessionError(
                  state,
                  sessionId,
                  current,
                  event.error,
                  revertMessageId,
                );
              });

              scrollToBottom(event, sessionId);

              return;
            }

            case 'todo.updated': {
              queryClient.invalidateQueries({
                queryKey: sessionKeys.todos(undefined, event.sessionId),
              });
              return;
            }

            case 'permission.replied': {
              set((state) => {
                const current = getRuntime(state.sessions, event.sessionId);
                const runtime = removePermissionFromRuntime(
                  current,
                  event.requestId,
                );

                return commitRuntime(state, event.sessionId, runtime);
              });
              return;
            }

            case 'permission.asked': {
              set((state) => {
                const current = getRuntime(state.sessions, event.sessionId);
                const runtime: SessionRuntime = {
                  ...current,
                  permissions: upsertPermission(
                    current.permissions,
                    event.request,
                  ),
                };

                return commitRuntime(state, event.sessionId, runtime);
              });

              scrollToBottom(event, sessionId);

              return;
            }

            case 'message.updated':
              set((state) => {
                const current = getRuntime(state.sessions, sessionId);
                return handleMessageUpdated(
                  state,
                  sessionId,
                  current,
                  event,
                  pendingPartUpdates,
                  revertMessageId,
                );
              });
              return;

            case 'message.part.updated':
              if (
                event.part.type === 'step-start' ||
                event.part.type == 'step-finish'
              )
                return;
              set((state) => {
                const current = getRuntime(state.sessions, sessionId);
                return handleMessagePartUpdated(
                  state,
                  sessionId,
                  current,
                  event,
                  pendingDeltas,
                  pendingPartUpdates,
                  revertMessageId,
                );
              });

              if (
                event.part.type === 'tool' &&
                event.part.toolName === 'question'
              ) {
                scrollToBottom(event, sessionId);
              }
              return;

            case 'message.part.delta':
              set((state) => {
                const current = getRuntime(state.sessions, sessionId);
                return handleMessagePartDelta(
                  state,
                  sessionId,
                  current,
                  event,
                  pendingDeltas,
                  revertMessageId,
                );
              });
              return;

            case 'message.part.removed':
              set((state) => {
                const current = getRuntime(state.sessions, sessionId);
                return handleMessagePartRemoved(
                  state,
                  sessionId,
                  current,
                  event,
                  pendingDeltas,
                  revertMessageId,
                );
              });
              return;

            case 'message.removed':
              set((state) => {
                const current = getRuntime(state.sessions, sessionId);
                return handleMessageRemoved(
                  state,
                  sessionId,
                  current,
                  event,
                  pendingPartUpdates,
                  revertMessageId,
                );
              });
              return;

            case 'session.idle':
              set((state) => {
                const current = getRuntime(state.sessions, sessionId);
                return handleSessionIdle(
                  state,
                  sessionId,
                  current,
                  revertMessageId,
                );
              });
              return;

            default:
              return;
          }
        },

        resetSession: (sessionId) => {
          pendingDeltas.forEach((_value, key) => {
            if (key.startsWith(`${sessionId}:`)) {
              pendingDeltas.delete(key);
            }
          });

          pendingPartUpdates.forEach((_value, key) => {
            if (key.startsWith(`${sessionId}:`)) {
              pendingPartUpdates.delete(key);
            }
          });

          set((state) => {
            const sessions = {
              ...state.sessions,
              [sessionId]: createEmptyRuntime(),
            };

            const scrollBySession = { ...state.scrollBySession };
            delete scrollBySession[sessionId];

            return {
              sessions,
              scrollBySession,
              activeSession:
                state.activeSessionId === sessionId
                  ? sessions[sessionId]
                  : state.activeSession,
              awaitingQuestions: state.awaitingQuestions.filter(
                (id) => id !== sessionId,
              ),
              runningSessions: state.runningSessions.filter(
                (id) => id !== sessionId,
              ),
            };
          });
        },
      };
    },
    {
      name: 'aero-chat-store',
      storage: createJSONStorage<PersistedChatState>(
        () => debouncedStateStorage,
      ),
      partialize: (state) => ({
        runningSessions: state.runningSessions,
        awaitingQuestions: state.awaitingQuestions,
        unreadSessions: state.unreadSessions,
      }),
    },
  ),
);

export function useSessionRuntime<T>(
  sessionId: string | undefined,
  selector: (session: SessionRuntime) => T,
): T {
  return useChatStore((state) => {
    if (!sessionId) return selector(createEmptyRuntime());

    const session = state.sessions[sessionId];

    if (!session) return selector(createEmptyRuntime());

    return selector(session);
  });
}

export function useSessionScroll<T>(
  sessionId: string | undefined,
  selector: (scroll: SessionScrollState) => T,
): T {
  return useChatStore((state) =>
    selector(
      sessionId
        ? (state.scrollBySession[sessionId] ?? EMPTY_SCROLL)
        : EMPTY_SCROLL,
    ),
  );
}
