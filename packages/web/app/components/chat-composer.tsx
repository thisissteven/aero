import { ArrowUp, Globe, Paperclip } from '@gravity-ui/icons';

import { Button, ListBox, Select, TextArea } from '@aero/ui';

import { CHAT_MODELS } from '../data/chat';

export interface ChatComposerProps {
  modelId?: string;
  placeholder?: string;
  className?: string;
}

export function ChatComposer({
  className,
  modelId = CHAT_MODELS[0]?.id ?? 'gpt-5.4',
  placeholder = 'What do you want to know?',
}: ChatComposerProps) {
  return (
    <div className={className}>
      <div className='relative w-full'>
        <TextArea
          fullWidth
          className='min-h-[112px] resize-none pb-12'
          placeholder={placeholder}
        />

        <div className='absolute right-3 bottom-4 left-3 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Button
              isIconOnly
              aria-label='Attach file'
              size='sm'
              variant='tertiary'
            >
              <Paperclip className='size-4' />
            </Button>
            <Select
              aria-label='Model'
              className='w-[200px]'
              defaultValue={modelId}
              placeholder='Select model'
              variant='secondary'
            >
              <Select.Trigger className='flex items-center gap-2'>
                <Globe className='size-4 shrink-0' />
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {CHAT_MODELS.map((model) => (
                    <ListBox.Item
                      key={model.id}
                      id={model.id}
                      textValue={model.label}
                    >
                      {model.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
          <Button isIconOnly aria-label='Send message' size='sm'>
            <ArrowUp className='size-4' />
          </Button>
        </div>
      </div>
    </div>
  );
}
