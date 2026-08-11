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

const $sessions = honoClient.api.sessions;
const $archivedSessions = honoClient.api.sessions.archived;
const $session = honoClient.api.sessions[':id'];
const $messages = honoClient.api.sessions[':id'].messages;
const $message = honoClient.api.sessions[':id'].message;
const $markdown = honoClient.api.sessions[':id'].markdown;
const $abort = honoClient.api.sessions[':id'].abort;
const $toc = honoClient.api.sessions[':id'].toc;
const $archive = honoClient.api.sessions[':id'].archive;
const $unarchive = honoClient.api.sessions[':id'].unarchive;
const $rename = honoClient.api.sessions[':id'].rename;

export const sessionKeys = {
  all: (workspaceId?: string) =>
    ['sessions', workspaceId ?? 'default'] as const,
  allArchived: (workspaceId?: string) =>
    ['sessions', workspaceId ?? 'default', 'all-archived'] as const,
  detail: (workspaceId: string | undefined, sessionId: string) =>
    ['sessions', workspaceId ?? 'default', sessionId, 'detail'] as const,
  messages: (workspaceId: string | undefined, sessionId: string) =>
    ['sessions', workspaceId ?? 'default', sessionId, 'messages'] as const,
  toc: (workspaceId: string | undefined, sessionId: string) =>
    ['sessions', workspaceId ?? 'default', sessionId, 'toc'] as const,
  markdown: (workspaceId: string | undefined, sessionId: string) =>
    ['sessions', workspaceId ?? 'default', sessionId, 'markdown'] as const,
  archive: (workspaceId: string | undefined, sessionId: string) =>
    ['sessions', workspaceId ?? 'default', sessionId, 'archive'] as const,
  unarchive: (workspaceId: string | undefined, sessionId: string) =>
    ['sessions', workspaceId ?? 'default', sessionId, 'unarchive'] as const,
  rename: (workspaceId: string | undefined, sessionId: string) =>
    ['sessions', workspaceId ?? 'default', sessionId, 'rename'] as const,
};

type CreateSessionInput = InferRequestType<typeof $sessions.$post>['json'];
type SendMessageInput = InferRequestType<typeof $message.$post>['json'];

export function useSessions(workspaceId?: string, search?: string) {
  return useInfiniteQuery({
    // Include search & searchBy in key so queries auto-refetch when search state changes
    queryKey: [...sessionKeys.all(workspaceId), search],

    initialPageParam: undefined as string | undefined,

    placeholderData: keepPreviousData,

    queryFn: async ({ pageParam }) => {
      const res = await $sessions.$get({
        query: {
          workspaceId,
          cursor: pageParam,
          limit: PAGINATION_LIMIT.toString(),
          search: search || undefined,
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

export function useSessionsArchived(workspaceId?: string) {
  return useQuery({
    queryKey: sessionKeys.allArchived(workspaceId),
    queryFn: async () => {
      const res = await $archivedSessions.$get({
        query: {
          workspaceId,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch archived sessions');
      return res.json();
    },
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
      const [res] = await Promise.all([
        $sessions.$post({
          json: input,
          query: { workspaceId },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
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
      const [res] = await Promise.all([
        $session.$delete({
          param: { id: sessionId },
          query: { workspaceId },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
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

export function useSessionMarkdown(workspaceId?: string) {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await $markdown.$get({
        param: { id: sessionId },
        query: { workspaceId },
      });
      if (!res.ok) throw new Error('Failed to retrieve markdown');
      return res.json();
    },
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

export function useArchiveSession(workspaceId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const [res] = await Promise.all([
        $archive.$patch({
          param: { id: sessionId },
          query: { workspaceId },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
      if (!res.ok) throw new Error('Failed to archive session');
      return res.json();
    },
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all(workspaceId) });
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(workspaceId, sessionId),
      });
    },
  });
}

export function useUnarchiveSession(workspaceId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const [res] = await Promise.all([
        $unarchive.$patch({
          param: { id: sessionId },
          query: { workspaceId },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
      if (!res.ok) throw new Error('Failed to unarchive session');
      return res.json();
    },
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all(workspaceId) });
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(workspaceId, sessionId),
      });
    },
  });
}

export function useRenameSession(workspaceId?: string) {
  return useMutation({
    mutationFn: async ({
      sessionId,
      title,
    }: {
      sessionId: string;
      title: string;
    }) => {
      const res = await $rename.$patch({
        param: { id: sessionId },
        query: { workspaceId },
        json: { title },
      });
      if (!res.ok) throw new Error('Failed to rename session');
      return res.json();
    },
  });
}
