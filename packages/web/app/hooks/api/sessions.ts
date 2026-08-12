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
import type { InferRequestType } from 'hono/client';

import { honoClient, PAGINATION_LIMIT } from '@/app/lib';
import { HarnessId } from '@/server/services/harness/types';

const $sessions = honoClient.api.sessions;
const $sessionsMerged = honoClient.api.sessions.merged;
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
  merged: () => ['sessions', 'default'] as const,
  allArchived: (harnessId?: string) =>
    ['sessions', harnessId ?? 'default', 'all-archived'] as const,
  detail: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessId ?? 'default', sessionId, 'detail'] as const,
  messages: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessId ?? 'default', sessionId, 'messages'] as const,
  toc: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessId ?? 'default', sessionId, 'toc'] as const,
  markdown: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessId ?? 'default', sessionId, 'markdown'] as const,
  archive: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessId ?? 'default', sessionId, 'archive'] as const,
  unarchive: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessId ?? 'default', sessionId, 'unarchive'] as const,
  rename: (harnessId: string | undefined, sessionId: string) =>
    ['sessions', harnessId ?? 'default', sessionId, 'rename'] as const,
};

type CreateSessionInput = InferRequestType<typeof $sessions.$post>['json'];
type SendMessageInput = InferRequestType<typeof $message.$post>['json'];

export function useSessions(search?: string) {
  return useInfiniteQuery({
    queryKey: [...sessionKeys.merged(), search],

    initialPageParam: undefined as string | undefined,

    placeholderData: keepPreviousData,

    queryFn: async ({ pageParam }) => {
      const res = await $sessionsMerged.$get({
        query: {
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

export function useSessionsArchived(harnessId?: string) {
  return useQuery({
    queryKey: sessionKeys.allArchived(harnessId),
    queryFn: async () => {
      const res = await $archivedSessions.$get({
        query: {
          harnessId,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch archived sessions');
      return res.json();
    },
  });
}

export function useSession(harnessId: string | undefined, sessionId: string) {
  return useQuery({
    queryKey: sessionKeys.detail(harnessId, sessionId),
    queryFn: async () => {
      const res = await $session.$get({
        param: { id: sessionId },
        query: { harnessId },
      });
      if (!res.ok) throw new Error('Failed to fetch session');
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

export function useDeleteSession(harnessId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const [res] = await Promise.all([
        $session.$delete({
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
      const res = await $messages.$get({
        param: { id: sessionId },
        query: { harnessId },
      });
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
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
      const res = await $toc.$get({
        param: { id: sessionId },
        query: { harnessId },
      });
      if (!res.ok) throw new Error('Failed to fetch session TOC');
      return res.json();
    },
    enabled: !!sessionId,
  });
}

export function useSessionMarkdown(harnessId?: string) {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await $markdown.$get({
        param: { id: sessionId },
        query: { harnessId },
      });
      if (!res.ok) throw new Error('Failed to retrieve markdown');
      return res.json();
    },
  });
}

export function useSendMessage(
  harnessId: string | undefined,
  sessionId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SendMessageInput) => {
      const res = await $message.$post({
        param: { id: sessionId },
        query: { harnessId },
        json: input,
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: sessionKeys.messages(harnessId, sessionId),
      });
    },
  });
}

export function useAbortSession(harnessId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await $abort.$post({
        param: { id: sessionId },
        query: { harnessId },
      });
      if (!res.ok) throw new Error('Failed to abort session');
      return res.json();
    },
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(harnessId, sessionId),
      });
    },
  });
}

export function useArchiveSession(harnessId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const [res] = await Promise.all([
        $archive.$patch({
          param: { id: sessionId },
          query: { harnessId },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
      if (!res.ok) throw new Error('Failed to archive session');
      return res.json();
    },
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.merged() });
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(harnessId, sessionId),
      });
    },
  });
}

export function useUnarchiveSession(harnessId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const [res] = await Promise.all([
        $unarchive.$patch({
          param: { id: sessionId },
          query: { harnessId },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
      if (!res.ok) throw new Error('Failed to unarchive session');
      return res.json();
    },
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.merged() });
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(harnessId, sessionId),
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
      const res = await $rename.$patch({
        param: { id: sessionId },
        query: { harnessId },
        json: { title },
      });
      if (!res.ok) throw new Error('Failed to rename session');
      return res.json();
    },
  });
}
