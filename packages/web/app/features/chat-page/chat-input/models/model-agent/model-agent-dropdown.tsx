import { Button, Sheet } from '@aero/ui';

import { VariantsPicker } from '@/app/features/chat-page/chat-input/variants-picker';
import { useI18n } from '@/app/hooks/i18n';

import { AgentPicker } from '../../agents/agent-picker';
import { useChatSettingsStore } from '../../chat-settings-store';
import { ModelPicker } from '../model-picker';

export function ModelAgentDropdownSheet({
  container,
}: {
  container: HTMLDivElement;
}) {
  const { t } = useI18n();
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
              <div className='border-separator flex gap-1 border-b p-2 pl-3'>
                <Button
                  variant={selection === 'agent' ? 'secondary' : 'ghost'}
                  className='w-fit rounded-lg text-sm'
                  onPress={() => setSelection('agent')}
                >
                  {t.modelPicker.agent}
                </Button>

                <Button
                  variant={selection === 'model' ? 'secondary' : 'ghost'}
                  className='w-fit rounded-lg text-sm'
                  onPress={() => setSelection('model')}
                >
                  {t.modelPicker.model}
                </Button>

                <Button
                  variant={selection === 'variant' ? 'secondary' : 'ghost'}
                  className='w-fit rounded-lg text-sm'
                  onPress={() => setSelection('variant')}
                >
                  {t.modelPicker.variant}
                </Button>
              </div>

              {selection === 'model' ? (
                <ModelPicker />
              ) : selection === 'agent' ? (
                <AgentPicker />
              ) : (
                <VariantsPicker />
              )}
            </Sheet.Body>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
  );
}
