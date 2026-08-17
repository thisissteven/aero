'use client';

import { Bulb } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import {
  memo,
  ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AdaptiveMarkdown,
  ChainOfThought,
  DisclosureIndicator,
  ScrollShadow,
} from '@aero/ui';

import { DeferredView } from '@/app/components/deferred-view';
import { useKeepMounted } from '@/app/hooks/useKeepMounted';
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
  const isDirtyRef = useRef(false);

  // Initialize state based on whether it starts as streaming
  const [isExpanded, setIsExpanded] = useState(isStreaming);

  useKeepMounted(blockId, isExpanded);

  // Sync state with streaming status unless the user manually interacted
  useEffect(() => {
    if (!isDirtyRef.current) {
      setIsExpanded(isStreaming);
    }
  }, [isStreaming]);

  // Track manual user interactions
  const handleExpandedChange = (expanded: boolean) => {
    isDirtyRef.current = true;
    setIsExpanded(expanded);
  };

  const preview = useMemo(() => stripMarkdown(text.slice(0, 150)), [text]);

  return (
    <ChainOfThought
      key={blockId}
      isStreaming={isStreaming}
      isExpanded={isExpanded}
      onExpandedChange={handleExpandedChange}
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
        preview={preview}
      >
        <span className='text-foreground'>Thinking</span>
      </ChainOfThought.Trigger>

      <ChainOfThought.Content>
        <ScrollShadow ref={scrollRef} className='max-h-[40vh]' offset={2}>
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
