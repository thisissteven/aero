// app/hooks/sessions.ts
//
// All queries/mutations are scoped by harness in the query key, since a
// harness is locked per-session server-side. Pass harness=undefined to operate
// against the default harness.

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { InferRequestType, InferResponseType } from 'hono/client';

import { useRecentsSidebarStore } from '@/app/components/chat-sidebar/sidebar-store';
import { honoClient, PAGINATION_LIMIT } from '@/app/lib';
import { AeroSessionSummary, HarnessId } from '@/server/services/harness/types';

export const $sessions = honoClient.api.sessions;
export const $individualSession = honoClient.api.sessions[':id'];

export const sessionKeys = {
  merged: () => ['sessions', 'default'] as const,
  allArchived: (harnessId?: string) =>
    ['sessions', harnessId ?? 'default', 'all-archived'] as const,
  detail: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessId ?? 'default', sessionId, 'detail'] as const,
  status: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessId ?? 'default', sessionId, 'status'] as const,
  messages: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessId ?? 'default', sessionId, 'messages'] as const,
  toc: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessId ?? 'default', sessionId, 'toc'] as const,
  context: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessId ?? 'default', sessionId, 'context'] as const,
  todos: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessId ?? 'default', sessionId, 'todos'] as const,
};

type CreateSessionInput = InferRequestType<typeof $sessions.$post>['json'];
type SendMessageInput = InferRequestType<
  typeof $individualSession.message.$post
>['json'];

export type SessionsPageResponse = InferResponseType<
  typeof $sessions.merged.$get,
  200
>;

interface UseSessionsOptions {
  directory?: string;
  search?: string;
  limit?: number;
  initialSessions?: AeroSessionSummary[];
}

export function useSessions({
  directory,
  search,
  initialSessions,
  limit,
}: UseSessionsOptions = {}) {
  return useInfiniteQuery({
    queryKey: [
      ...sessionKeys.merged(),
      search,
      ...(directory ? ['directory', directory] : []),
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
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch sessions');
      }

      return res.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    // Hydrate the first page using initial 5 sessions from server
    initialData: initialSessions?.length
      ? {
          pages: [
            {
              items: initialSessions,
              nextCursor: undefined, // Will fetch actual next cursor on fetchNextPage
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
      const res = await $sessions.archived.$get({
        query: {
          harnessId,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch archived sessions');
      return res.json();
    },
  });
}

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
      if (!res.ok) return null;
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
        query: {
          harnessId,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to load session status');
      }

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

export function useCreateSession(defaultharnessId?: HarnessId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSessionInput) => {
      const targetharnessId = input.harnessId || defaultharnessId;

      const [res] = await Promise.all([
        $sessions.$post({
          json: {
            ...input,
            harnessId: targetharnessId,
          },
          query: { harnessId: targetharnessId },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
      if (!res.ok) throw new Error('Failed to create session');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: sessionKeys.merged(),
      });
    },
  });
}

export function useDeleteBulkSessions(harnessId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionIds: string[]) => {
      const [res] = await Promise.all([
        $sessions.delete.bulk.$delete({
          query: { harnessId, ids: sessionIds.join(',') },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
      if (!res.ok) throw new Error('Failed to delete sessions');
      return res.json();
    },
    onSuccess: (_data) => {
      queryClient
        .invalidateQueries({ queryKey: sessionKeys.merged() })
        .then(() => {
          useRecentsSidebarStore.getState().clearSelectedSessionIds();
        });
    },
  });
}

export function useDeleteSession(harnessId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const [res] = await Promise.all([
        $individualSession.$delete({
          param: { id: sessionId },
          query: { harnessId },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
      if (!res.ok) throw new Error('Failed to delete session');
      return res.json();
    },
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.merged() });
      queryClient.removeQueries({
        queryKey: sessionKeys.detail(harnessId, sessionId),
      });
    },
  });
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
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    enabled: !!sessionId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
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
      if (!res.ok) throw new Error('Failed to fetch session context');
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
      if (!res.ok) throw new Error('Failed to fetch session TOC');
      return res.json();
    },
    enabled: !!sessionId,
  });
}

export function useShareSession(harnessId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await $individualSession.share.$get({
        param: { id: sessionId },
        query: { harnessId },
      });
      if (!res.ok) throw new Error('Failed to share session');
      return res.json();
    },
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(harnessId, sessionId),
      });
    },
  });
}

export function useUnshareSession(harnessId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await $individualSession.unshare.$get({
        param: { id: sessionId },
        query: { harnessId },
      });
      if (!res.ok) throw new Error('Failed to unshare session');
      return res.json();
    },
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(harnessId, sessionId),
      });
    },
  });
}

export function useSessionMarkdown(harnessId?: string) {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await $individualSession.markdown.$get({
        param: { id: sessionId },
        query: { harnessId },
      });
      if (!res.ok) throw new Error('Failed to retrieve markdown');
      return res.json();
    },
  });
}

export function useRestoreAllMessages(
  harnessId: string | undefined,
  sessionId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await $individualSession.restore.$post({
        param: { id: sessionId },
        query: { harnessId },
      });
      if (!res.ok) throw new Error('Failed to restore messages');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(harnessId, sessionId),
      });
    },
  });
}

export function useRevertSession(
  harnessId: string | undefined,
  sessionId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const res = await $individualSession.revert.$post({
        param: { id: sessionId },
        query: { harnessId },
        json: {
          messageId,
        },
      });
      if (!res.ok) throw new Error('Failed to revert message');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(harnessId, sessionId),
      });
    },
  });
}

export function useForkSession(
  harnessId: string | undefined,
  sessionId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const res = await $individualSession.fork.$post({
        param: { id: sessionId },
        query: { harnessId },
        json: {
          messageId,
        },
      });
      if (!res.ok) throw new Error('Failed to fork session');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: sessionKeys.merged(),
      });
    },
  });
}

export function useSendMessage(harnessId: string | undefined) {
  return useMutation({
    mutationFn: async (
      input: SendMessageInput & {
        sessionId: string;
      },
    ) => {
      const res = await $individualSession.message.$post({
        param: {
          id: input.sessionId,
        },
        query: {
          harnessId,
        },
        json: input,
      });

      if (!res.ok) {
        throw new Error('Failed to send message');
      }

      return res.json();
    },
  });
}

export function useAbortSession(harnessId: string | undefined) {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await $individualSession.abort.$post({
        param: {
          id: sessionId,
        },
        query: {
          harnessId,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to abort session');
      }

      return res.json();
    },
  });
}

export function useArchiveSession(harnessId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const [res] = await Promise.all([
        $individualSession.archive.$patch({
          param: { id: sessionId },
          query: { harnessId },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
      if (!res.ok) throw new Error('Failed to archive session');
      return res.json();
    },
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.merged() });
    },
  });
}

export function useArchiveBulkSessions(harnessId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionIds: string[]) => {
      const [res] = await Promise.all([
        $sessions.archive.bulk.$patch({
          query: { harnessId, ids: sessionIds.join(',') },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
      if (!res.ok) throw new Error('Failed to archive sessions');
      return res.json();
    },
    onSuccess: (_data) => {
      queryClient
        .invalidateQueries({ queryKey: sessionKeys.merged() })
        .then(() => {
          useRecentsSidebarStore.getState().clearSelectedSessionIds();
        });
    },
  });
}

export function useUnarchiveSession(harnessId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const [res] = await Promise.all([
        $individualSession.unarchive.$patch({
          param: { id: sessionId },
          query: { harnessId },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
      if (!res.ok) throw new Error('Failed to unarchive session');
      return res.json();
    },
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.merged() });
    },
  });
}

export function useUnarchiveBulkSessions(harnessId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionIds: string[]) => {
      const [res] = await Promise.all([
        $sessions.unarchive.bulk.$patch({
          query: { harnessId, ids: sessionIds.join(',') },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
      if (!res.ok) throw new Error('Failed to unarchive sessions');
      return res.json();
    },
    onSuccess: (_data) => {
      queryClient
        .invalidateQueries({ queryKey: sessionKeys.merged() })
        .then(() => {
          useRecentsSidebarStore.getState().clearSelectedSessionIds();
        });
    },
  });
}

export function useRenameSession(harnessId?: string) {
  return useMutation({
    mutationFn: async ({
      sessionId,
      title,
    }: {
      sessionId: string;
      title: string;
    }) => {
      const res = await $individualSession.rename.$patch({
        param: { id: sessionId },
        query: { harnessId },
        json: { title },
      });
      if (!res.ok) throw new Error('Failed to rename session');
      return res.json();
    },
  });
}
