import type { AeroConversationTurn } from '@/server/services/harness/types';

import type { FlatItem } from './streaming-demo-types';

export function getLastUserTimestamp(flatItems: FlatItem[]): number {
  for (let i = flatItems.length - 1; i >= 0; i--) {
    const item = flatItems[i];
    if (
      (item.type === 'user' || item.type === 'user-footer') &&
      item.createdAt
    ) {
      return item.createdAt;
    }
  }
  return Date.now();
}

export function buildGroupFlatIndex(flatItems: FlatItem[]): number[] {
  const indices: number[] = [];

  for (let i = 0; i < flatItems.length; i++) {
    const item = flatItems[i];
    // Each user item or user-spacer marks the start of a new turn group
    if (item.type === 'user-spacer' || item.type === 'user') {
      if (item.type === 'user-spacer') {
        indices.push(i);
      } else if (
        i === 0 ||
        (flatItems[i - 1].type !== 'user-spacer' &&
          flatItems[i - 1].type !== 'user')
      ) {
        indices.push(i);
      }
    }
  }

  return indices;
}

export function appendMessageToFlatList(
  flatItems: FlatItem[],
  message: AeroConversationTurn,
  isFirstMessageInSession: boolean,
  nextTurnId: string | null,
): FlatItem[] {
  const next = [...flatItems];

  if (message.role === 'user') {
    const textPart = message.parts.find((p) => p.type === 'text');
    const text = textPart?.type === 'text' ? textPart.text : '';

    // 1. If type user, check if chat item is of index 0; if valid, append user spacer
    if (isFirstMessageInSession && text.trim().length > 0) {
      next.push({
        id: `user-spacer-${message.id}`,
        type: 'user-spacer',
      });
    }

    // 2. If user text isn't empty, append user message
    if (text.trim().length > 0) {
      next.push({
        id: message.id,
        type: 'user',
        messageId: message.id,
        forkMessageId: message.id,
        turn: message,
        createdAt: message.createdAt,
      });
    }

    // 3. Append user footer
    next.push({
      id: `user-footer-${message.id}`,
      type: 'user-footer',
      messageId: message.id,
      status: 'actual',
      text,
      createdAt: message.createdAt,
    });
  } else if (message.role === 'assistant') {
    const turnId = message.id;

    // Filter backend delimiter parts ('start' / 'end')
    const validParts = message.parts.filter(
      (p) => p.type !== 'step-start' && p.type !== 'step-finish',
    );

    if (validParts.length > 0) {
      // Part message details
      validParts.forEach((part) => {
        next.push({
          id: `part-${part.id}`,
          type: 'assistant-part',
          turnId,
          partId: part.id,
          isLastPartInTurn: part.id === validParts[validParts.length - 1].id,
          isPartStreaming: false,
          part,
        });
      });
    }

    // Error part check
    if (message.error) {
      next.push({
        id: `assistant-error-${turnId}`,
        type: 'assistant-error',
        turnId,
        errorType:
          message.error.name === 'MessageAbortedError'
            ? 'message_aborted'
            : 'generic',
        message: message.error.data?.message || 'An error occurred.',
      });
    }

    // Assistant footer
    const textResponse = validParts
      .filter((p) => p.type === 'text')
      .map((p) => p.text)
      .join('\n');

    next.push({
      id: `assistant-footer-${turnId}`,
      type: 'assistant-footer',
      turnId,
      createdAt: message.createdAt,
      textResponse,
      providerID: message.providerID,
      modelID: message.modelID,
      agent: message.agent,
      mode: message.mode,
      nextTurnId: nextTurnId ?? '',
    });
  }

  return next;
}
