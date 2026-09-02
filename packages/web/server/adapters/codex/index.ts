// server/adapters/codex/index.ts

import EventEmitter from 'node:events';

import { getCodexClient } from '@/server/adapters/codex/client';
import { PAGINATION_LIMIT } from '@/server/helper';
import type {
  AddWorktreeInput,
  AeroEvent,
  AeroMessage,
  AeroPart,
  AeroSessionSummary,
  AeroTocItem,
  AeroWorkspaceSummary,
  AeroWorktreeSummary,
  BasePaginationParams,
  CreateSessionInput,
  CreateWorkspaceInput,
  HarnessAdapter,
  ListSessionsParams,
  RenameSessionInput,
  SendMessageInput,
  StreamEventsOptions,
  UpdateWorkspaceInput,
} from '@/server/services/harness/types';
import { normalizePath } from '@/server/shared';
import {
  appendCodexMessage,
  deleteCodexSession,
  getCodexMessages,
  getCodexSession,
  listArchivedCodexSessions,
  listCodexSessions,
  saveCodexSession,
  setCodexSessionArchived,
} from '@/server/storage/codex';
import {
  addWorktreeToWorkspace,
  type AeroWorkspace as StoredWorkspace,
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  listWorkspaces as listStoredWorkspaces,
  removeWorktreeFromWorkspace,
  updateWorkspace,
} from '@/server/storage/workspaces';

import { toAeroMessage, toAeroSession } from './mappers';

const globalEmitter = new EventEmitter();

export async function createCodexAdapter(): Promise<HarnessAdapter> {
  const codex = getCodexClient();
  const adapterId = 'codex';

  async function getSessionInternal(
    sessionId: string,
  ): Promise<AeroSessionSummary> {
    const session = await getCodexSession(sessionId);
    if (!session) throw new Error(`Codex session not found: ${sessionId}`);
    return session;
  }

  async function hydrateWorkspace(
    stored: StoredWorkspace,
  ): Promise<AeroWorkspaceSummary> {
    const worktrees: AeroWorktreeSummary[] = await Promise.all(
      stored.worktrees.map(async (wt) => {
        try {
          const sessions = await listCodexSessions(wt.directory);
          const previewSessions = sessions.slice(0, 3);

          return {
            id: wt.id,
            name: wt.name,
            directory: wt.directory,
            sessions: previewSessions,
          };
        } catch {
          return {
            id: wt.id,
            name: wt.name,
            directory: wt.directory,
            sessions: [],
          };
        }
      }),
    );

    return {
      id: stored.id,
      name: stored.name,
      directory: stored.directory,
      worktrees,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
    };
  }

  async function archiveSessionsInDirectory(directoryPath: string) {
    try {
      const sessions = await listCodexSessions(directoryPath);
      await Promise.allSettled(
        sessions.map((s) => setCodexSessionArchived(s.id, true)),
      );
    } catch {
      // Ignore if directory has no sessions
    }
  }

  async function sendMessageSyncInternal(
    sessionId: string,
    input: SendMessageInput,
  ): Promise<AeroMessage> {
    const now = Date.now();

    // 1. Record User Message
    const userParts: AeroPart[] = input.parts.map((p, idx) => ({
      ...p,
      id: `codex-usr-part-${now}-${idx}`,
    }));

    const userMessage: AeroMessage = {
      id: `codex-msg-user-${now}`,
      sessionId,
      role: 'user',
      parts: userParts,
      createdAt: now,
    };

    await appendCodexMessage(sessionId, userMessage);
    globalEmitter.emit('event', {
      type: 'message.updated',
      sessionId,
      message: userMessage,
    } as AeroEvent);

    // 2. Resume Codex thread and execute prompt
    const thread = codex.resumeThread(sessionId);
    const textParts = input.parts
      .filter((p) => p.type === 'text')
      .map((p) => (p as { type: 'text'; text: string }).text)
      .join('\n');

    const result = await thread.run(textParts);

    // 3. Record Assistant Response
    const assistantMessage: AeroMessage = toAeroMessage({
      id: `codex-msg-ast-${Date.now()}`,
      sessionId,
      role: 'assistant',
      parts: [
        {
          id: `codex-ast-part-${Date.now()}`,
          type: 'text',
          text: result.finalResponse,
        },
      ],
      createdAt: Date.now(),
    });

    await appendCodexMessage(sessionId, assistantMessage);

    globalEmitter.emit('event', {
      type: 'message.updated',
      sessionId,
      message: assistantMessage,
    } as AeroEvent);

    globalEmitter.emit('event', {
      type: 'session.idle',
      sessionId,
    } as AeroEvent);

    return assistantMessage;
  }

  return {
    id: adapterId,

    // Workspace Operations
    async listWorkspaces({
      cursor,
      limit = PAGINATION_LIMIT,
    }: BasePaginationParams) {
      const all = await listStoredWorkspaces();

      const startIndex = cursor ? all.findIndex((w) => w.id === cursor) + 1 : 0;
      const pageItems = all.slice(startIndex, startIndex + limit);
      const hasMore = startIndex + limit < all.length;
      const nextCursor = hasMore
        ? pageItems[pageItems.length - 1]?.id
        : undefined;

      const items = await Promise.all(pageItems.map(hydrateWorkspace));

      return {
        items,
        nextCursor,
      };
    },

    async getWorkspace(workspaceId: string) {
      const stored = await getWorkspace(workspaceId);
      if (!stored) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }
      return hydrateWorkspace(stored);
    },

    async createWorkspace(input: CreateWorkspaceInput) {
      const stored = await createWorkspace(input);
      return hydrateWorkspace(stored);
    },

    async updateWorkspace(workspaceId: string, input: UpdateWorkspaceInput) {
      const updated = await updateWorkspace(workspaceId, input);
      if (!updated) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }
      return hydrateWorkspace(updated);
    },

    async deleteWorkspace(workspaceId: string) {
      const stored = await getWorkspace(workspaceId);
      if (stored) {
        await Promise.allSettled(
          stored.worktrees.map((wt) =>
            archiveSessionsInDirectory(wt.directory),
          ),
        );
      }

      return deleteWorkspace(workspaceId);
    },

    async addWorktree(workspaceId: string, input: AddWorktreeInput) {
      const updated = await addWorktreeToWorkspace(workspaceId, input);
      if (!updated) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }
      return hydrateWorkspace(updated);
    },

    async removeWorktree(workspaceId: string, worktreeIdOrDir: string) {
      const stored = await getWorkspace(workspaceId);
      if (stored) {
        const targetWt = stored.worktrees.find(
          (wt) =>
            wt.id === worktreeIdOrDir ||
            wt.directory === normalizePath(worktreeIdOrDir),
        );

        if (targetWt) {
          await archiveSessionsInDirectory(targetWt.directory);
        }
      }

      const updated = await removeWorktreeFromWorkspace(
        workspaceId,
        worktreeIdOrDir,
      );
      if (!updated) {
        throw new Error(`Workspace or worktree not found: ${workspaceId}`);
      }
      return hydrateWorkspace(updated);
    },

    async initWorkspaces() {
      const existing = await listStoredWorkspaces();
      return Promise.all(existing.map(hydrateWorkspace));
    },

    async syncWorkspaces() {
      const existing = await listStoredWorkspaces();
      return Promise.all(existing.map(hydrateWorkspace));
    },

    // Session Operations
    async listSessions({
      directory,
      cursor,
      limit = PAGINATION_LIMIT,
      search,
    }: ListSessionsParams) {
      let all = await listCodexSessions(directory);

      if (search) {
        const q = search.toLowerCase();
        all = all.filter((s) => s.title.toLowerCase().includes(q));
      }

      const startIndex = cursor ? all.findIndex((s) => s.id === cursor) + 1 : 0;
      const items = all.slice(startIndex, startIndex + limit);
      const nextCursor =
        startIndex + limit < all.length ? items.at(-1)?.id : undefined;

      return { items, nextCursor };
    },

    async listArchivedSessions() {
      return listArchivedCodexSessions();
    },

    async createSession(
      input: CreateSessionInput,
    ): Promise<AeroSessionSummary> {
      const thread = codex.startThread();
      const now = Date.now();

      const session = toAeroSession({
        id: thread.id ?? `codex-${now}`,
        title: input.title || 'Untitled session',
        workspace: '',
        createdAt: now,
        updatedAt: now,
      });

      await saveCodexSession(session);
      return session;
    },

    async getSession(sessionId: string): Promise<AeroSessionSummary> {
      return getSessionInternal(sessionId);
    },

    async deleteSession(sessionId: string) {
      return deleteCodexSession(sessionId);
    },

    async listMessages(sessionId: string) {
      return getCodexMessages(sessionId);
    },

    async listTocs(sessionId: string) {
      const messages = await getCodexMessages(sessionId);
      const items: AeroTocItem[] = [];
      let groupIndex = -1;
      let currentRole: string | null = null;

      for (const msg of messages) {
        if (msg.role !== currentRole) {
          groupIndex++;
          currentRole = msg.role;
        }

        if (msg.role === 'user') {
          const userText = (msg.parts ?? [])
            .filter((p) => p.type === 'text')
            .map((p) => (p as { type: 'text'; text: string }).text)
            .join(' ')
            .trim();

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

    async messagesToMarkdown(sessionId: string) {
      const session = await getSessionInternal(sessionId);
      const messages = await getCodexMessages(sessionId);

      const formatPart = (part: AeroPart): string | null => {
        switch (part.type) {
          case 'text':
            return part.text.trim().length > 0 ? part.text.trim() : null;
          case 'reasoning':
          case 'tool':
            return null;
          case 'file':
            return `*[File: ${part.path}]*`;
          default:
            return null;
        }
      };

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
        .filter((msg) => msg.content.length > 0);

      const title = session.title;
      const exportDate = new Date().toISOString().split('T')[0];
      const header = `# ${title}\n\n*Exported on ${exportDate}*`;

      const body = formattedMessages
        .map((msg) => `### ${msg.role}\n\n${msg.content}`)
        .join('\n\n---\n\n');

      return {
        title,
        markdown: `${header}\n\n---\n\n${body}`,
      };
    },

    async archiveSession(sessionId: string) {
      return setCodexSessionArchived(sessionId, true);
    },

    async unarchiveSession(sessionId: string) {
      return setCodexSessionArchived(sessionId, false);
    },

    async renameSession({ sessionId, title }: RenameSessionInput) {
      const session = await getSessionInternal(sessionId);
      session.title = title;
      session.updatedAt = Date.now();
      return saveCodexSession(session);
    },

    async sendMessage(
      sessionId: string,
      input: SendMessageInput,
    ): Promise<void> {
      sendMessageSyncInternal(sessionId, input).catch((err) => {
        globalEmitter.emit('event', {
          type: 'session.error',
          sessionId,
          error: err.message || String(err),
        } as AeroEvent);
      });
    },

    async sendMessageSync(sessionId: string, input: SendMessageInput) {
      return sendMessageSyncInternal(sessionId, input);
    },

    async abortSession(sessionId: string) {
      globalEmitter.emit('event', {
        type: 'session.idle',
        sessionId,
      } as AeroEvent);
      return true;
    },

    async *streamEvents(
      options: StreamEventsOptions = {},
    ): AsyncIterable<AeroEvent> {
      const { sessionId, signal } = options;

      const queue: AeroEvent[] = [];
      let resolveNext: (() => void) | null = null;

      const handler = (event: AeroEvent) => {
        if (
          sessionId &&
          'sessionId' in event &&
          event.sessionId !== sessionId
        ) {
          return;
        }
        queue.push(event);
        if (resolveNext) {
          resolveNext();
          resolveNext = null;
        }
      };

      globalEmitter.on('event', handler);

      try {
        while (!signal?.aborted) {
          if (queue.length === 0) {
            await new Promise<void>((res) => {
              resolveNext = res;
            });
          }

          while (queue.length > 0) {
            if (signal?.aborted) return;
            const event = queue.shift();
            if (event) yield event;
          }
        }
      } finally {
        globalEmitter.off('event', handler);
      }
    },
  };
}
