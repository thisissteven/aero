import { memo } from 'react';

import { AssistantChatBubble } from '@/app/components/message-view/unused/assistant-chat-bubble';
import { UserChatBubble } from '@/app/components/message-view/user-chat-bubble';
import { AeroConversationTurn } from '@/server/services/harness/types';

export const MessageView = memo(function MessageView({
  turn,
  isStreaming,
}: {
  turn: AeroConversationTurn;
  isStreaming: boolean;
}) {
  const isUser = turn.role === 'user';

  if (isUser) {
    return <UserChatBubble turn={turn} />;
  }

  return <AssistantChatBubble turn={turn} isStreaming={isStreaming} />;
});
