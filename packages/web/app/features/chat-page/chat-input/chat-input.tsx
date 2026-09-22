import { cn, PromptInput } from '@aero/ui';

import { SmartComposer } from '@/app/components/smart-composer/smart-composer';
import {
  getComposerSession,
  useComposerStore,
} from '@/app/components/smart-composer/smart-composer-store';
import { AttachmentsButton } from '@/app/features/chat-page/chat-input/attachments-button';
import { ModelAgentDropdownTrigger } from '@/app/features/chat-page/chat-input/models/model-agent/model-agent-dropdown-trigger';
import { ActiveSessionPromptInputWrapper } from '@/app/features/chat-page/chat-input/prompt-input-wrapper';
import { AutoAcceptPermissionsToggleButton } from '@/app/features/chat-page/chat-input/toggle-buttons/auto-accept-permissions';
import { ChatInputExpandedToggleButton } from '@/app/features/chat-page/chat-input/toggle-buttons/chat-input-expanded';
import { GoalModeToggleButton } from '@/app/features/chat-page/chat-input/toggle-buttons/goal-mode';
import { VariantsDropdown } from '@/app/features/chat-page/chat-input/variants-dropdown';
import { AgentDropdown } from './agent-dropdown';
import { ModelDropdown } from './models/model-dropdown';
import { SendButton } from './send-button';

export function ChatInput({
  isDisabled,
  sessionId,
}: {
  isDisabled: boolean;
  sessionId: string;
}) {
  const isShellMode = useComposerStore(
    (state) => getComposerSession(state, sessionId).mode === 'shell',
  );

  return (
    <ActiveSessionPromptInputWrapper isDisabled={isDisabled}>
      <PromptInput.Shell
        className={cn(
          'border-separator @container relative border',
          isShellMode && 'border-separator dark:border-separator',
        )}
        inert={isDisabled}
      >
        <div className='absolute top-2 right-2'>
          <ChatInputExpandedToggleButton sessionId={sessionId} />
        </div>

        <PromptInput.Content>
          <SmartComposer />
        </PromptInput.Content>

        <PromptInput.Toolbar>
          <PromptInput.ToolbarStart className='gap-1'>
            <AttachmentsButton />
            <AutoAcceptPermissionsToggleButton sessionId={sessionId} />
            <GoalModeToggleButton sessionId={sessionId} />
          </PromptInput.ToolbarStart>

          <PromptInput.ToolbarEnd>
            <div className='flex'>
              {!isDisabled && (
                <>
                  <div className='@md:hidden'>
                    <ModelAgentDropdownTrigger />
                  </div>
                  <div className='flex @max-md:hidden'>
                    <ModelDropdown />
                    <VariantsDropdown />
                    <AgentDropdown />
                  </div>
                </>
              )}
            </div>
            <SendButton />
          </PromptInput.ToolbarEnd>
        </PromptInput.Toolbar>
      </PromptInput.Shell>
    </ActiveSessionPromptInputWrapper>
  );
}
