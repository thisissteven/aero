import { Alert, CodeBlock, cn, Disclosure, TextEffect } from '@aero/ui';
import { Icon } from '@gravity-ui/uikit';

import React, { ReactNode, SVGProps, useEffect, useRef, useState } from 'react';

import { FileTypeIcon } from '@/app/components/file-type-icon';
import { CodeBlockContent } from '@/app/components/tool-call-view/code-block-content';
import { MiddleTruncatePath } from '@/app/components/tool-call-view/middle-truncate-path';
import { Timer } from '@/app/components/tool-call-view/timer';
import { useKeepMountedStoreFeed } from '@/app/stores/keep-mounted';

export function BaseTool({
  blockId,
  status,
  error,
  icon,
  title,
  preview,
  previewType = 'text',
  codeTitle,
  code,
  language,
  copyText,
  duration,
  showLineNumbers = true,
  isItalicHeader = false,
  diff,
  children,
  isStreaming = false,
  useDuration = false,
  forceEnabled = false,
}: {
  blockId: string;
  status: string;
  error?: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
  title: string;
  preview?: ReactNode;
  previewType?: 'text' | 'path';
  codeTitle?: string;
  code?: string;
  language?: string;
  copyText?: string;
  duration?: number;
  showLineNumbers?: boolean;
  isItalicHeader?: boolean;
  diff?: {
    additions: number;
    deletions: number;
  };
  children?: ReactNode;
  isStreaming?: boolean;
  useDuration?: boolean;
  forceEnabled?: boolean;
}) {
  const hasCodeContent = Boolean(copyText && code);
  const hasContent = hasCodeContent || Boolean(children);

  const isExpanded = useKeepMountedStoreFeed((s) => Boolean(s.ids[blockId]));
  const setKeep = useKeepMountedStoreFeed((s) => s.setKeep);

  /*
   * Capture whether this component was created during active streaming.
   */
  const wasStreamingOnMount = useRef(isStreaming).current;

  /*
   * Track visibility state to orchestrate the 200ms delay.
   * If historic (not streaming), bypass the delay and show immediately.
   */
  const [isVisible, setIsVisible] = useState(!wasStreamingOnMount);

  useEffect(() => {
    if (!wasStreamingOnMount) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [wasStreamingOnMount]);

  /*
   * Only run <TextEffect> if the component was born streaming AND
   * the 200ms initial visibility delay has elapsed.
   */
  const shouldAnimate = wasStreamingOnMount && isVisible;

  return (
    <div
      className={cn(
        'transition-opacity duration-200 ease-out',
        isVisible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <Disclosure
        isExpanded={isExpanded}
        onExpandedChange={(nextExpanded) => setKeep(blockId, nextExpanded)}
      >
        <Disclosure.Heading>
          <Disclosure.Trigger
            className={cn(
              'group/tool -mb-2 flex h-10 w-full! min-w-0 disabled:opacity-100',
              status === 'error' && 'text-danger',
              status === 'completed' && 'text-muted/70',
            )}
            isDisabled={
              ((!hasContent && !error) || isStreaming) && !forceEnabled
            }
          >
            <div className='flex min-w-0 flex-1 items-center gap-2'>
              <div className='relative shrink-0'>
                <Disclosure.Indicator className='size-3 -rotate-90 opacity-0 transition group-hover/tool:opacity-100 data-[expanded=true]:rotate-0 data-[expanded=true]:opacity-100' />

                <Icon
                  data={icon}
                  className={cn(
                    'absolute inset-0 transition group-hover/tool:opacity-0 group-has-[svg[data-expanded=true]]/tool:opacity-0',
                    'text-foreground/60',
                    status === 'error' && 'text-danger',
                  )}
                  style={{ width: 12, height: 12 }}
                />
              </div>

              <span className='flex items-center justify-start gap-2 truncate'>
                <span
                  className={cn(
                    'text-foreground',
                    status === 'error' && 'text-danger',
                  )}
                >
                  {title}
                </span>

                {previewType === 'path' && typeof preview === 'string' && (
                  <span>
                    <FileTypeIcon filePath={preview} />
                  </span>
                )}

                {useDuration && (
                  <Timer
                    id={blockId}
                    duration={duration}
                    isStreaming={isStreaming}
                    className='text-muted/70'
                  />
                )}

                <div className='text-muted flex min-w-0 flex-1 items-center text-left transition-opacity group-has-[svg[data-expanded=true]]/tool:opacity-0'>
                  {preview ? (
                    previewType === 'path' && typeof preview === 'string' ? (
                      <MiddleTruncatePath path={preview} />
                    ) : typeof preview === 'string' ? (
                      shouldAnimate ? (
                        <TextEffect
                          duration={100}
                          stagger={5}
                          className='inline-block w-full truncate align-middle'
                        >
                          {preview}
                        </TextEffect>
                      ) : (
                        <span className='inline-block w-full truncate align-middle'>
                          {preview}
                        </span>
                      )
                    ) : (
                      preview
                    )
                  ) : null}
                </div>

                {diff && (
                  <>
                    {diff.additions > 0 && (
                      <span className='text-success transition-opacity group-has-[svg[data-expanded=true]]/tool:opacity-0'>
                        +{diff.additions}
                      </span>
                    )}

                    {diff.deletions > 0 && (
                      <span className='text-danger transition-opacity group-has-[svg[data-expanded=true]]/tool:opacity-0'>
                        -{diff.deletions}
                      </span>
                    )}
                  </>
                )}
              </span>
            </div>
          </Disclosure.Trigger>
        </Disclosure.Heading>

        <Disclosure.Content className='mt-2 pl-0'>
          <div className='border-default ml-2 space-y-2 border-l pl-5'>
            {error && (
              <div>
                {typeof preview === 'string' && (
                  <div className='text-muted/70 pt-2 text-xs'>{preview}</div>
                )}

                <Alert
                  status='danger'
                  className={cn(
                    'bg-transparent p-0 pt-4 shadow-none',
                    !hasCodeContent && 'pb-2',
                  )}
                >
                  <Alert.Content>
                    <Alert.Description className='text-danger'>
                      {error}
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              </div>
            )}

            {/* Renders custom ReactNode components directly */}
            {children}

            {/* Fallback to CodeBlock when code prop is passed */}
            {hasCodeContent && !children && !isStreaming && (
              <CodeBlock className='bg-transparent'>
                <CodeBlock.Header>
                  <div
                    className={cn(
                      'text-muted min-w-0 font-mono text-xs break-all',
                      isItalicHeader && 'italic',
                    )}
                  >
                    {codeTitle}
                  </div>

                  {copyText && (
                    <CodeBlock.CopyButton
                      code={copyText}
                      className='shrink-0'
                    />
                  )}
                </CodeBlock.Header>

                <CodeBlockContent
                  code={code!}
                  language={language || 'text'}
                  scrollOverflow={code!.includes('\n')}
                  showLineNumbers={showLineNumbers}
                />
              </CodeBlock>
            )}
          </div>
        </Disclosure.Content>
      </Disclosure>
    </div>
  );
}
