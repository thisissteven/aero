import { Paperclip } from '@gravity-ui/icons';
import type { RefObject } from 'react';
import React, { useEffect, useRef, useState } from 'react';

import { Button, cn, Popover, Separator, TextArea } from '@aero/ui';

const VIEWPORT_MARGIN = 12;
const OFFSET = 8;

interface SelectionPopoverProps {
  containerRef: RefObject<HTMLElement | null>;
}

interface SelectionState {
  text: string;
  rect: DOMRect;
  rects: DOMRect[];
  direction: 'forward' | 'backward';
}

export const SelectionPopover = React.memo(function SelectionPopover({
  containerRef,
}: SelectionPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [mode, setMode] = useState<'actions' | 'comment'>('actions');

  useEffect(() => {
    const clearSelection = () => {
      setSelection(null);
      setMode('actions');
      window.getSelection()?.removeAllRanges();
    };

    const handleMouseUp = () => {
      requestAnimationFrame(() => {
        const container = containerRef.current;
        const nativeSelection = window.getSelection();

        if (
          !container ||
          !nativeSelection ||
          nativeSelection.isCollapsed ||
          nativeSelection.rangeCount === 0
        ) {
          return;
        }

        if (
          !container.contains(nativeSelection.anchorNode) ||
          !container.contains(nativeSelection.focusNode)
        ) {
          return;
        }

        const text = nativeSelection.toString().trim();

        if (!text) {
          return;
        }

        const range = nativeSelection.getRangeAt(0);
        const rects = Array.from(range.getClientRects());

        if (!rects.length) {
          return;
        }

        const anchorRange = document.createRange();
        anchorRange.setStart(
          nativeSelection.anchorNode!,
          nativeSelection.anchorOffset,
        );
        anchorRange.collapse(true);

        const focusRange = document.createRange();
        focusRange.setStart(
          nativeSelection.focusNode!,
          nativeSelection.focusOffset,
        );
        focusRange.collapse(true);

        const direction =
          anchorRange.compareBoundaryPoints(Range.START_TO_START, focusRange) <=
          0
            ? 'forward'
            : 'backward';

        setMode('actions');

        setSelection({
          text,
          direction,
          rects,
          rect: direction === 'backward' ? rects[0] : rects[rects.length - 1],
        });
      });
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (!selection) {
        return;
      }

      const target = event.target as Node;

      if (popoverRef.current?.contains(target)) {
        return;
      }

      clearSelection();
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [containerRef, selection]);

  if (!selection) {
    return null;
  }

  const { rect, rects, direction } = selection;

  const anchorTop = direction === 'backward' ? rect.top : rect.bottom;
  const anchorLeft = rect.left + rect.width / 2;

  const clampedLeft = Math.max(
    VIEWPORT_MARGIN,
    Math.min(anchorLeft, window.innerWidth - VIEWPORT_MARGIN),
  );

  const clampedTop = Math.max(
    VIEWPORT_MARGIN,
    Math.min(anchorTop, window.innerHeight - VIEWPORT_MARGIN),
  );

  return (
    <>
      {mode === 'comment' && (
        <div className='pointer-events-none fixed inset-0 z-40'>
          {rects.map((rect, index) => (
            <div
              key={index}
              className='bg-accent/30 pointer-events-none fixed rounded-[2px]'
              style={{
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
              }}
            />
          ))}
        </div>
      )}

      <Popover
        isOpen
        onOpenChange={(open) => {
          if (!open) {
            setSelection(null);
            setMode('actions');
            window.getSelection()?.removeAllRanges();
          }
        }}
      >
        <Popover.Trigger
          aria-label='Selection'
          className='fixed h-px w-px opacity-0'
          style={{
            left: clampedLeft,
            top: clampedTop,
            pointerEvents: 'none',
          }}
        >
          <span />
        </Popover.Trigger>

        <Popover.Content
          ref={popoverRef}
          offset={OFFSET}
          shouldFlip
          placement={direction === 'backward' ? 'top' : 'bottom'}
          className={cn(
            'w-auto max-w-[calc(100vw-24px)] p-0',
            mode === 'comment' ? 'rounded-xl' : '',
          )}
        >
          <Popover.Dialog className='p-0'>
            {mode === 'actions' ? (
              <div className='flex items-center gap-1 p-1'>
                <Button
                  size='sm'
                  variant='ghost'
                  onPointerDown={(event) => {
                    event.preventDefault();
                  }}
                  onPress={() => {
                    // Remove the native highlight before enabling
                    // the persistent custom highlight.
                    window.getSelection()?.removeAllRanges();
                    setMode('comment');
                  }}
                >
                  Comment
                </Button>

                <Separator orientation='vertical' />

                <Button
                  size='sm'
                  variant='ghost'
                  onPointerDown={(event) => {
                    event.preventDefault();
                  }}
                  onPress={() => {
                    // TODO: Add to notes
                  }}
                >
                  Add to notes
                </Button>
              </div>
            ) : (
              <div className='w-80 p-2'>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    alert('yoo');
                  }}
                >
                  <TextArea
                    autoFocus
                    variant='secondary'
                    aria-label='Comment'
                    placeholder='Add a comment...'
                    className='min-h-9 w-full resize-none scrollbar-thin rounded-lg'
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />

                  <div className='mt-1 flex justify-end'>
                    <Button
                      isIconOnly
                      type='submit'
                      aria-label='Submit comment'
                      size='sm'
                    >
                      <Paperclip />
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </>
  );
});
