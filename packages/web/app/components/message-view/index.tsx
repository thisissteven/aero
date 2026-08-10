import { memo } from 'react';

import { AeroConversationTurn } from '@/server/services/harness/types';

import { AssistantChatBubble } from './assistant-chat-bubble';
import { UserChatBubble } from './user-chat-bubble';

export const MessageView = memo(function MessageView({
  turn,
}: {
  turn: AeroConversationTurn;
}) {
  const isUser = turn.role === 'user';

  if (isUser) {
    return <UserChatBubble turn={turn} />;
  }

  return <AssistantChatBubble turn={turn} />;
});
