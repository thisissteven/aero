import { Check, Magnifier, Sparkles } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useMemo, useState } from 'react';

import { Button, Command, Popover } from '@aero/ui';

import { capitalizeFirstLetter } from '@/server/shared';

import { useChatSettingsStore } from './chat-settings-store';

export function VariantsDropdown() {
  const selectedModel = useChatSettingsStore((state) => state.selectedModel);
  const selectedVariant = useChatSettingsStore(
    (state) => state.selectedVariant,
  );
  const setSelectedVariant = useChatSettingsStore(
    (state) => state.setSelectedVariant,
  );

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const variants = useMemo(() => {
    return Object.keys(selectedModel?.model.variants ?? {});
  }, [selectedModel]);

  const filteredVariants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return variants.filter((key) => key.toLowerCase().includes(query));
  }, [variants, searchQuery]);

  if (variants.length === 0) return null;

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button
        variant='ghost'
        size='sm'
        className='gap-1.5 rounded-lg px-2 text-xs group-data-[disabled=true]/prompt-input:pointer-events-none group-data-[disabled=true]/prompt-input:opacity-60'
      >
        <Icon data={Sparkles} className='size-3.5' />

        {selectedVariant
          ? capitalizeFirstLetter(selectedVariant)
          : 'Select Variant'}
      </Button>

      <Popover.Content className='w-48 rounded-xl p-0' placement='top right'>
        <Command>
          <Command.Dialog
            filter={() => true}
            className='border-none bg-transparent shadow-none'
            allowEscape
          >
            <Command.InputGroup>
              <Command.InputGroup.Prefix>
                <Icon data={Magnifier} />
              </Command.InputGroup.Prefix>

              <Command.InputGroup.Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className='py-2.5 pr-0 text-sm'
                placeholder='Search variants...'
                aria-hidden
              />

              <Command.InputGroup.ClearButton
                onPress={() => setSearchQuery('')}
              />
            </Command.InputGroup>

            {filteredVariants.length === 0 ? (
              <div className='text-muted flex h-24 items-center justify-center text-sm'>
                No variants found.
              </div>
            ) : (
              <Command.List className='max-h-60 scroll-py-1 overflow-y-auto'>
                <Command.Group heading='Thinking Variants'>
                  {filteredVariants.map((variant) => (
                    <Command.Item
                      key={variant}
                      textValue={variant}
                      onAction={() => {
                        setSelectedVariant(variant);
                        setIsOpen(false);
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
      </Popover.Content>
    </Popover>
  );
}
