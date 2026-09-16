'use client';

import {
  AdaptiveMarkdown,
  ChainOfThought,
  cn,
  DisclosureIndicator,
  ScrollShadow,
  TextEffect,
} from '@aero/ui';
import { Bulb } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { memo, ReactElement, useEffect, useRef, useState } from 'react';

import { useKeepMountedFeed } from '@/app/hooks/useKeepMounted';
import { stripMarkdown } from '@/app/lib/file';

const THINK_SWAP = 150;
const THINK_GAP = 50;

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
  const [preview, setPreview] = useState('');

  useKeepMountedFeed(blockId, isExpanded);

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
   * Only reveal text for blocks that were streamed in this session and
   * have now settled. Historic blocks mount with isVisible=true and
   * wasStreamingOnMount=false, so they skip the reveal.
   */
  const shouldAnimate = wasStreamingOnMount && isVisible;

  const textRef = useRef(text);
  textRef.current = text;

  const lastPreviewLengthRef = useRef(0);

  useEffect(() => {
    const updatePreview = () => {
      const currentText = textRef.current;
      const currentLength = currentText.length;

      if (!isStreaming) {
        setPreview(stripMarkdown(currentText.slice(0, 100)));
        lastPreviewLengthRef.current = currentLength;
        return;
      }

      if (currentLength - lastPreviewLengthRef.current <= 100) {
        return;
      }

      lastPreviewLengthRef.current = currentLength;
      setPreview(stripMarkdown(currentText.slice(-100)));
    };

    updatePreview();

    if (!isStreaming) {
      return;
    }

    const intervalId = setInterval(updatePreview, 1000);

    return () => clearInterval(intervalId);
  }, [isStreaming]);

  return (
    <div
      className={cn(
        'transition-opacity duration-200 ease-out',
        isVisible ? 'opacity-100' : 'opacity-0',
      )}
    >
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
            isStreaming ? (
              <ThinkingPreview preview={preview} />
            ) : shouldAnimate ? (
              <div className='w-full min-w-0'>
                <TextEffect
                  duration={60}
                  stagger={3}
                  className='inline-block w-full truncate text-left align-middle md:w-full'
                >
                  {preview}
                </TextEffect>
              </div>
            ) : (
              <div className='w-full min-w-0'>
                <span className='block w-4/5 truncate text-left md:w-full'>
                  {preview}
                </span>
              </div>
            )
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
                <AdaptiveMarkdown
                  id={`${blockId}-reason`}
                  isFile={isFile}
                  onFileClick={onFileClick}
                  scrollRef={scrollRef}
                  isStreaming={isStreaming}
                >
                  {text}
                </AdaptiveMarkdown>
              </ChainOfThought.Step>
            </ChainOfThought.Steps>
          </ScrollShadow>
        </ChainOfThought.Content>
      </ChainOfThought>
    </div>
  );
});

const ThinkingPreview = memo(function ThinkingPreview({
  preview,
}: {
  preview: string;
}): ReactElement {
  const [currentText, setCurrentText] = useState(preview);
  const [isExiting, setIsExiting] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  const pendingTextRef = useRef(preview);
  const previousPreviewRef = useRef(preview);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!preview || preview === previousPreviewRef.current) {
      return;
    }

    previousPreviewRef.current = preview;
    pendingTextRef.current = preview;

    // Exact original sequence:
    // current state -> .is-exit
    setIsExiting(true);

    if (gapTimerRef.current) {
      clearTimeout(gapTimerRef.current);
    }

    gapTimerRef.current = setTimeout(() => {
      const nextText = pendingTextRef.current;

      // Replace the outgoing copy with the incoming copy.
      setCurrentText(nextText);

      // Exact original initial state for incoming copy.
      setIsExiting(false);
      setIsEntering(true);

      // Force reflow, then release .is-enter-start.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsEntering(false);
        });
      });
    }, THINK_SWAP + THINK_GAP);

    return () => {
      if (gapTimerRef.current) {
        clearTimeout(gapTimerRef.current);
      }
    };
  }, [preview]);

  return (
    <div className='w-full min-w-0'>
      <span className='t-think'>
        <span className='t-think-sizer' aria-hidden='true'>
          {currentText}
        </span>

        <span
          className={cn(
            't-think-text block w-4/5 truncate text-left md:w-full',
            isExiting && 'is-exit',
            isEntering && 'is-enter-start',
          )}
        >
          {currentText}
        </span>
      </span>
    </div>
  );
});
