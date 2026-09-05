import { Check } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useMemo } from 'react';

import { Command } from '@aero/ui';

import { capitalizeFirstLetter } from '@/app/lib/file';

import { useChatSettingsStore } from './chat-settings-store';

export function VariantsPicker({
  onVariantSelect,
}: {
  onVariantSelect?: () => void;
}) {
  const selectedModel = useChatSettingsStore((state) => state.selectedModel);
  const selectedVariant = useChatSettingsStore(
    (state) => state.selectedVariant,
  );
  const setSelectedVariant = useChatSettingsStore(
    (state) => state.setSelectedVariant,
  );

  const variants = useMemo(() => {
    return Object.keys(selectedModel?.model.variants ?? {});
  }, [selectedModel]);

  return (
    <Command>
      <Command.Dialog
        filter={() => true}
        className='rounded-none border-none bg-transparent shadow-none'
      >
        {variants.length === 0 ? (
          <div className='text-muted flex h-24 items-center justify-center text-sm'>
            No variants found.
          </div>
        ) : (
          <Command.List className='max-h-60 scroll-py-1 overflow-y-auto'>
            <Command.Group heading='Thinking Variants'>
              {variants.map((variant) => (
                <Command.Item
                  key={variant}
                  textValue={variant}
                  onAction={() => {
                    setSelectedVariant(variant);
                    onVariantSelect?.();
                  }}
                >
                  <div className='flex min-w-0 flex-1 flex-col'>
                    <span className='truncate'>
                      {capitalizeFirstLetter(variant)}
                    </span>
                  </div>

                  {variant === selectedVariant && (
                    <Icon data={Check} className='size-4 shrink-0' />
                  )}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        )}
      </Command.Dialog>
    </Command>
  );
}
