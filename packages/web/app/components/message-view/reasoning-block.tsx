import { Bulb } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { memo, ReactElement, useMemo, useRef } from 'react';

import {
  AdaptiveMarkdown,
  ChainOfThought,
  DisclosureIndicator,
  ScrollShadow,
} from '@aero/ui';

import { DeferredView } from '@/app/components/deferred-view';
import { stripMarkdown } from '@/app/lib/file';

export const ReasoningBlock = memo(function ReasoningBlock({
  blockId,
  isFile,
  onFileClick,
  text,
}: {
  blockId: string;
  isFile: (path: string) => boolean;
  onFileClick: (path: string) => void;
  text: string;
}): ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);

  const preview = useMemo(() => stripMarkdown(text.slice(0, 150)), [text]);

  return (
    <ChainOfThought key={blockId}>
      <ChainOfThought.Trigger
        icon={
          <div className='relative shrink-0'>
            <DisclosureIndicator className='size-3 -rotate-90 opacity-0 transition group-hover/cot:opacity-100 data-[expanded=true]:rotate-0 data-[expanded=true]:opacity-100' />
            <Icon
              data={Bulb}
              className='absolute inset-0 transition group-hover/cot:opacity-0 group-has-[svg[data-expanded=true]]/cot:opacity-0'
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
