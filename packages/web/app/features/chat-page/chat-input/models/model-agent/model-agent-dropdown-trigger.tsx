import { Button } from '@aero/ui';

import { ProviderLogo } from '@/app/components/provider-logo';
import { useChatSettingsStore } from '@/app/features/chat-page/chat-input/chat-settings-store';
import { useSelectedModel } from '@/app/features/chat-page/chat-input/models/use-selected-model';

export function ModelAgentDropdownTrigger() {
  const selectedModel = useSelectedModel();

  const setIsOpen = useChatSettingsStore(
    (state) => state.setModelAgentSheetOpen,
  );

  return (
    <Button
      variant='ghost'
      size='sm'
      className='max-w-full gap-1.5 rounded-lg text-xs group-data-[disabled=true]/prompt-input:pointer-events-none group-data-[disabled=true]/prompt-input:opacity-60'
      onPress={() => setIsOpen(true)}
    >
      {selectedModel && (
        <ProviderLogo
          providerId={selectedModel.providerId}
          alt={selectedModel.model.name}
          className='size-3.5'
        />
      )}

      {selectedModel?.model.name ?? (
        <span className='text-muted'>Select model</span>
      )}
    </Button>
  );
}
