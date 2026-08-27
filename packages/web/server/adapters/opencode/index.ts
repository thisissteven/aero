// server/adapters/opencode/index.ts

import type { Event } from '@opencode-ai/sdk/v2';
import pLimit from 'p-limit';

import {
  getOpencodeStreamingClientV2,
  withOpencodeClientV1,
  withOpencodeClientV2,
} from '@/server/adapters/opencode/client';
import { parseSseEventEnvelope } from '@/server/adapters/opencode/sse-envelope';
import {
  AERO_DIR,
  GET_ALL_LIMIT,
  PAGINATION_LIMIT,
  WORKSPACE_VISIBLE_SESSIONS_LIMIT,
} from '@/server/helper';
import { debugLog } from '@/server/lib/debug-log';
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
  toAeroAgent,
  toAeroAgentCompact,
  toAeroCommand,
  toAeroMessage,
  toAeroPart,
  toAeroProvider,
  toAeroSession,
  toAeroSessionContextDetails,
  toAeroSessionExperimental,
  toAeroSessionV2,
  toAeroSessionV2Info,
  toAeroSkill,
  toAeroTool,
  toAeroWorktreeItem,
} from './mappers';
import { unwrap } from './unwrap';

export async function createOpencodeAdapter(): Promise<HarnessAdapter> {
  async function hydrateWorkspace(
    stored: StoredWorkspace,
  ): Promise<AeroWorkspaceSummary> {
    const worktrees: AeroWorktreeSummary[] = await Promise.all(
      stored.worktrees.map(async (wt) => {
        try {
          const res = unwrap(
            await withOpencodeClientV2((client) =>
              client.v2.session.list({
                directory: wt.directory,
                limit: WORKSPACE_VISIBLE_SESSIONS_LIMIT + 1,
              }),
            ),
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

  async function scanAndSyncWorkspaces(): Promise<AeroWorkspaceSummary[]> {
    const sdkSessions = unwrap(
      await withOpencodeClientV2((client) =>
        client.v2.session.list({ limit: GET_ALL_LIMIT }),
      ),
    );

    const excludePrefix = AERO_DIR;

    const sessionsByDir = new Map<string, string[]>();

    for (const session of sdkSessions.data) {
      const normDir = normalizePath(session.location.directory);

      if (normDir.startsWith(excludePrefix)) continue;

      if (!sessionsByDir.has(normDir)) {
        sessionsByDir.set(normDir, []);
      }

      sessionsByDir.get(normDir)!.push(session.id);
    }

    const isWorktreeStorage = (dir: string) =>
      dir.includes(WORKTREE_PATH.opencode);

    const primaryDirectories = Array.from(sessionsByDir.keys()).filter(
      (dir) => !isWorktreeStorage(dir),
    );

    for (const primaryDir of primaryDirectories) {
      let worktreePaths: string[] = [];

      try {
        const wtResult = unwrap(
          await withOpencodeClientV2((client) =>
            client.worktree.list({ directory: primaryDir }),
          ),
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
      await withOpencodeClientV2(async (client) => {
        const sessions = unwrap(
          await client.v2.session.list({
            directory: normalizePath(directoryPath),
            limit: GET_ALL_LIMIT,
          }),
        );

        const activeSessions = sessions.data.filter((s) => !s.time.archived);

        await Promise.allSettled(
          activeSessions.map((s) =>
            client.session.update({
              sessionID: s.id,
              time: { archived: Date.now() },
            }),
          ),
        );
      });
    } catch {
      // Ignore directory scan/archive failures.
    }
  }

  return {
    id: 'opencode',

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

      if (existing.length > 0) {
        return Promise.all(existing.map(hydrateWorkspace));
      }

      return scanAndSyncWorkspaces();
    },

    async syncWorkspaces() {
      return scanAndSyncWorkspaces();
    },

    async listSessions({
      directory,
      cursor,
      limit = PAGINATION_LIMIT,
      search,
    }: ListSessionsParams) {
      const sessions = unwrap(
        await withOpencodeClientV2((client) =>
          client.v2.session.list({
            directory: directory ? normalizePath(directory) : undefined,
            cursor,
            limit,
            search,
          }),
        ),
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
        await withOpencodeClientV2((client) =>
          client.experimental.session.list({
            limit: GET_ALL_LIMIT,
            archived: true,
          }),
        ),
      );

      return sessions
        .filter((session) => session.time.archived)
        .map(toAeroSessionExperimental);
    },

    async revertSession(sessionID, messageID) {
      const session = unwrap(
        await withOpencodeClientV2((client) =>
          client.session.revert({
            sessionID,
            messageID,
          }),
        ),
      );

      return toAeroSessionV2(session);
    },

    async unrevertSession(sessionID) {
      const session = unwrap(
        await withOpencodeClientV2((client) =>
          client.session.unrevert({
            sessionID,
          }),
        ),
      );

      return toAeroSessionV2(session);
    },

    async createSession(input) {
      const session = unwrap(
        await withOpencodeClientV2((client) =>
          client.session.create({
            title: input.title,
            directory: input.directory,
          }),
        ),
      );

      return {
        ...toAeroSessionV2(session),
        harnessId: 'opencode',
      };
    },

    async getSessionStatus(directory) {
      const status = await withOpencodeClientV2(async (client) => {
        return unwrap(
          await client.session.status({
            directory,
          }),
        );
      });
      return status;
    },

    async getSession(sessionID) {
      return withOpencodeClientV1(async (client) => {
        const session = unwrap(
          await client.session.get({
            path: {
              id: sessionID,
            },
          }),
        );

        return toAeroSession(session);
      });
    },

    async deleteSession(sessionID) {
      return unwrap(
        await withOpencodeClientV2((client) =>
          client.session.delete({ sessionID }),
        ),
      );
    },

    async shareSession(sessionID) {
      return withOpencodeClientV2(async (client) => {
        const sessionDetails = await client.session.get({ sessionID });

        const session = unwrap(
          await client.session.share({
            sessionID,
            directory: sessionDetails.data?.directory,
          }),
        );

        const updatedSession = unwrap(
          await client.session.update({
            sessionID,
            metadata: {
              ...sessionDetails.data?.metadata,
              sharedUrl: session.share?.url,
            },
          }),
        );

        return toAeroSessionV2(updatedSession);
      });
    },

    async unshareSession(sessionID) {
      return withOpencodeClientV2(async (client) => {
        const sessionDetails = await client.session.get({ sessionID });

        await client.session.unshare({
          sessionID,
          directory: sessionDetails.data?.directory,
        });

        const updatedSession = unwrap(
          await client.session.update({
            sessionID,
            directory: sessionDetails.data?.directory,
            metadata: {
              ...sessionDetails.data?.metadata,
              sharedUrl: undefined,
            },
          }),
        );

        return toAeroSessionV2(updatedSession);
      });
    },

    async deleteBulkSessions(sessionIDs) {
      const limit = pLimit(10);

      try {
        await withOpencodeClientV2((client) =>
          Promise.all(
            sessionIDs.map((sessionID) =>
              limit(async () => {
                await client.session.delete({ sessionID });
              }),
            ),
          ),
        );

        return true;
      } catch {
        return false;
      }
    },

    async listAgents(directory) {
      const entries = unwrap(
        await withOpencodeClientV2((client) =>
          client.app.agents({ directory }),
        ),
      );

      return entries.map(toAeroAgent);
    },

    async listAgentsCompact(directory) {
      const entries = unwrap(
        await withOpencodeClientV2((client) =>
          client.app.agents({ directory }),
        ),
      );

      return entries.filter((agent) => !agent.hidden).map(toAeroAgentCompact);
    },

    async listSkills(directory) {
      const entries = unwrap(
        await withOpencodeClientV2((client) =>
          client.app.skills({ directory }),
        ),
      );

      return entries.map(toAeroSkill);
    },

    async listCommands(directory) {
      const entries = unwrap(
        await withOpencodeClientV2((client) =>
          client.command.list({ directory }),
        ),
      );

      return entries.map(toAeroCommand);
    },

    async listConfiguredProviders(directory) {
      const entries = unwrap(
        await withOpencodeClientV2((client) =>
          client.config.providers({ directory }),
        ),
      );

      return entries.providers.map(toAeroProvider);
    },

    async listWorktreeNames(directory) {
      return unwrap(
        await withOpencodeClientV2((client) =>
          client.worktree.list({ directory }),
        ),
      );
    },

    async createWorktree(directory, name) {
      const entry = unwrap(
        await withOpencodeClientV2((client) =>
          client.worktree.create({
            directory,
            worktreeCreateInput: {
              name,
            },
          }),
        ),
      );

      return toAeroWorktreeItem(entry);
    },

    async removeWorktreeItem(directory) {
      return unwrap(
        await withOpencodeClientV2((client) =>
          client.worktree.remove({
            directory,
            worktreeRemoveInput: {
              directory,
            },
          }),
        ),
      );
    },

    async setApiKey(provider, apiKey) {
      return unwrap(
        await withOpencodeClientV1((client) =>
          client.auth.set({
            path: { id: provider },
            body: {
              type: 'api',
              key: apiKey,
            },
          }),
        ),
      );
    },

    async listTools(provider, model, directory) {
      const entries = unwrap(
        await withOpencodeClientV2((client) =>
          client.tool.list({ directory, model, provider }),
        ),
      );

      return entries.map(toAeroTool);
    },

    async listProviders(directory) {
      const entries = unwrap(
        await withOpencodeClientV2((client) =>
          client.provider.list({ directory }),
        ),
      );

      return entries.all.map(toAeroProvider);
    },

    async getConfig(directory) {
      return unwrap(
        await withOpencodeClientV2((client) =>
          client.config.get({ directory }),
        ),
      );
    },

    async listMessages(sessionID) {
      const entries = unwrap(
        await withOpencodeClientV2((client) =>
          client.session.messages({ sessionID }),
        ),
      );

      return entries.map(toAeroMessage);
    },

    async listTodos(sessionID) {
      return unwrap(
        await withOpencodeClientV2((client) =>
          client.session.todo({ sessionID }),
        ),
      );
    },

    async updateActiveModel(model, directory) {
      const config = unwrap(
        await withOpencodeClientV2((client) =>
          client.config.update({
            directory,
            config: {
              model,
            },
          }),
        ),
      );
      return config.model;
    },

    async any() {
      return unwrap(
        await withOpencodeClientV1((client) => client.config.get({})),
      );
    },

    async listTocs(sessionID) {
      const entries = unwrap(
        await withOpencodeClientV2((client) =>
          client.session.messages({ sessionID }),
        ),
      );

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
          const userText = msg.parts
            .filter((p) => p.type === 'text')
            .map((p) => (p.type === 'text' ? p.text : ''))
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
      return withOpencodeClientV2(async (client) => {
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
            case 'file':
              return `*[File: ${part.url}]*`;
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
      });
    },

    async archiveSession(sessionID) {
      const session = unwrap(
        await withOpencodeClientV2((client) =>
          client.session.update({
            sessionID,
            time: {
              archived: Date.now(),
            },
          }),
        ),
      );

      return toAeroSessionV2(session);
    },

    async archiveBulkSessions(sessionIDs) {
      const limit = pLimit(50);
      const archivedTime = Date.now();

      try {
        await withOpencodeClientV2((client) =>
          Promise.all(
            sessionIDs.map((sessionID) =>
              limit(async () => {
                await client.session.update({
                  sessionID,
                  time: {
                    archived: archivedTime,
                  },
                });
              }),
            ),
          ),
        );

        return true;
      } catch {
        return false;
      }
    },

    async unarchiveSession(sessionID) {
      const session = unwrap(
        await withOpencodeClientV2((client) =>
          client.session.update({
            sessionID,
            time: {
              archived: undefined,
            },
          }),
        ),
      );

      return toAeroSessionV2(session);
    },

    async unarchiveBulkSessions(sessionIDs) {
      const limit = pLimit(50);

      try {
        await withOpencodeClientV2((client) =>
          Promise.all(
            sessionIDs.map((sessionID) =>
              limit(async () => {
                await client.session.update({
                  sessionID,
                  time: {
                    archived: undefined,
                  },
                });
              }),
            ),
          ),
        );

        return true;
      } catch {
        return false;
      }
    },

    async getSessionContext(sessionID) {
      const entries = unwrap(
        await withOpencodeClientV2((client) =>
          client.session.messages({ sessionID }),
        ),
      );

      return toAeroSessionContextDetails(entries);
    },

    async forkSession(sessionID, messageID) {
      const session = unwrap(
        await withOpencodeClientV1((client) =>
          client.session.fork({
            path: { id: sessionID },
            body: {
              messageID,
            },
          }),
        ),
      );

      return toAeroSession(session);
    },

    async renameSession({ sessionId, title }) {
      const session = unwrap(
        await withOpencodeClientV2((client) =>
          client.session.update({
            sessionID: sessionId,
            title,
          }),
        ),
      );

      return toAeroSessionV2(session);
    },

    async sendMessage(sessionID, input) {
      await withOpencodeClientV2((client) =>
        client.session.promptAsync({
          sessionID,
          parts: input.parts.map((p) =>
            p.type === 'text'
              ? {
                  type: 'text',
                  text: p.text,
                }
              : (p as never),
          ),
          model: input.model
            ? {
                providerID: input.model.providerId,
                modelID: input.model.modelId,
              }
            : undefined,
          system: input.system,
          agent: input.agent,
        }),
      );

      return true;
    },

    async sendMessageSync(sessionID, input) {
      const { info, parts } = unwrap(
        await withOpencodeClientV2((client) =>
          client.session.prompt({
            sessionID,
            parts: input.parts.map((p) =>
              p.type === 'text'
                ? {
                    type: 'text',
                    text: p.text,
                  }
                : (p as never),
            ),
            model: input.model
              ? {
                  providerID: input.model.providerId,
                  modelID: input.model.modelId,
                }
              : undefined,
          }),
        ),
      );

      return toAeroMessage({ info, parts });
    },

    async abortSession(sessionID) {
      await withOpencodeClientV2(async (client) => {
        const session = unwrap(
          await client.session.get({
            sessionID,
          }),
        );

        await client.session.abort({
          sessionID,
        });

        await client.instance.dispose({
          directory: session.directory,
        });
      });

      return true;
    },

    async *streamEvents(options = {}): AsyncIterable<AeroEvent> {
      const { sessionId, signal, onConnected } = options;

      const { node } = await getOpencodeStreamingClientV2();

      console.log('[OPENCODE STREAM START]', {
        node: node.port,
        sessionId,
      });

      const controller = new AbortController();

      const abortFromCaller = () => {
        controller.abort();
      };

      signal?.addEventListener('abort', abortFromCaller, { once: true });

      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

      try {
        const url = new URL('/global/event', node.server.url);

        const response = await fetch(url, {
          headers: {
            Accept: 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `OpenCode event stream failed: ${response.status} ${response.statusText}`,
          );
        }

        if (!response.body) {
          throw new Error('OpenCode event stream has no response body');
        }

        reader = response.body.getReader();

        onConnected?.();

        const decoder = new TextDecoder();
        let buffer = '';

        while (!controller.signal.aborted) {
          const { value, done } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder
            .decode(value, { stream: true })
            .replace(/\r\n/g, '\n');

          let separatorIndex = buffer.indexOf('\n\n');

          while (separatorIndex !== -1 && !controller.signal.aborted) {
            const block = buffer.slice(0, separatorIndex);

            buffer = buffer.slice(separatorIndex + 2);

            const envelope = parseSseEventEnvelope<{
              id?: string;
              type?: string;
              properties?: Record<string, unknown>;
            }>(block);

            if (!envelope?.payload) {
              separatorIndex = buffer.indexOf('\n\n');
              continue;
            }

            const payload = envelope.payload;

            if (payload.type === 'sync') {
              separatorIndex = buffer.indexOf('\n\n');
              continue;
            }

            if (typeof payload.type !== 'string') {
              separatorIndex = buffer.indexOf('\n\n');
              continue;
            }

            const mapped = mapOpencodeEvent(payload as Event);

            if (!mapped) {
              separatorIndex = buffer.indexOf('\n\n');
              continue;
            }

            if (
              sessionId &&
              'sessionId' in mapped &&
              mapped.sessionId !== sessionId
            ) {
              separatorIndex = buffer.indexOf('\n\n');
              continue;
            }

            console.log('[OPENCODE AERO EVENT]', mapped);

            yield mapped;

            separatorIndex = buffer.indexOf('\n\n');
          }
        }
      } finally {
        signal?.removeEventListener('abort', abortFromCaller);

        controller.abort();

        try {
          await reader?.cancel();
        } catch {
          // Ignore cancellation errors.
        }
      }
    },
  };
}

function mapOpencodeEvent(event: Event): AeroEvent | null {
  void debugLog('OPENCODE', `RAW EVENT: ${event.type}`, event);

  switch (event.type) {
    case 'message.updated': {
      const { info } = event.properties;

      return {
        type: 'message.updated',
        sessionId: info.sessionID,
        message: toAeroMessage({
          info,
          parts: [],
        }),
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

    case 'message.part.delta': {
      const { sessionID, messageID, partID, field, delta } = event.properties;

      return {
        type: 'message.part.delta',
        sessionId: sessionID,
        messageId: messageID,
        partId: partID,
        field: field as 'text',
        delta,
      };
    }

    case 'message.part.removed': {
      const { sessionID, messageID, partID } = event.properties;

      return {
        type: 'message.part.removed',
        sessionId: sessionID,
        messageId: messageID,
        partId: partID,
      };
    }

    case 'message.removed': {
      const { sessionID, messageID } = event.properties;

      return {
        type: 'message.removed',
        sessionId: sessionID,
        messageId: messageID,
      };
    }

    case 'session.status': {
      const { sessionID, status } = event.properties;

      return {
        type: 'session.status',
        sessionId: sessionID,
        status,
      };
    }

    case 'session.updated': {
      const { info } = event.properties;

      return {
        type: 'session.updated',
        session: toAeroSessionV2(info),
      };
    }

    case 'session.idle':
      return {
        type: 'session.idle',
        sessionId: event.properties.sessionID,
      };

    case 'session.diff': {
      const { sessionID, diff } = event.properties;

      return {
        type: 'session.diff',
        sessionId: sessionID,
        diff,
      };
    }

    case 'session.error': {
      const error = event.properties.error as { message?: string } | undefined;

      console.log('[OPENCODE RAW ERROR]', JSON.stringify(event, null, 2));

      return {
        type: 'session.error',
        sessionId: event.properties.sessionID,
        error: error?.message ?? 'Unknown error',
      };
    }

    default:
      return null;
  }
}
