import { create, StoreApi, UseBoundStore } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { sessionKeys } from '@/app/hooks/api/sessions';
import { queryClient } from '@/app/providers';
import type {
  AeroConversationTurn,
  AeroPart,
  AeroTocItem,
} from '@/server/services/harness/types';

import { useGlobalChatStore } from './global-chat-store';
import { appendMessageToFlatList } from './helpers';
import type {
  ChatSessionState,
  FlatItem,
  RevertedMessage,
} from './streaming-demo-types';

type ChatStoreApi = UseBoundStore<StoreApi<ChatSessionState>>;
const sessionMap = new Map<string, ChatStoreApi>();

function createSessionStore(sessionId: string): ChatStoreApi {
  return create<ChatSessionState>()(
    immer((set, get) => ({
      sessionId,
      isStreaming: false,
      streamStartedAt: null,
      status: { type: 'idle' },
      flatItems: [],
      revertedMessages: [],
      groupFlatIndex: [],
      hasAwaitingQuestion: false,
      activeUserMessageId: null,
      lastAssistantTurnId: null,

      initFromMessages: (messages, revertMessageId) => {
        if (get().flatItems.length > 0) return;

        let items: FlatItem[] = [];
        let isFirstUser = true;
        let lastAssistantId: string | null = null;
        let hasPendingQuestion = false;

        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          const cleanedParts = msg.parts.filter(
            (p) => p.type !== 'step-start' && p.type !== 'step-finish',
          );

          for (const part of cleanedParts) {
            if (part.type === 'tool' && part.toolName === 'question') {
              if (part.status === 'pending') {
                hasPendingQuestion = true;
              }
            }
          }

          items = appendMessageToFlatList(
            items,
            { ...msg, parts: cleanedParts },
            isFirstUser,
            i < messages.length - 1 ? messages[i + 1].id : null,
          );

          if (msg.role === 'user' && cleanedParts.length > 0) {
            isFirstUser = false;
          }
          if (msg.role === 'assistant') {
            lastAssistantId = msg.id;
          }
        }

        set((state) => {
          state.flatItems = items;
          state.lastAssistantTurnId = lastAssistantId;
          state.hasAwaitingQuestion = hasPendingQuestion;
        });

        if (revertMessageId) {
          get().updateRevertedMessages(revertMessageId);
        }
      },

      updateRevertedMessages: (revertMessageId: string) => {
        set((state) => {
          const revertIndex = state.flatItems.findIndex(
            (item) =>
              item.type === 'user' && item.messageId === revertMessageId,
          );

          if (revertIndex === -1) {
            state.revertedMessages = [];
            return;
          }

          const truncated: RevertedMessage[] = [];
          for (let i = revertIndex; i < state.flatItems.length; i++) {
            const item = state.flatItems[i];
            if (item.type === 'user') {
              // Extract text from user turn parts for the preview snippet
              const textContent =
                item.turn.parts
                  ?.filter((p) => p.type === 'text')
                  .map((p) => ('text' in p ? p.text : ''))
                  .join('') || '';

              truncated.push({
                messageId: item.messageId,
                preview: textContent.slice(0, 100),
              });
            }
          }

          state.revertedMessages = truncated;
        });
      },

      setStatus: (status) => {
        set((state) => {
          state.status = status;
          state.isStreaming = status.type !== 'idle';
        });

        if (status.type === 'idle') {
          useGlobalChatStore.getState().removeRunningSession(sessionId);
        } else {
          useGlobalChatStore.getState().addRunningSession(sessionId);
        }
      },

      setStreaming: (isStreaming) => {
        set((state) => {
          state.isStreaming = isStreaming;
        });
      },

      appendOptimisticUserMessage: (text: string) => {
        const localId = `optimistic-${crypto.randomUUID()}`;
        const isFirst = get().flatItems.length === 0;
        const now = Date.now();

        set((state) => {
          if (isFirst) {
            state.flatItems.push({
              id: `user-spacer-${localId}`,
              type: 'user-spacer',
            });
          }

          state.flatItems.push({
            id: localId,
            type: 'user',
            messageId: localId,
            turn: {
              id: localId,
              role: 'user',
              parts: [{ type: 'text', text }],
            },
            forkMessageId: localId,
            createdAt: now,
          } as Extract<FlatItem, { type: 'user' }>);

          state.flatItems.push({
            id: `user-footer-${localId}`,
            type: 'user-footer',
            messageId: localId,
            status: 'optimistic',
            text,
            createdAt: now,
          });

          state.isStreaming = true;
          state.streamStartedAt = now;
          state.activeUserMessageId = localId;
        });

        useGlobalChatStore.getState().addRunningSession(sessionId);
        return localId;
      },

      removeOptimisticUserMessage: (localMessageId: string) => {
        set((state) => {
          state.flatItems = state.flatItems.filter((item) => {
            if ('messageId' in item && item.messageId === localMessageId) {
              return false;
            }
            if (item.id === `user-spacer-${localMessageId}`) {
              return false;
            }
            return true;
          });

          if (state.activeUserMessageId === localMessageId) {
            state.activeUserMessageId = null;
          }
        });
      },

      handleSendError: (errorMsg) => {
        const activeId = get().activeUserMessageId;
        if (!activeId) {
          set((state) => {
            state.isStreaming = false;
          });
          useGlobalChatStore.getState().removeRunningSession(sessionId);
          return;
        }

        set((state) => {
          const footerItem = state.flatItems.find(
            (item): item is Extract<FlatItem, { type: 'user-footer' }> =>
              item.type === 'user-footer' && item.messageId === activeId,
          );

          if (footerItem) {
            footerItem.status = 'error';
            footerItem.text = errorMsg || 'Failed to send message';
          }

          state.isStreaming = false;
        });

        useGlobalChatStore.getState().removeRunningSession(sessionId);
        useGlobalChatStore.getState().addUnreadSession(sessionId, 'error');
      },

      handleStreamEvent: (event, revertMessageId?: string) => {
        const globalStore = useGlobalChatStore.getState();

        switch (event.type) {
          case 'session.updated': {
            queryClient.invalidateQueries({
              queryKey: sessionKeys.detail(undefined, sessionId),
            });
            break;
          }

          case 'session.status': {
            set((state) => {
              state.status = event.status;
              state.isStreaming = event.status.type !== 'idle';
            });

            if (event.status.type !== 'idle') {
              globalStore.addRunningSession(sessionId);
            }
            break;
          }

          case 'session.idle': {
            set((state) => {
              const lastTurnId = state.lastAssistantTurnId;

              if (lastTurnId) {
                const footerExists = state.flatItems.some(
                  (i) =>
                    i.type === 'assistant-footer' && i.turnId === lastTurnId,
                );

                if (!footerExists) {
                  const textResponse = state.flatItems
                    .filter(
                      (i): i is Extract<FlatItem, { type: 'assistant-part' }> =>
                        i.type === 'assistant-part' &&
                        i.turnId === lastTurnId &&
                        i.part.type === 'text',
                    )
                    .map((p) => (p.part.type === 'text' ? p.part.text : ''))
                    .join('');

                  state.flatItems.push({
                    id: `assistant-footer-${lastTurnId}`,
                    type: 'assistant-footer',
                    turnId: lastTurnId,
                    createdAt: Date.now(),
                    textResponse,
                    nextTurnId: '',
                  });
                }
              }

              state.isStreaming = false;
              state.status = { type: 'idle' };
            });

            globalStore.removeRunningSession(sessionId);
            globalStore.addUnreadSession(sessionId, 'success');

            queryClient.invalidateQueries({
              queryKey: sessionKeys.context(undefined, sessionId),
            });
            break;
          }

          case 'message.updated': {
            if (event.message.role === 'user') {
              const realId = event.message.id;

              set((state) => {
                const activeId = state.activeUserMessageId;
                const userItem = state.flatItems.find(
                  (item): item is Extract<FlatItem, { type: 'user' }> =>
                    item.type === 'user' &&
                    (item.messageId === activeId || item.messageId === realId),
                );

                if (userItem) {
                  userItem.messageId = realId;
                  userItem.forkMessageId = realId;
                  userItem.turn = event.message;
                }

                const footer = state.flatItems.find(
                  (item): item is Extract<FlatItem, { type: 'user-footer' }> =>
                    item.type === 'user-footer' &&
                    (item.messageId === activeId || item.messageId === realId),
                );

                if (footer) {
                  footer.messageId = realId;
                  footer.status = 'actual';
                }

                state.activeUserMessageId = realId;
              });
            } else if (event.message.role === 'assistant') {
              if (
                event.message.parts?.some(
                  (p: AeroPart) =>
                    p.type === 'step-start' || p.type === 'step-finish',
                )
              ) {
                return;
              }

              const turnId = event.message.id;

              set((state) => {
                if (state.lastAssistantTurnId !== turnId) {
                  state.flatItems.push({
                    id: `assistant-spacer-${turnId}`,
                    type: 'assistant-spacer',
                    turnId,
                  });
                  state.lastAssistantTurnId = turnId;
                }
              });
            }
            break;
          }

          case 'message.part.updated': {
            const { part, messageId } = event;
            if (part.type === 'step-start' || part.type === 'step-finish')
              return;

            const { flatItems, activeUserMessageId } = get();
            const lastItem = flatItems[flatItems.length - 1];

            const isUser =
              lastItem?.type === 'user' &&
              messageId === activeUserMessageId &&
              part.type === 'text';

            if (isUser) {
              const textContent = part.text ?? '';

              queryClient.setQueryData(
                sessionKeys.toc(undefined, sessionId),
                (old: AeroTocItem[] = []) => {
                  const existing = old.find((item) => item.id === messageId);
                  if (existing) {
                    existing.label = textContent;
                    return [...old];
                  }
                  return [
                    ...old,
                    {
                      id: messageId,
                      label: textContent,
                      groupIndex: old.length,
                    },
                  ];
                },
              );

              set((state) => {
                let userItem: Extract<FlatItem, { type: 'user' }> | undefined;
                for (let i = state.flatItems.length - 1; i >= 0; i--) {
                  const item = state.flatItems[i];
                  if (item.type === 'user' && item.messageId === messageId) {
                    userItem = item as Extract<FlatItem, { type: 'user' }>;
                    break;
                  }
                }

                if (userItem) {
                  userItem.turn = {
                    ...userItem.turn,
                    parts: [{ type: 'text', text: textContent }],
                  } as Extract<AeroConversationTurn, { type: 'user' }>;
                }
              });

              return;
            }

            // Handle Question Status (pending vs completed/done)
            const isQuestionPart =
              part.type === 'tool' && part.toolName === 'question';

            set((state) => {
              if (isQuestionPart) {
                if (part.status === 'pending') {
                  state.hasAwaitingQuestion = true;
                } else if (part.status === 'completed') {
                  state.hasAwaitingQuestion = false;
                }
              }

              const existingPart = state.flatItems.find(
                (item): item is Extract<FlatItem, { type: 'assistant-part' }> =>
                  item.type === 'assistant-part' && item.partId === part.id,
              );

              if (existingPart) {
                Object.assign(existingPart.part, part);
              } else {
                state.flatItems.push({
                  id: `part-${part.id}`,
                  type: 'assistant-part',
                  turnId: messageId,
                  partId: part.id,
                  part,
                  isPartStreaming: true,
                  isLastPartInTurn: false,
                });
              }
            });
            break;
          }
        }

        if (revertMessageId) {
          get().updateRevertedMessages(revertMessageId);
        }
      },
    })),
  );
}

export function getSessionStore(sessionId: string): ChatStoreApi {
  if (!sessionMap.has(sessionId)) {
    sessionMap.set(sessionId, createSessionStore(sessionId));
  }
  return sessionMap.get(sessionId)!;
}

export function useChatStore<T>(
  sessionId: string,
  selector: (state: ChatSessionState) => T,
): T {
  const store = getSessionStore(sessionId);
  return store(selector);
}
