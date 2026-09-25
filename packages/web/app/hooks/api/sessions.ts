// app/hooks/sessions.ts
//
// All queries/mutations are scoped by harness in the query key, since a
// harness is locked per-session server-side. Pass harness=undefined to operate
// against the default harness.

import {
  keepPreviousData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { InferRequestType, InferResponseType } from 'hono/client';
import { useCallback } from 'react';
import { useRecentsSidebarStore } from '@/app/components/chat-sidebar/sidebar-store';
import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';
import { apiError } from '@/app/hooks/i18n/api-errors';
import {
  staleProps,
  useOptimisticMutation,
} from '@/app/hooks/useOptimisticMutation';
import { honoClient, PAGINATION_LIMIT } from '@/app/lib';
import { restoreAllMessages } from '@/app/lib/commands/restore-all-messages';
import { revertSession } from '@/app/lib/commands/revert-session';
import { queryClient } from '@/app/providers';
import { useSessionId } from '@/app/providers/SessionIdProvider';
import {
  AeroPermissionReply,
  AeroQuestionAnswer,
  AeroSessionSummary,
  ConversationRole,
  HarnessId,
} from '@/server/services/harness/types';
import {
  AeroSessionMetadata,
  SessionMetadata,
} from '@/server/types/opencode-sdk';

export const $sessions = honoClient.api.sessions;
export const $individualSession = honoClient.api.sessions[':id'];

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const harnessKey = (harnessId?: string) => harnessId ?? 'default';

export const sessionKeys = {
  merged: () => ['sessions', 'default'] as const,
  subagentSessions: () => ['subagentSessions', 'default'] as const,
  allArchived: (harnessId?: string) =>
    ['sessions', harnessKey(harnessId), 'all-archived'] as const,
  detail: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessKey(harnessId), sessionId, 'detail'] as const,
  status: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessKey(harnessId), sessionId, 'status'] as const,
  messages: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessKey(harnessId), sessionId, 'messages'] as const,
  toc: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessKey(harnessId), sessionId, 'toc'] as const,
  context: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessKey(harnessId), sessionId, 'context'] as const,
  todos: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessKey(harnessId), sessionId, 'todos'] as const,
  questions: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessKey(harnessId), sessionId, 'questions'] as const,
  permissions: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessKey(harnessId), sessionId, 'permissions'] as const,
  children: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessKey(harnessId), sessionId, 'children'] as const,
  pinned: (sessionId: string) => ['sessions', sessionId, 'pinned'] as const,
  metadata: (harnessId: string | undefined, sessionId: string, key: string) =>
    ['sessions', harnessKey(harnessId), sessionId, 'metadata', key] as const,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CreateSessionInput = InferRequestType<typeof $sessions.$post>['json'];
type SendMessageInput = InferRequestType<
  typeof $individualSession.message.$post
>['json'];
type SendShellCommandInput = InferRequestType<
  typeof $individualSession.shell.$post
>['json'];
type SendCommandInput = InferRequestType<
  typeof $individualSession.command.$post
>['json'];

export type SessionsPageResponse = InferResponseType<
  typeof $sessions.merged.$get,
  200
>;

type SessionDetail = InferResponseType<typeof $individualSession.$get, 200>;

export interface PinnedMessage {
  id: string;
  createdAt: number;
  role: ConversationRole;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const minDelay = (ms = 100) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Await an API call while guaranteeing a minimum elapsed time. */
async function withMinDelay<T>(promise: Promise<T>, ms = 100): Promise<T> {
  const [result] = await Promise.all([promise, minDelay(ms)]);
  return result;
}

function invalidateSessionDetail(
  qc: QueryClient,
  harnessId: string | undefined,
  sessionId: string,
) {
  return qc.invalidateQueries({
    queryKey: sessionKeys.detail(harnessId, sessionId),
  });
}

function invalidateMergedSessions(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: sessionKeys.merged() });
}

function invalidateMergedAndClearSelection(qc: QueryClient) {
  return invalidateMergedSessions(qc).then(() => {
    useRecentsSidebarStore.getState().clearSelectedSessionIds();
  });
}

// ---------------------------------------------------------------------------
// Session list queries
// ---------------------------------------------------------------------------

interface UseSessionsOptions {
  directory?: string;
  search?: string;
  limit?: number;
  initialSessions?: AeroSessionSummary[];
  archived?: boolean;
  childSessions?: boolean;
  childSessionsOnly?: boolean;
}

export function useSessions({
  directory,
  search,
  initialSessions,
  limit,
  archived,
  childSessions,
  childSessionsOnly,
}: UseSessionsOptions = {}) {
  return useInfiniteQuery({
    queryKey: [
      ...sessionKeys.merged(),
      search,
      ...(directory ? ['directory', directory] : []),
      childSessions,
      childSessionsOnly,
    ],
    initialPageParam: undefined as string | undefined,
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam }) => {
      const res = await $sessions.merged.$get({
        query: {
          cursor: pageParam,
          limit: limit?.toString() || PAGINATION_LIMIT.toString(),
          search,
          directory,
          archived: archived ? 'true' : 'false',
          childSessions: childSessions ? 'true' : 'false',
          childSessionsOnly: childSessionsOnly ? 'true' : 'false',
        },
      });

      if (!res.ok) throw new Error(apiError('failedToFetchSessions'));
      return res.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    // Hydrate the first page using the initial 5 sessions from the server.
    initialData: initialSessions?.length
      ? {
          pages: [
            {
              items: initialSessions,
              nextCursor: undefined, // Real cursor is fetched on fetchNextPage
            },
          ],
          pageParams: [undefined],
        }
      : undefined,
  });
}

export function useSessionsArchived(harnessId?: string) {
  return useQuery({
    queryKey: sessionKeys.allArchived(harnessId),
    queryFn: async () => {
      const res = await $sessions.archived.$get({ query: { harnessId } });
      if (!res.ok) throw new Error(apiError('failedToFetchArchivedSessions'));
      return res.json();
    },
  });
}

// ---------------------------------------------------------------------------
// Session detail queries (read-only)
// ---------------------------------------------------------------------------

export function useSessionTodos(
  harnessId: string | undefined,
  sessionId: string,
) {
  return useQuery({
    queryKey: sessionKeys.todos(harnessId, sessionId),
    queryFn: async () => {
      const res = await $individualSession.todos.$get({
        param: { id: sessionId },
        query: { harnessId },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!sessionId,
    placeholderData: keepPreviousData,
  });
}

export function useSessionStatus(
  harnessId: string | undefined,
  sessionId: string,
) {
  return useQuery({
    queryKey: sessionKeys.status(harnessId, sessionId),
    queryFn: async () => {
      const res = await $individualSession.status.$get({
        param: { id: sessionId },
        query: { harnessId },
      });
      if (!res.ok) throw new Error(apiError('failedToLoadSessionStatus'));
      return res.json();
    },
    enabled: !!sessionId,
  });
}

export function useSession(harnessId: string | undefined, sessionId: string) {
  return useQuery({
    queryKey: sessionKeys.detail(harnessId, sessionId),
    queryFn: async () => {
      const res = await $individualSession.$get({
        param: { id: sessionId },
        query: { harnessId },
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!sessionId,
    placeholderData: keepPreviousData,
  });
}

export function useSessionDirectory() {
  const isWorkMode = useNewSessionStore((state) => state.state === 'work');
  const selectedDirectory = useNewSessionStore(
    (state) => state.selectedWorkspace?.directory,
  );
  const sessionId = useSessionId();
  const { data: session } = useSession(undefined, sessionId);

  if (!isWorkMode && !sessionId) return undefined;
  if (!sessionId) return selectedDirectory;
  return session?.workspace;
}

export function useSessionMessages(
  harnessId: string | undefined,
  sessionId: string,
) {
  return useQuery({
    queryKey: sessionKeys.messages(harnessId, sessionId),
    queryFn: async () => {
      const res = await $individualSession.messages.$get({
        param: { id: sessionId },
        query: { harnessId },
      });
      if (!res.ok) throw new Error(apiError('failedToFetchMessages'));
      return res.json();
    },
    enabled: !!sessionId,
    ...staleProps,
  });
}

export function useSessionPermissions(
  harnessId: string | undefined,
  sessionId: string,
) {
  return useQuery({
    queryKey: sessionKeys.permissions(harnessId, sessionId),
    queryFn: async () => {
      const res = await $individualSession.permissions.$get({
        param: { id: sessionId },
        query: { harnessId },
      });
      if (!res.ok) throw new Error(apiError('failedToFetchPermissionRequests'));
      return res.json();
    },
    enabled: !!sessionId,
  });
}

export function useSessionQuestions(
  harnessId: string | undefined,
  sessionId: string,
) {
  return useQuery({
    queryKey: sessionKeys.questions(harnessId, sessionId),
    queryFn: async () => {
      const res = await $individualSession.questions.$get({
        param: { id: sessionId },
        query: { harnessId },
      });
      if (!res.ok) throw new Error(apiError('failedToFetchQuestions'));
      return res.json();
    },
    enabled: !!sessionId,
  });
}

export function useSessionContext(
  harnessId: string | undefined,
  sessionId: string,
) {
  return useQuery({
    queryKey: sessionKeys.context(harnessId, sessionId),
    queryFn: async () => {
      const res = await $individualSession.context.$get({
        param: { id: sessionId },
        query: { harnessId },
      });
      if (!res.ok) throw new Error(apiError('failedToFetchSessionContext'));
      return res.json();
    },
    placeholderData: keepPreviousData,
    enabled: !!sessionId,
  });
}

export function useSessionToc(
  harnessId: string | undefined,
  sessionId: string,
) {
  return useQuery({
    queryKey: sessionKeys.toc(harnessId, sessionId),
    queryFn: async () => {
      const res = await $individualSession.toc.$get({
        param: { id: sessionId },
        query: { harnessId },
      });
      if (!res.ok) throw new Error(apiError('failedToFetchSessionToc'));
      return res.json();
    },
    enabled: !!sessionId,
  });
}

export function useSessionChildren(
  harnessId: string | undefined,
  sessionId: string,
) {
  return useQuery({
    queryKey: sessionKeys.children(harnessId, sessionId),
    queryFn: async () => {
      const res = await $individualSession.children.$get({
        param: { id: sessionId },
        query: { harnessId },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!sessionId,
    placeholderData: keepPreviousData,
  });
}

// ---------------------------------------------------------------------------
// Session mutations
// ---------------------------------------------------------------------------

export function useCreateSession(defaultharnessId?: HarnessId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSessionInput) => {
      const targetharnessId = input.harnessId || defaultharnessId;
      const res = await withMinDelay(
        $sessions.$post({
          json: { ...input, harnessId: targetharnessId },
          query: { harnessId: targetharnessId },
        }),
      );
      if (!res.ok) throw new Error(apiError('failedToCreateSession'));
      return res.json();
    },
    onSuccess: () => invalidateMergedSessions(qc),
  });
}

export function useDeleteBulkSessions(harnessId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionIds: string[]) => {
      const res = await withMinDelay(
        $sessions.delete.bulk.$delete({
          query: { harnessId, ids: sessionIds.join(',') },
        }),
      );
      if (!res.ok) throw new Error(apiError('failedToDeleteSessions'));
      return res.json();
    },
    onSuccess: () => invalidateMergedAndClearSelection(qc),
  });
}

export function useDeleteSession(harnessId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await withMinDelay(
        $individualSession.$delete({
          param: { id: sessionId },
          query: { harnessId },
        }),
      );
      if (!res.ok) throw new Error(apiError('failedToDeleteSession'));
      return res.json();
    },
    onSuccess: (_data, sessionId) => {
      invalidateMergedSessions(qc);
      qc.removeQueries({ queryKey: sessionKeys.detail(harnessId, sessionId) });
    },
  });
}

export function useShareSession(harnessId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await $individualSession.share.$get({
        param: { id: sessionId },
        query: { harnessId },
      });
      if (!res.ok) throw new Error(apiError('failedToShareSession'));
      return res.json();
    },
    onSuccess: (_data, sessionId) =>
      invalidateSessionDetail(qc, harnessId, sessionId),
  });
}

export function useUnshareSession(harnessId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await $individualSession.unshare.$get({
        param: { id: sessionId },
        query: { harnessId },
      });
      if (!res.ok) throw new Error(apiError('failedToUnshareSession'));
      return res.json();
    },
    onSuccess: (_data, sessionId) =>
      invalidateSessionDetail(qc, harnessId, sessionId),
  });
}

export function useSessionMarkdown(harnessId?: string) {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await $individualSession.markdown.$get({
        param: { id: sessionId },
        query: { harnessId },
      });
      if (!res.ok) throw new Error(apiError('failedToRetrieveMarkdown'));
      return res.json();
    },
  });
}

export function useRestoreAllMessages(
  harnessId: string | undefined,
  sessionId: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      restoreAllMessages({ queryClient: qc, harnessId, sessionId }),
  });
}

export function useRevertSession(
  harnessId: string | undefined,
  sessionId: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      revertSession({ queryClient: qc, harnessId, sessionId, messageId }),
  });
}

export function useForkSession(
  harnessId: string | undefined,
  sessionId: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const res = await $individualSession.fork.$post({
        param: { id: sessionId },
        query: { harnessId },
        json: { messageId },
      });
      if (!res.ok) throw new Error(apiError('failedToForkSession'));
      return res.json();
    },
    onSuccess: () => invalidateMergedSessions(qc),
  });
}

/** Shared `(param, query)` shape for the per-session actions below. */
const sessionAction = (sessionId: string, harnessId: string | undefined) => ({
  param: { id: sessionId },
  query: { harnessId },
});

export function useSendCommand(harnessId: string | undefined) {
  return useMutation({
    mutationFn: async (input: SendCommandInput & { sessionId: string }) => {
      const res = await $individualSession.command.$post({
        ...sessionAction(input.sessionId, harnessId),
        json: input,
      });
      if (!res.ok) throw new Error(apiError('failedToSendCommand'));
      return res.json();
    },
  });
}

export function useSendShellCommand(harnessId: string | undefined) {
  return useMutation({
    mutationFn: async (
      input: SendShellCommandInput & { sessionId: string },
    ) => {
      const res = await $individualSession.shell.$post({
        ...sessionAction(input.sessionId, harnessId),
        json: input,
      });
      if (!res.ok) throw new Error(apiError('failedToSendShellCommand'));
      return res.json();
    },
  });
}

export function useSendMessage(harnessId: string | undefined) {
  return useMutation({
    mutationFn: async (input: SendMessageInput & { sessionId: string }) => {
      const res = await $individualSession.message.$post({
        ...sessionAction(input.sessionId, harnessId),
        json: input,
      });
      if (!res.ok) throw new Error(apiError('failedToSendMessage'));
      return res.json();
    },
  });
}

export function useAbortSession(harnessId: string | undefined) {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await $individualSession.abort.$post(
        sessionAction(sessionId, harnessId),
      );
      if (!res.ok) throw new Error(apiError('failedToAbortSession'));
      return res.json();
    },
  });
}

export function useReplyToPermission(harnessId: string | undefined) {
  return useMutation({
    mutationFn: async (input: {
      sessionId: string;
      requestId: string;
      reply: AeroPermissionReply;
    }) => {
      const res = await $individualSession['reply-to-permission'].$post({
        ...sessionAction(input.sessionId, harnessId),
        json: { requestId: input.requestId, reply: input.reply },
      });
      if (!res.ok)
        throw new Error(apiError('failedToReplyToPermissionRequest'));
      return res.json();
    },
  });
}

export function useReplyToQuestion(harnessId: string | undefined) {
  return useMutation({
    mutationFn: async (input: {
      sessionId: string;
      requestId: string;
      answers: AeroQuestionAnswer;
    }) => {
      const res = await $individualSession['reply-to-question'].$post({
        ...sessionAction(input.sessionId, harnessId),
        json: { requestId: input.requestId, answers: input.answers },
      });
      if (!res.ok) throw new Error(apiError('failedToReplyToQuestion'));
      return res.json();
    },
  });
}

export function useRejectQuestion(harnessId: string | undefined) {
  return useMutation({
    mutationFn: async (input: { sessionId: string; requestId: string }) => {
      const res = await $individualSession['reject-question'].$post({
        ...sessionAction(input.sessionId, harnessId),
        json: { requestId: input.requestId },
      });
      if (!res.ok) throw new Error(apiError('failedToRejectQuestion'));
      return res.json();
    },
  });
}

export function useArchiveSession(harnessId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await withMinDelay(
        $individualSession.archive.$patch(sessionAction(sessionId, harnessId)),
      );
      if (!res.ok) throw new Error(apiError('failedToArchiveSession'));
      return res.json();
    },
    onSuccess: (_data, sessionId) => {
      invalidateSessionDetail(qc, harnessId, sessionId);
      invalidateMergedSessions(qc);
    },
  });
}

export function useArchiveBulkSessions(harnessId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionIds: string[]) => {
      const res = await withMinDelay(
        $sessions.archive.bulk.$patch({
          query: { harnessId, ids: sessionIds.join(',') },
        }),
      );
      if (!res.ok) throw new Error(apiError('failedToArchiveSessions'));
      return res.json();
    },
    onSuccess: () => invalidateMergedAndClearSelection(qc),
  });
}

export function useUnarchiveSession(harnessId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await withMinDelay(
        $individualSession.unarchive.$patch(
          sessionAction(sessionId, harnessId),
        ),
      );
      if (!res.ok) throw new Error(apiError('failedToUnarchiveSession'));
      return res.json();
    },
    onSuccess: (_data, sessionId) => {
      invalidateSessionDetail(qc, harnessId, sessionId);
      invalidateMergedSessions(qc);
    },
  });
}

export function useUnarchiveBulkSessions(harnessId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionIds: string[]) => {
      const res = await withMinDelay(
        $sessions.unarchive.bulk.$patch({
          query: { harnessId, ids: sessionIds.join(',') },
        }),
      );
      if (!res.ok) throw new Error(apiError('failedToUnarchiveSessions'));
      return res.json();
    },
    onSuccess: () => invalidateMergedAndClearSelection(qc),
  });
}

export function useRenameSession(harnessId?: string) {
  return useMutation({
    mutationFn: async (input: { sessionId: string; title: string }) => {
      const res = await $individualSession.rename.$patch({
        ...sessionAction(input.sessionId, harnessId),
        json: { title: input.title },
      });
      if (!res.ok) throw new Error(apiError('failedToRenameSession'));
      return res.json();
    },
  });
}

// ---------------------------------------------------------------------------
// Pinned messages
// ---------------------------------------------------------------------------

export function usePinnedMessages(sessionId: string) {
  return useQuery<PinnedMessage[]>({
    queryKey: sessionKeys.pinned(sessionId),
    enabled: Boolean(sessionId),
    ...staleProps,
    queryFn: async () => {
      const res = await $individualSession.pinned.$get({
        param: { id: sessionId },
        query: { harnessId: undefined },
      });
      if (!res.ok) throw new Error(apiError('failedToFetchPinnedMessages'));
      return await res.json();
    },
  });
}

export function useIsPinned(sessionId: string, messageId: string) {
  const { data } = usePinnedMessages(sessionId);
  return Boolean(data?.some((m) => m.id === messageId));
}

export function useTogglePinnedMessage() {
  return useOptimisticMutation<
    PinnedMessage[],
    { sessionId: string; messageId: string; pinned: boolean }
  >({
    queryKey: ({ sessionId }) => sessionKeys.pinned(sessionId),
    mutationFn: async ({ sessionId, messageId, pinned }) => {
      const res = await $individualSession.pinned.$post({
        param: { id: sessionId },
        query: { harnessId: undefined },
        json: { messageId, pinned },
      });
      if (!res.ok) throw new Error(apiError('failedToUpdatePin'));
      return (await res.json()) as PinnedMessage[];
    },
    optimisticUpdate: (current = [], { messageId, pinned }) =>
      pinned
        ? current.some((m) => m.id === messageId)
          ? current
          : [
              ...current,
              { id: messageId, createdAt: Date.now(), role: 'user' as const },
            ]
        : current.filter((m) => m.id !== messageId),
  });
}

// ---------------------------------------------------------------------------
// Session metadata
// ---------------------------------------------------------------------------

/**
 * Read a single metadata value by key. Supports dot-paths (e.g.
 * `aero.context_obligatory_messages`) since the server walks nested objects.
 * Returns `{ key, value }`; `value` is typed by the caller via the generic.
 */
export function useSessionMetadataValue<T = unknown>(
  harnessId: string | undefined,
  sessionId: string,
  key: string,
) {
  return useQuery<{ key: string; value: T | undefined }>({
    queryKey: sessionKeys.metadata(harnessId, sessionId, key),
    queryFn: async () => {
      const res = await $individualSession.metadata[':key'].$get({
        param: { id: sessionId, key },
        query: { harnessId },
      });
      if (res.status === 404) {
        return { key, value: undefined };
      }
      if (!res.ok) throw new Error(apiError('failedToFetchSessionMetadata'));
      return (await res.json()) as { key: string; value: T };
    },
    enabled: !!sessionId && !!key,
    placeholderData: keepPreviousData,
  });
}

/**
 * Shallow-merge a partial metadata object into the session.
 *
 * Backed by `useOptimisticMutation` keyed on the session detail query, so
 * `useSession` subscribers see the new metadata synchronously and it rolls
 * back on PATCH failure. Per-key `useSessionMetadataValue` subscribers are
 * mirrored inside `optimisticUpdate` so they update in the same commit.
 *
 * Caveat: the per-key mirrors are not rolled back on error (only the detail
 * query is) — stale per-key entries refresh on their next mount/refetch.
 */
export function usePatchSessionMetadata(
  harnessId: string | undefined,
  sessionId: string,
) {
  const detailKey = sessionKeys.detail(harnessId, sessionId);
  const baseMetaKey = [
    'sessions',
    harnessKey(harnessId),
    sessionId,
    'metadata',
  ];

  return useOptimisticMutation<SessionDetail | null, Partial<SessionMetadata>>({
    queryKey: () => detailKey,
    // Disable coalescing: two different-key patches within the debounce
    // window would otherwise collapse into one network call and drop data.
    // Dedicated callers that want batching (e.g. model selection) build
    // their own hook with a tighter queryKey.
    debounceMs: 0,

    mutationFn: async (metadata) => {
      const res = await $individualSession.metadata.$patch({
        param: { id: sessionId },
        query: { harnessId },
        json: { metadata },
      });
      if (!res.ok) throw new Error(apiError('failedToPatchSessionMetadata'));

      // `getQueryData` is typed `TData | undefined`, but the mutation generic
      // is `SessionDetail | null` — collapse both to `null`.
      const current = queryClient.getQueryData<SessionDetail | null>(detailKey);
      if (!current) return null;

      return {
        ...current,
        metadata: {
          ...((current.metadata ?? {}) as SessionMetadata),
          ...metadata,
        },
      };
    },

    optimisticUpdate: (current, metadata) => {
      // Mirror into per-key metadata queries so `useSessionMetadataValue`
      // subscribers see the new value in the same commit as the detail query.
      for (const [k, v] of Object.entries(metadata)) {
        queryClient.setQueryData([...baseMetaKey, k], { key: k, value: v });
      }

      if (!current) return current;
      return {
        ...current,
        metadata: {
          ...((current.metadata ?? {}) as SessionMetadata),
          ...metadata,
        },
      };
    },
  });
}

/**
 * Patch fields inside `metadata.aero` without clobbering the sibling aero
 * fields. Reads the current aero from the cached session detail, merges in
 * the partial, and PATCHes the merged result.
 */
export function usePatchAeroMetadata(
  harnessId: string | undefined,
  sessionId: string,
) {
  const detailKey = sessionKeys.detail(harnessId, sessionId);
  const { mutate } = usePatchSessionMetadata(harnessId, sessionId);

  return useCallback(
    (partial: Partial<AeroSessionMetadata>) => {
      const current = queryClient.getQueryData<SessionDetail | null>(detailKey);
      const currentAero =
        ((current?.metadata ?? {}) as SessionMetadata).aero ?? {};
      mutate({ aero: { ...currentAero, ...partial } });
    },
    [detailKey, mutate],
  );
}

/** Metadata key (dotted path) that stores the selected model. */
export const SELECTED_MODEL_METADATA_KEY = 'aero.selected_model';

export function useSelectModelMutation(
  harnessId: string | undefined,
  sessionId: string,
) {
  return useOptimisticMutation<
    { key: string; value: string | undefined },
    { selectedModelKey: string }
  >({
    queryKey: () =>
      sessionKeys.metadata(harnessId, sessionId, SELECTED_MODEL_METADATA_KEY),

    mutationFn: async ({ selectedModelKey }) => {
      const detail = queryClient.getQueryData<SessionDetail | null>(
        sessionKeys.detail(harnessId, sessionId),
      );
      const currentAero =
        ((detail?.metadata ?? {}) as SessionMetadata).aero ?? {};

      const res = await $individualSession.metadata.$patch({
        param: { id: sessionId },
        query: { harnessId },
        json: {
          metadata: {
            aero: { ...currentAero, selected_model: selectedModelKey },
          },
        },
      });
      if (!res.ok) throw new Error(apiError('failedToUpdateSelectedModel'));

      return { key: SELECTED_MODEL_METADATA_KEY, value: selectedModelKey };
    },

    optimisticUpdate: (_current, { selectedModelKey }) => ({
      key: SELECTED_MODEL_METADATA_KEY,
      value: selectedModelKey,
    }),
  });
}
