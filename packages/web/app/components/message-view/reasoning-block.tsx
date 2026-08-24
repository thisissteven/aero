'use client';

import { Bulb } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { AnimatePresence, motion } from 'motion/react';
import { memo, ReactElement, useEffect, useRef, useState } from 'react';

import {
  AdaptiveMarkdown,
  ChainOfThought,
  cn,
  DisclosureIndicator,
  ScrollShadow,
} from '@aero/ui';

import { DeferredView } from '@/app/components/deferred-view';
import { useKeepMountedFeed } from '@/app/hooks/useKeepMounted';
import { stripMarkdown } from '@/app/lib/file';

export const ReasoningBlock = memo(function ReasoningBlock({
  blockId,
  isFile,
  onFileClick,
  text,
  isStreaming,
}: {
  blockId: string;
  isFile: (path: string) => boolean;
  onFileClick: (path: string) => void;
  text: string;
  isStreaming: boolean;
}): ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isExpanded, setIsExpanded] = useState(false);

  useKeepMountedFeed(blockId, isExpanded);

  const [preview, setPreview] = useState('');

  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    const updatePreview = () => {
      const sliced = textRef.current.slice(-150);
      if (sliced.length >= 100) {
        setPreview(stripMarkdown(sliced));
      }
    };

    updatePreview();

    if (!isStreaming) {
      setPreview(textRef.current.slice(0, 150));
      return;
    }

    const intervalId = setInterval(updatePreview, 1000);
    return () => clearInterval(intervalId);
  }, [isStreaming]);

  const hasStreamedRef = useRef(isStreaming);

  if (isStreaming) {
    hasStreamedRef.current = true;
  }

  return (
    <ChainOfThought
      key={blockId}
      isStreaming={isStreaming}
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
    >
      <ChainOfThought.Trigger
        icon={
          <div className='relative shrink-0'>
            <DisclosureIndicator className='size-3 -rotate-90 opacity-0 transition group-hover/cot:opacity-100 data-[expanded=true]:rotate-0 data-[expanded=true]:opacity-100' />
            <Icon
              data={Bulb}
              className='text-muted absolute inset-0 transition group-hover/cot:opacity-0 group-has-[svg[data-expanded=true]]/cot:opacity-0'
              style={{
                width: 12,
                height: 12,
              }}
            />
          </div>
        }
        preview={
          <div className='w-full min-w-0'>
            <AnimatePresence mode='wait' initial={false}>
              <motion.span
                key={hasStreamedRef.current ? preview : 'static-initial'}
                initial={
                  hasStreamedRef.current
                    ? { opacity: 0, y: 4, filter: 'blur(2px)' }
                    : false
                }
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={
                  hasStreamedRef.current
                    ? { opacity: 0, y: -4, filter: 'blur(2px)' }
                    : undefined
                }
                transition={{ duration: 0.15, ease: 'easeInOut' }}
                className='block w-4/5 truncate text-left md:w-full'
              >
                {preview}
              </motion.span>
            </AnimatePresence>
          </div>
        }
      >
        <span className='text-foreground'>Thinking</span>
      </ChainOfThought.Trigger>

      <ChainOfThought.Content>
        <ScrollShadow
          ref={scrollRef}
          className={cn(isStreaming ? 'max-h-20' : 'max-h-[40vh]')}
          offset={2}
        >
          <ChainOfThought.Steps>
            <ChainOfThought.Step>
              <DeferredView>
                <AdaptiveMarkdown
                  id={`${blockId}-reason`}
                  isFile={isFile}
                  onFileClick={onFileClick}
                  scrollRef={scrollRef}
                  isStreaming={isStreaming}
                >
                  {text}
                </AdaptiveMarkdown>
              </DeferredView>
            </ChainOfThought.Step>
          </ChainOfThought.Steps>
        </ScrollShadow>
      </ChainOfThought.Content>
    </ChainOfThought>
  );
});
