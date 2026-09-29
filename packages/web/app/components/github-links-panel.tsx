import { cn, IconButton, Popover } from '@aero/ui';
import {
  ArrowUpRightFromSquare,
  CircleTree,
  LogoGithub,
  TrashBin,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import React from 'react';

import {
  getExternalPartsSession,
  useExternalPartsStore,
} from '@/app/features/chat-page/chat-input/external-parts-store';
import { useChatInputExpanded } from '@/app/hooks/api/settings';
import { useI18n } from '@/app/hooks/i18n';
import { useOptionalSessionId } from '@/app/providers/SessionIdProvider';

export const GithubLinksPanel = React.memo(function GithubLinksPanel() {
  // New-session pages have no route id; the composer stores under the
  // literal `'undefined'` key.
  const sessionId = useOptionalSessionId() ?? 'undefined';
  const { t } = useI18n();
  const isChatInputExpanded = useChatInputExpanded();

  const links = useExternalPartsStore(
    (state) => getExternalPartsSession(state, sessionId).githubLinks,
  );
  const removeGithubLink = useExternalPartsStore(
    (state) => state.removeGithubLink,
  );

  if (links.length === 0 || isChatInputExpanded) {
    return null;
  }

  return (
    <Popover>
      <Popover.Trigger
        className={cn(
          'mb-1.5 mx-2',
          'border-separator backdrop-blur-sm inline-flex w-fit items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs',
        )}
      >
        <Icon data={LogoGithub} size={14} />
        <span>{t.chatInput.linkedGithub}</span>
        <span className='bg-accent/15 text-accent rounded-md px-1.5 text-[10px] font-medium tabular-nums'>
          {links.length}
        </span>
      </Popover.Trigger>

      <Popover.Content
        placement='top start'
        className='w-[520px] max-w-[calc(100vw-24px)] p-0 rounded-xl overflow-hidden'
      >
        <Popover.Dialog className='p-0'>
          <div
            className={cn(
              'divide-separator',
              'max-h-[40vh] overflow-y-auto divide-y scrollbar-thin',
            )}
          >
            {links.map((link) => (
              <div key={link.id} className='flex items-center gap-2 p-3'>
                <Icon
                  data={link.kind === 'pull-request' ? CircleTree : LogoGithub}
                  size={14}
                  className='text-muted shrink-0'
                />

                <div className='min-w-0 flex-1'>
                  <div className='text-foreground/80 truncate text-xs font-medium'>
                    {link.title}
                  </div>
                  <div className='text-muted mt-0.5 truncate font-mono text-[10px]'>
                    {link.kind === 'pull-request'
                      ? t.pullRequest.pullRequests
                      : t.pullRequest.issues}{' '}
                    #{link.number}
                  </div>
                </div>

                <a
                  href={link.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-muted hover:text-foreground shrink-0'
                  aria-label={t.pullRequest.openOnGitHub}
                >
                  <Icon data={ArrowUpRightFromSquare} size={12} />
                </a>

                <IconButton
                  variant='ghost'
                  className='shrink-0'
                  aria-label={t.chatInput.removeGithubLink}
                  onPress={() => removeGithubLink(sessionId, link.id)}
                >
                  <TrashBin />
                </IconButton>
              </div>
            ))}
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
});
