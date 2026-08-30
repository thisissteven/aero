import { ArrowUturnCcwRight, ChevronDown, CodeFork } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';

import { cn, Disclosure, toast } from '@aero/ui';

import { IconButton } from '@/app/components/ui/icon-button';
import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import {
  sessionKeys,
  useForkSession,
  useRestoreAllMessages,
  useRevertSession,
} from '@/app/hooks/api/sessions';
import { queryClient } from '@/app/providers';

export function RevertedMessages() {
  const revertedMessages = useChatStore((state) => state.revertedMessages);

  const { sessionId } = useParams({
    strict: false,
  });

  const { mutateAsync: forkSession } = useForkSession(undefined, sessionId);
  const { mutateAsync: restoreMessages } = useRestoreAllMessages(
    undefined,
    sessionId,
  );
  const { mutateAsync: revertSession } = useRevertSession(undefined, sessionId);

  const navigate = useNavigate();

  const [isExpanded, setIsExpanded] = useState(false);

  if (revertedMessages.length === 0) return null;

  return (
    <div className='@container relative mx-auto w-full max-w-[720px]'>
      <div className='mx-1 mb-2 @sm:mx-3'>
        <Disclosure
          isExpanded={isExpanded}
          onExpandedChange={setIsExpanded}
          className='border-separator bg-surface overflow-hidden rounded-xl border'
        >
          <Disclosure.Heading>
            <Disclosure.Trigger className='group hover:bg-default w-full px-3 py-2 text-sm transition-colors'>
              <div className='flex items-center justify-between gap-2'>
                Reverted messages: {revertedMessages.length}
                <Icon
                  data={ChevronDown}
                  className={cn(
                    'text-foreground/50 group-hover:text-foreground transition',
                    isExpanded && 'rotate-180',
                  )}
                />
              </div>
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <div className='max-h-[min(20vh,100px)] scrollbar-thin space-y-2 overflow-y-auto py-2 pr-2 pl-3'>
              {revertedMessages.map((message, index) => {
                return (
                  <div
                    key={message.messageId}
                    className='flex items-center justify-between gap-2'
                  >
                    <span className='truncate text-sm'>{message.preview}</span>
                    <div className='flex shrink-0 items-center gap-2'>
                      <IconButton
                        onPress={() => {
                          toast.promise(forkSession(message.messageId), {
                            loading: 'Forking session...',
                            error: (err) => err.message,
                            success(session) {
                              navigate({ to: `/sessions/${session.id}` });
                              return 'Session forked successfully';
                            },
                          });
                        }}
                        isIconOnly={false}
                        svgSize='xs'
                        variant='secondary'
                        className='h-6.5'
                      >
                        <Icon data={CodeFork} />
                        Fork
                      </IconButton>
                      <IconButton
                        onPress={() => {
                          if (index === revertedMessages.length - 1) {
                            toast.promise(restoreMessages(), {
                              loading: 'Restoring messages...',
                              error: (err) => err.message,
                              success: () => {
                                queryClient.invalidateQueries({
                                  queryKey: sessionKeys.toc(
                                    undefined,
                                    sessionId,
                                  ),
                                });
                                return 'Messages restored successfully';
                              },
                            });
                            return;
                          }
                          toast.promise(
                            revertSession(
                              revertedMessages[index + 1].messageId,
                            ),
                            {
                              loading: 'Restoring messages...',
                              error: (err) => err.message,
                              success: () => {
                                queryClient.invalidateQueries({
                                  queryKey: sessionKeys.toc(
                                    undefined,
                                    sessionId,
                                  ),
                                });
                                return 'Messages restored successfully';
                              },
                            },
                          );
                        }}
                        isIconOnly={false}
                        svgSize='xs'
                        variant='secondary'
                        className='h-6.5'
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
            </div>
          </Disclosure.Content>
        </Disclosure>
      </div>
    </div>
  );
}
