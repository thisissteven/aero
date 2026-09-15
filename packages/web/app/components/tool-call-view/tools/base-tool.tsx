import { Alert, CodeBlock, cn, TextEffect } from '@aero/ui';
import { Icon } from '@gravity-ui/uikit';

import React, {
  ReactNode,
  SVGProps,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import { FileTypeIcon } from '@/app/components/file-type-icon';
import { CodeBlockContent } from '@/app/components/tool-call-view/code-block-content';
import { MiddleTruncatePath } from '@/app/components/tool-call-view/middle-truncate-path';
import { Timer } from '@/app/components/tool-call-view/timer';
import { useKeepMountedStoreFeed } from '@/app/stores/keep-mounted';

const PANEL_TRANSITION_MS = 200;

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

  const wasStreamingOnMount = useRef(isStreaming).current;
  const [isVisible, setIsVisible] = useState(!wasStreamingOnMount);

  useEffect(() => {
    if (!wasStreamingOnMount) return;
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, [wasStreamingOnMount]);

  // Keep the code block mounted for the close transition so the grid-rows
  // collapse can animate; unmount once the panel has finished collapsing.
  const [shouldRenderCode, setShouldRenderCode] = useState(isExpanded);

  useEffect(() => {
    if (isExpanded) {
      setShouldRenderCode(true);
      return;
    }
    const timer = setTimeout(
      () => setShouldRenderCode(false),
      PANEL_TRANSITION_MS,
    );
    return () => clearTimeout(timer);
  }, [isExpanded]);

  const shouldAnimate = wasStreamingOnMount && isVisible;
  const isDisabled = ((!hasContent && !error) || isStreaming) && !forceEnabled;

  const panelId = useId();
  const triggerId = `${panelId}-trigger`;

  return (
    <div
      className={cn(
        'transition-opacity duration-200 ease-out',
        isVisible ? 'opacity-100' : 'opacity-0',
      )}
    >
      {/* disclosure root */}
      <div className='relative'>
        {/* heading (kept for a11y — disclosure pattern) */}
        <h3 className='flex'>
          <button
            id={triggerId}
            type='button'
            aria-expanded={isExpanded}
            aria-controls={panelId}
            disabled={isDisabled}
            onClick={() => setKeep(blockId, !isExpanded)}
            className={cn(
              // Base disclosure trigger styles
              'cursor-interactive no-highlight inline-block',
              'focus-visible:status-focused',
              'disabled:status-disabled',
              // BaseTool overrides
              'group/tool -mb-2 flex h-10 w-full! min-w-0 text-left disabled:opacity-100',
              status === 'error' && 'text-danger',
              status === 'completed' && 'text-muted/70',
            )}
          >
            <div className='flex min-w-0 flex-1 items-center gap-2'>
              <div className='relative shrink-0'>
                {/* indicator — replaced with a plain chevron svg carrying
                    data-expanded for the sibling `group-has-[…]` selectors */}
                <svg
                  aria-hidden
                  viewBox='0 0 16 16'
                  fill='none'
                  data-expanded={isExpanded ? 'true' : 'false'}
                  className={cn(
                    'block size-3 shrink-0 text-inherit',
                    'transition duration-250 motion-reduce:transition-none',
                    '-rotate-90 opacity-0',
                    'group-hover/tool:opacity-100',
                    'data-[expanded=true]:rotate-0 data-[expanded=true]:opacity-100',
                  )}
                >
                  <path
                    clipRule='evenodd'
                    d='M2.97 5.47a.75.75 0 0 1 1.06 0L8 9.44l3.97-3.97a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 0 1 0-1.06'
                    fill='currentColor'
                    fillRule='evenodd'
                  />
                </svg>

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

                <div className='text-muted flex min-w-0 flex-1 items-center text-left duration-200 transition-opacity group-has-[svg[data-expanded=true]]/tool:opacity-0'>
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
          </button>
        </h3>

        {/* content panel — grid-rows 0fr/1fr trick preserves the height
            animation without needing measurement, and matches the original
            opacity transition */}
        <div
          id={panelId}
          role='region'
          aria-labelledby={triggerId}
          data-expanded={isExpanded ? 'true' : 'false'}
          className={cn(
            'mt-2 pl-0 grid',
            'transition-[grid-template-rows,opacity] duration-200',
            'motion-reduce:transition-none',
          )}
          style={{
            gridTemplateRows: isExpanded ? '1fr' : '0fr',
            opacity: isExpanded ? 1 : 0,
          }}
        >
          <div className='min-h-0 overflow-clip'>
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

              {children}

              {shouldRenderCode &&
                hasCodeContent &&
                !children &&
                !isStreaming && (
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
          </div>
        </div>
      </div>
    </div>
  );
}
