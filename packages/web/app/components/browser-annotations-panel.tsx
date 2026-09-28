import { cn, IconButton, Popover } from '@aero/ui';
import { Globe, TrashBin, Xmark } from '@gravity-ui/icons';
import React from 'react';

import {
  getExternalPartsSession,
  useExternalPartsStore,
} from '@/app/features/chat-page/chat-input/external-parts-store';
import { useI18n } from '@/app/hooks/i18n';
import { useOptionalSessionId } from '@/app/providers/SessionIdProvider';

export const BrowserAnnotationsPanel = React.memo(
  function BrowserAnnotationsPanel() {
    // New-session pages have no route id; the composer stores under
    // the literal `'undefined'` key.
    const sessionId = useOptionalSessionId() ?? 'undefined';
    const { t } = useI18n();

    const annotations = useExternalPartsStore(
      (state) => getExternalPartsSession(state, sessionId).browserAnnotations,
    );
    const updateBrowserAnnotation = useExternalPartsStore(
      (state) => state.updateBrowserAnnotation,
    );
    const removeBrowserAnnotation = useExternalPartsStore(
      (state) => state.removeBrowserAnnotation,
    );

    if (annotations.length === 0) {
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
          <Globe className='size-3.5' />
          <span>{t.browser.annotations}</span>
          <span className='bg-accent/15 text-accent rounded-md px-1.5 text-[10px] font-medium tabular-nums'>
            {annotations.length}
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
              {annotations.map((annotation) => (
                <div key={annotation.id} className='flex gap-3 p-3'>
                  <div className='relative shrink-0'>
                    {annotation.imageUrl ? (
                      <>
                        <img
                          src={annotation.imageUrl}
                          alt=''
                          className='border-separator h-16 w-24 rounded-md border object-cover object-top'
                        />
                        <button
                          type='button'
                          aria-label={t.browser.removeImage}
                          title={t.browser.removeImage}
                          onClick={() =>
                            updateBrowserAnnotation(sessionId, annotation.id, {
                              imageUrl: '',
                            })
                          }
                          className='bg-default/90 text-muted hover:text-foreground border-separator absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border shadow'
                        >
                          <Xmark className='size-3' />
                        </button>
                      </>
                    ) : (
                      <div className='border-separator bg-default text-muted flex h-16 w-24 items-center justify-center rounded-md border'>
                        <Globe className='size-4' />
                      </div>
                    )}
                  </div>

                  <div className='min-w-0 flex-1'>
                    <div className='text-foreground/80 truncate text-xs font-medium'>
                      {annotation.pageTitle || annotation.pageUrl || ''}
                    </div>
                    <div className='text-muted mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-snug'>
                      {annotation.text}
                    </div>
                  </div>

                  <IconButton
                    variant='ghost'
                    className='shrink-0'
                    aria-label={t.browser.removeAnnotation}
                    onPress={() =>
                      removeBrowserAnnotation(sessionId, annotation.id)
                    }
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
  },
);
