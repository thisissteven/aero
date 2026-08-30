import { ChevronDown } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { Button, Sheet } from '@aero/ui';

import { capitalizeFirstLetter } from '@/app/lib/file';

import { AgentPicker, getAgentIconData } from './agents/agent-picker';
import { useChatSettingsStore } from './chat-settings-store';
import { ModelPicker } from './models/model-picker';

export function ModelAgentDropdownSheet({
  container,
}: {
  container: HTMLDivElement;
}) {
  const isOpen = useChatSettingsStore((state) => state.modelAgentSheetOpen);

  const setIsOpen = useChatSettingsStore(
    (state) => state.setModelAgentSheetOpen,
  );

  const selection = useChatSettingsStore(
    (state) => state.modelAgentSheetSelection,
  );

  const setSelection = useChatSettingsStore(
    (state) => state.setModelAgentSheetSelection,
  );

  return (
    <Sheet
      container={container}
      isOpen={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);

        if (!open) {
          setSelection('agent');
        }
      }}
    >
      <Sheet.Backdrop>
        <Sheet.Content className='m-2 max-h-[calc(100vh-56px-16px)]'>
          <Sheet.Dialog className='h-full rounded-xl pb-0.5'>
            <div className='relative'>
              <div className='bg-default pointer-events-none absolute top-1/2 left-1/2 h-1.25 w-10 -translate-x-1/2 rounded-full' />

              <Sheet.Handle
                style={{
                  visibility: 'hidden',
                }}
              />
            </div>

            <Sheet.Body className='flex min-h-0 flex-col gap-0 overflow-hidden p-0'>
              <div className='border-separator flex gap-2 border-b p-2 pl-3'>
                <Button
                  variant={selection === 'agent' ? 'secondary' : 'outline'}
                  className='w-fit rounded-lg text-sm'
                  onPress={() => setSelection('agent')}
                >
                  Agent
                </Button>

                <Button
                  variant={selection === 'model' ? 'secondary' : 'outline'}
                  className='w-fit rounded-lg text-sm'
                  onPress={() => setSelection('model')}
                >
                  Model
                </Button>
              </div>

              {selection === 'model' ? (
                <ModelPicker
                  onModelSelect={() => {
                    setIsOpen(false);
                  }}
                />
              ) : (
                <AgentPicker
                  onAgentSelect={() => {
                    setIsOpen(false);
                  }}
                />
              )}
            </Sheet.Body>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
  );
}

export function ModelAgentDropdownTrigger() {
  const selectedAgent = useChatSettingsStore((state) => state.selectedAgent);

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
      <Icon data={getAgentIconData(selectedAgent?.name)} className='size-3.5' />

      {selectedAgent?.name
        ? capitalizeFirstLetter(selectedAgent.name)
        : 'Select Agent'}

      <Icon data={ChevronDown} className='size-3' />
    </Button>
  );
}
