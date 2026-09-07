import { PromptInput } from '@aero/ui';

import { SmartComposer } from '@/app/components/smart-composer/smart-composer';
import { ModelAgentDropdownTrigger } from '@/app/features/chat-page/chat-input/model-agent-dropdown';
import { ActiveSessionPromptInputWrapper } from '@/app/features/chat-page/chat-input/prompt-input-wrapper';
import { AutoAcceptPermissionsToggleButton } from '@/app/features/chat-page/chat-input/toggle-buttons/auto-accept-permissions';
import { ChatInputExpandedToggleButton } from '@/app/features/chat-page/chat-input/toggle-buttons/chat-input-expanded';
import { GoalModeToggleButton } from '@/app/features/chat-page/chat-input/toggle-buttons/goal-mode';
import { VariantsDropdown } from '@/app/features/chat-page/chat-input/variants-dropdown';

import { AgentDropdown } from './agent-dropdown';
import { ModelDropdown } from './model-dropdown';
import { SendButton } from './send-button';
import { VoiceInputButton } from './voice-input-button';

export function ChatInput({
  isDisabled,
  sessionId,
}: {
  isDisabled: boolean;
  sessionId: string;
}) {
  return (
    <ActiveSessionPromptInputWrapper isDisabled={isDisabled}>
      <PromptInput.Shell className='@container relative'>
        <div className='absolute top-2 right-2'>
          <ChatInputExpandedToggleButton sessionId={sessionId} />
        </div>

        <PromptInput.Content>
          <SmartComposer />
        </PromptInput.Content>

        <PromptInput.Toolbar>
          <PromptInput.ToolbarStart className='items-end justify-start gap-1'>
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
                    <VariantsDropdown />
                    <ModelDropdown />
                    <AgentDropdown />
                  </div>
                </>
              )}
              <VoiceInputButton />
            </div>
            <SendButton />
          </PromptInput.ToolbarEnd>
        </PromptInput.Toolbar>
      </PromptInput.Shell>
    </ActiveSessionPromptInputWrapper>
  );
}
