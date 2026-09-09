import { cn, PromptInput } from '@aero/ui';

import { SmartComposer } from '@/app/components/smart-composer/smart-composer';
import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';

export function PromptInputContent() {
  const isChatMode = useNewSessionStore((state) => state.state === 'chat');

  return (
    <PromptInput.Content>
      <SmartComposer
        enabledClassName={cn(
          isChatMode
            ? 'h-[calc(100vh-152px)] max-h-[calc(100vh-152px)]'
            : 'h-[calc(100vh-172px)] max-h-[calc(100vh-172px)]',
        )}
      />
    </PromptInput.Content>
  );
}
