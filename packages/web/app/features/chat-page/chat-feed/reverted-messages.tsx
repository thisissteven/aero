import { ArrowUturnCcwRight, ChevronDown, CodeFork } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { Disclosure } from '@aero/ui';

import { IconButton } from '@/app/components/ui/icon-button';

export function RevertedMessages({
  revertedMessages,
}: {
  revertedMessages: {
    preview: string;
    messageId: string;
  }[];
}) {
  return (
    <div className='relative mx-auto w-full max-w-[720px]'>
      <div className='mx-5 mb-2 md:mx-3'>
        <Disclosure className='border-separator bg-surface overflow-hidden rounded-xl border'>
          <Disclosure.Heading>
            <Disclosure.Trigger className='group hover:bg-default w-full px-3 py-2 text-sm transition-colors'>
              <div className='flex items-center justify-between gap-2'>
                Reverted messages: {revertedMessages.length}
                <Icon
                  data={ChevronDown}
                  className='text-foreground/50 group-hover:text-foreground transition-colors'
                />
              </div>
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body className='pl-1'>
              {revertedMessages.map((message) => {
                return (
                  <div
                    key={message.messageId}
                    className='flex items-center justify-between gap-2'
                  >
                    <span className='text-sm'>{message.preview}</span>
                    <div className='flex items-center gap-2'>
                      <IconButton
                        // onPress={() => toggleOpenRightPanel('context')}
                        isIconOnly={false}
                        svgSize='xs'
                        variant='secondary'
                      >
                        <Icon data={CodeFork} />
                        Fork
                      </IconButton>
                      <IconButton
                        // onPress={() => toggleOpenRightPanel('context')}
                        isIconOnly={false}
                        svgSize='xs'
                        variant='secondary'
                      >
                        <Icon
                          data={ArrowUturnCcwRight}
                          className='scale-x-[-1] rotate-180'
                        />
                        Restore
                      </IconButton>
                    </div>
                  </div>
                );
              })}
            </Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>
      </div>
    </div>
  );
}
