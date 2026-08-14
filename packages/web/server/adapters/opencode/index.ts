// server/adapters/opencode/index.ts
//
// Implements HarnessAdapter against @opencode-ai/sdk. This is the template
// for codex/claude adapters later — same interface, different SDK/CLI calls
// and a different mappers.ts.

import type { Event } from '@opencode-ai/sdk/v2';
import pLimit from 'p-limit';

import {
  getOpencodeClientV1,
  getOpencodeClientV2,
} from '@/server/adapters/opencode/client';
import {
  AERO_DIR,
  GET_ALL_LIMIT,
  PAGINATION_LIMIT,
  WORKSPACE_VISIBLE_SESSIONS_LIMIT,
} from '@/server/helper';
import type {
  AddWorktreeInput,
  AeroEvent,
  AeroPart,
  AeroTocItem,
  AeroWorkspaceSummary,
  AeroWorktreeSummary,
  BasePaginationParams,
  CreateWorkspaceInput,
  HarnessAdapter,
  ListSessionsParams,
  StreamEventsOptions,
  UpdateWorkspaceInput,
} from '@/server/services/harness/types';
import { getBasename, normalizePath, WORKTREE_PATH } from '@/server/shared';
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

import {
  toAeroMessage,
  toAeroPart,
  toAeroSession,
  toAeroSessionExperimental,
  toAeroSessionV2,
  toAeroSessionV2Info,
} from './mappers';
import { unwrap } from './unwrap';

export async function createOpencodeAdapter(): Promise<HarnessAdapter> {
  const clientV1 = await getOpencodeClientV1();
  const clientV2 = await getOpencodeClientV2();

  /**
   * Helper: Hydrates a StoredWorkspace from storage into an AeroWorkspaceSummary
   * by pulling top 3 preview sessions per worktree from OpenCode SDK.
   */
  async function hydrateWorkspace(
    stored: StoredWorkspace,
  ): Promise<AeroWorkspaceSummary> {
    const worktrees: AeroWorktreeSummary[] = await Promise.all(
      stored.worktrees.map(async (wt) => {
        try {
          const res = unwrap(
            await clientV2.v2.session.list({
              directory: wt.directory,
              limit: WORKSPACE_VISIBLE_SESSIONS_LIMIT + 1, // Fetch LIMIT + 1 to check if more sessions exist
            }),
          );

          const unarchived = res.data.filter((s) => !s.time.archived);
          const hasMoreSessions =
            unarchived.length > WORKSPACE_VISIBLE_SESSIONS_LIMIT;
          const previewSessions = unarchived
            .slice(0, WORKSPACE_VISIBLE_SESSIONS_LIMIT)
            .map(toAeroSessionV2Info);

          return {
            id: wt.id,
            name: wt.name,
            directory: wt.directory,
            hasMoreSessions,
            sessions: previewSessions,
          };
        } catch {
          return {
            id: wt.id,
            name: wt.name,
            directory: wt.directory,
            hasMoreSessions: false,
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

  /**
   * Helper: Scans OpenCode SDK for existing sessions, groups them by directory,
   * and populates storage for any new workspace root paths found.
   */
  async function scanAndSyncWorkspaces(): Promise<AeroWorkspaceSummary[]> {
    const sdkSessions = unwrap(
      await clientV2.v2.session.list({ limit: GET_ALL_LIMIT }),
    );

    const excludePrefix = AERO_DIR;

    // Group sessions by normalized directory
    const sessionsByDir = new Map<string, string[]>();
    for (const session of sdkSessions.data) {
      const normDir = normalizePath(session.location.directory);
      if (normDir.startsWith(excludePrefix)) continue;

      if (!sessionsByDir.has(normDir)) sessionsByDir.set(normDir, []);
      sessionsByDir.get(normDir)!.push(session.id);
    }

    const isWorktreeStorage = (dir: string) =>
      dir.includes(WORKTREE_PATH.opencode);

    // Identify primary non-worktree directories
    const primaryDirectories = Array.from(sessionsByDir.keys()).filter(
      (dir) => !isWorktreeStorage(dir),
    );

    // Register each discovered directory in storage
    for (const primaryDir of primaryDirectories) {
      let worktreePaths: string[] = [];
      try {
        const wtResult = unwrap(
          await clientV2.worktree.list({ directory: primaryDir }),
        );
        worktreePaths = wtResult.map(normalizePath);
      } catch {
        worktreePaths = [primaryDir];
      }

      if (!worktreePaths.includes(primaryDir)) {
        worktreePaths.push(primaryDir);
      }

      await createWorkspace({
        name: getBasename(primaryDir),
        directory: primaryDir,
        worktrees: worktreePaths.map((wtPath) => ({
          name: getBasename(wtPath),
          directory: wtPath,
        })),
      });
    }

    const allStored = await listStoredWorkspaces();
    return Promise.all(allStored.map(hydrateWorkspace));
  }

  async function archiveSessionsInDirectory(directoryPath: string) {
    try {
      const sessions = unwrap(
        await clientV2.v2.session.list({
          directory: normalizePath(directoryPath),
          limit: GET_ALL_LIMIT,
        }),
      );

      const activeSessions = sessions.data.filter((s) => !s.time.archived);

      await Promise.allSettled(
        activeSessions.map((s) =>
          clientV2.session.update({
            sessionID: s.id,
            time: { archived: Date.now() },
          }),
        ),
      );
    } catch {
      // Handle error or ignore if directory has no sessions
    }
  }

  return {
    id: 'opencode',

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
        // Archive sessions across ALL worktrees in this workspace
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
          // Archive sessions for this specific worktree directory
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
      if (existing.length > 0) {
        return Promise.all(existing.map(hydrateWorkspace));
      }
      return scanAndSyncWorkspaces();
    },

    async syncWorkspaces() {
      return scanAndSyncWorkspaces();
    },

    // Session Operations
    async listSessions({
      directory,
      cursor,
      limit = PAGINATION_LIMIT,
      search,
    }: ListSessionsParams) {
      const sessions = unwrap(
        await clientV2.v2.session.list({
          directory: directory ? normalizePath(directory) : undefined,
          cursor,
          limit,
          search,
        }),
      );

      const items = sessions.data
        .filter((session) => !session.time.archived)
        .map(toAeroSessionV2Info);

      return {
        items,
        nextCursor: sessions.cursor?.next,
      };
    },

    async listArchivedSessions() {
      const sessions = unwrap(
        await clientV2.experimental.session.list({
          limit: GET_ALL_LIMIT,
          archived: true,
        }),
      );

      return sessions
        .filter((session) => session.time.archived)
        .map(toAeroSessionExperimental);
    },

    async createSession(input) {
      const session = unwrap(
        await clientV2.session.create({
          title: input.title,
          directory: input.directory,
        }),
      );

      const mapped = toAeroSessionV2(session);
      return {
        ...mapped,
        harnessId: 'opencode',
      };
    },

    async getSession(sessionID) {
      const session = unwrap(
        await clientV1.session.get({
          path: {
            id: sessionID,
          },
        }),
      );
      return toAeroSession(session);
    },

    async deleteSession(sessionID) {
      return unwrap(await clientV2.session.delete({ sessionID }));
    },

    async shareSession(sessionID: string) {
      const sessionInfo = await clientV2.session.get({ sessionID });
      const directory = sessionInfo.data?.directory;

      // Fallback: If directory contains special/non-Latin-1 characters,
      // ensure it doesn't break the SDK or server request
      const result = await clientV2.session.share({
        sessionID,
        directory: directory ? encodeURI(directory) : undefined,
      });

      const session = unwrap(result);
      return toAeroSessionV2(session);
    },

    async unshareSession(sessionID) {
      const sessionInfo = await clientV2.session.get({ sessionID });
      const session = unwrap(
        await clientV2.session.unshare({
          sessionID,
          directory: sessionInfo.data?.directory,
        }),
      );
      return toAeroSessionV2(session);
    },

    async deleteBulkSessions(sessionIDs) {
      const limit = pLimit(50);

      try {
        await Promise.all(
          sessionIDs.map((sessionID) =>
            limit(async () => {
              await clientV2.session.delete({
                sessionID,
              });
            }),
          ),
        );
        return true;
      } catch {
        return false;
      }
    },

    async listMessages(sessionID) {
      const entries = unwrap(await clientV2.session.messages({ sessionID }));
      return entries.map(toAeroMessage);
    },

    async listTocs(sessionID) {
      const entries = unwrap(await clientV2.session.messages({ sessionID }));
      const messages = entries.map(toAeroMessage);

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

    async messagesToMarkdown(sessionID) {
      const sessionItem = unwrap(await clientV2.session.get({ sessionID }));
      const entries = unwrap(await clientV2.session.messages({ sessionID }));
      const messages = entries.map(toAeroMessage);

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

      const title = sessionItem.title;
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

    async archiveSession(sessionID) {
      const session = unwrap(
        await clientV2.session.update({
          sessionID,
          time: {
            archived: Date.now(),
          },
        }),
      );

      return toAeroSessionV2(session);
    },

    async archiveBulkSessions(sessionIDs: string[]) {
      const limit = pLimit(50);
      const archivedTime = Date.now();

      try {
        await Promise.all(
          sessionIDs.map((sessionID) =>
            limit(async () => {
              await clientV2.session.update({
                sessionID,
                time: { archived: archivedTime },
              });
            }),
          ),
        );
        return true;
      } catch {
        return false;
      }
    },

    async unarchiveSession(sessionID) {
      const session = unwrap(
        await clientV2.session.update({
          sessionID,
          time: {
            archived: undefined,
          },
        }),
      );

      return toAeroSessionV2(session);
    },

    async unarchiveBulkSessions(sessionIDs: string[]) {
      const limit = pLimit(50);

      try {
        await Promise.all(
          sessionIDs.map((sessionID) =>
            limit(async () => {
              await clientV2.session.update({
                sessionID,
                time: { archived: undefined },
              });
            }),
          ),
        );
        return true;
      } catch {
        return false;
      }
    },

    async renameSession({ sessionId, title }) {
      const session = unwrap(
        await clientV2.session.update({
          sessionID: sessionId,
          title,
        }),
      );

      return toAeroSessionV2(session);
    },

    async sendMessage(sessionID, input) {
      unwrap(
        await clientV2.session.promptAsync({
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
        await clientV2.session.prompt({
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
      return unwrap(await clientV2.session.abort({ sessionID }));
    },

    async *streamEvents(
      options: StreamEventsOptions = {},
    ): AsyncIterable<AeroEvent> {
      const { sessionId, signal } = options;
      const events = await clientV2.event.subscribe();

      for await (const event of events.stream) {
        if (signal?.aborted) return;

        const mapped = mapOpencodeEvent(event);
        if (!mapped) continue;

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
        error:
          (event.properties as { error?: { message?: string } }).error
            ?.message ?? 'Unknown error',
      };

    default:
      return null;
  }
}
