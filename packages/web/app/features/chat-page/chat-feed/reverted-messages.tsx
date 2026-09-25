import { cn, Disclosure, IconButton, toast } from '@aero/ui';
import { ArrowUturnCcwRight, ChevronDown, CodeFork } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useSessionRuntime } from '@/app/features/chat-page/chat-feed/chat-store';
import {
  useForkSession,
  useRestoreAllMessages,
  useRevertSession,
} from '@/app/hooks/api/sessions';
import { useChatInputExpanded } from '@/app/hooks/api/settings';
import { useI18n } from '@/app/hooks/i18n';
import { restoreAllMessagesToast } from '@/app/lib/commands/restore-all-messages';
import { revertSessionToast } from '@/app/lib/commands/revert-session';
import { useSessionId } from '@/app/providers/SessionIdProvider';

export function RevertedMessages() {
  const sessionId = useSessionId();
  const { t } = useI18n();
  const revertedMessages = useSessionRuntime(
    sessionId,
    (runtime) => runtime.revertedMessages,
  );

  const { mutateAsync: forkSession } = useForkSession(undefined, sessionId);
  const { mutateAsync: restoreMessages } = useRestoreAllMessages(
    undefined,
    sessionId,
  );
  const { mutateAsync: revertSession } = useRevertSession(undefined, sessionId);

  const navigate = useNavigate();

  const [isExpanded, setIsExpanded] = useState(false);

  const isChatInputExpanded = useChatInputExpanded();

  if (revertedMessages.length === 0 || isChatInputExpanded) return null;

  return (
    <div className='@container relative'>
      <div className='mx-1 not-last:mb-2 @sm:mx-3'>
        <Disclosure
          isExpanded={isExpanded}
          onExpandedChange={setIsExpanded}
          className='border-separator bg-surface overflow-hidden rounded-xl border'
        >
          <Disclosure.Heading>
            <Disclosure.Trigger className='group w-full px-3 py-2 text-sm transition-colors'>
              <div className='flex items-center justify-between gap-2'>
                {t.chatFeed.revertedMessages(revertedMessages.length)}
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
            <div className='space-y-2 overflow-y-auto py-2 pr-2 pl-3'>
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
                            loading: t.chatFeed.forkingSession,
                            error: (err) => err.message,
                            success(session) {
                              navigate({ to: `/sessions/${session.id}` });
                              return t.chatFeed.sessionForked;
                            },
                          });
                        }}
                        isIconOnly={false}
                        svgSize='xs'
                        variant='secondary'
                        className='h-6.5'
                      >
                        <Icon data={CodeFork} />
                        {t.chatFeed.fork}
                      </IconButton>
                      <IconButton
                        onPress={() => {
                          if (index === revertedMessages.length - 1) {
                            restoreAllMessagesToast(restoreMessages, t);
                            return;
                          }

                          revertSessionToast(
                            () =>
                              revertSession(
                                revertedMessages[index + 1].messageId,
                              ),
                            t,
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
                        {t.common.restore}
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
