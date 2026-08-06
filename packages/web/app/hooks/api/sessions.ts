// app/hooks/sessions.ts
//
// All queries/mutations are scoped by workspaceId in the query key, since a
// harness is resolved per-workspace server-side (see server/services/harness/registry.ts).
// Pass workspaceId=undefined to operate against the default harness while
// workspace-switching isn't built in the UI yet.

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { InferRequestType } from 'hono/client';

import { honoClient, PAGINATION_LIMIT } from '@/app/lib';
import { AeroSessionSummary } from '@/server/services/harness/types';

const $sessions = honoClient.api.sessions;
const $session = honoClient.api.sessions[':id'];
const $messages = honoClient.api.sessions[':id'].messages;
const $message = honoClient.api.sessions[':id'].message;
const $abort = honoClient.api.sessions[':id'].abort;
const $toc = honoClient.api.sessions[':id'].toc;

export const sessionKeys = {
  all: (workspaceId?: string) =>
    ['sessions', workspaceId ?? 'default'] as const,
  detail: (workspaceId: string | undefined, sessionId: string) =>
    ['sessions', workspaceId ?? 'default', sessionId] as const,
  messages: (workspaceId: string | undefined, sessionId: string) =>
    ['sessions', workspaceId ?? 'default', sessionId, 'messages'] as const,
  toc: (workspaceId: string | undefined, sessionId: string) =>
    ['sessions', workspaceId ?? 'default', sessionId, 'toc'] as const,
};

// type SessionListResponse = InferResponseType<typeof $sessions.$get>;
type CreateSessionInput = InferRequestType<typeof $sessions.$post>['json'];
type SendMessageInput = InferRequestType<typeof $message.$post>['json'];

export function useSessions(
  workspaceId?: string,
  search?: string,
  searchBy?: keyof AeroSessionSummary,
) {
  return useInfiniteQuery({
    // Include search & searchBy in key so queries auto-refetch when search state changes
    queryKey: [...sessionKeys.all(workspaceId), search, searchBy],

    initialPageParam: undefined as string | undefined,

    placeholderData: keepPreviousData,

    queryFn: async ({ pageParam }) => {
      const res = await $sessions.$get({
        query: {
          workspaceId,
          cursor: pageParam,
          limit: PAGINATION_LIMIT.toString(),
          search: search || undefined,
          searchBy: search ? searchBy : undefined,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch sessions');
      }

      return res.json();
    },

    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useSession(workspaceId: string | undefined, sessionId: string) {
  return useQuery({
    queryKey: sessionKeys.detail(workspaceId, sessionId),
    queryFn: async () => {
      const res = await $session.$get({
        param: { id: sessionId },
        query: { workspaceId },
      });
      if (!res.ok) throw new Error('Failed to fetch session');
      return res.json();
    },
    enabled: !!sessionId,
    placeholderData: keepPreviousData,
  });
}

export function useCreateSession(workspaceId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSessionInput) => {
      const res = await $sessions.$post({
        json: input,
        query: { workspaceId },
      });
      if (!res.ok) throw new Error('Failed to create session');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all(workspaceId) });
    },
  });
}

export function useDeleteSession(workspaceId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await $session.$delete({
        param: { id: sessionId },
        query: { workspaceId },
      });
      if (!res.ok) throw new Error('Failed to delete session');
      return res.json();
    },
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all(workspaceId) });
      queryClient.removeQueries({
        queryKey: sessionKeys.detail(workspaceId, sessionId),
      });
    },
  });
}

export function useSessionMessages(
  workspaceId: string | undefined,
  sessionId: string,
) {
  return useQuery({
    queryKey: sessionKeys.messages(workspaceId, sessionId),
    queryFn: async () => {
      const res = await $messages.$get({
        param: { id: sessionId },
        query: { workspaceId },
      });
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    enabled: !!sessionId,
  });
}

export type TocItem = NonNullable<
  ReturnType<typeof useSessionToc>['data']
>[number];

export function useSessionToc(
  workspaceId: string | undefined,
  sessionId: string,
) {
  return useQuery({
    queryKey: sessionKeys.toc(workspaceId, sessionId),
    queryFn: async () => {
      const res = await $toc.$get({
        param: { id: sessionId },
        query: { workspaceId },
      });
      if (!res.ok) throw new Error('Failed to fetch session TOC');
      return res.json();
    },
    enabled: !!sessionId,
  });
}

export function useSendMessage(
  workspaceId: string | undefined,
  sessionId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SendMessageInput) => {
      const res = await $message.$post({
        param: { id: sessionId },
        query: { workspaceId },
        json: input,
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onSuccess: () => {
      // Note: session.prompt() waits for the full assistant reply before
      // resolving, so this invalidation lands after the whole turn — not
      // per-token. Live streaming updates go through the SSE route
      // (/api/sessions/:id/stream) separately; ask if you want a hook that
      // wires that into the query cache incrementally instead.
      queryClient.invalidateQueries({
        queryKey: sessionKeys.messages(workspaceId, sessionId),
      });
    },
  });
}

export function useAbortSession(workspaceId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await $abort.$post({
        param: { id: sessionId },
        query: { workspaceId },
      });
      if (!res.ok) throw new Error('Failed to abort session');
      return res.json();
    },
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(workspaceId, sessionId),
      });
    },
  });
}
