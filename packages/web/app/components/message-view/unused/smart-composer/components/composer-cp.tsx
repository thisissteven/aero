import React, { useEffect, useLayoutEffect, useRef } from 'react';

import { cn } from '@aero/ui';

import type { SearchItem } from '../smart-composer-helpers';

interface CommandPaletteProps {
  open: boolean;
  results: SearchItem[];
  selectedIndex: number;
  editorRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (item: SearchItem) => void;
}

export function ComposerCommandPalette({
  open,
  results,
  selectedIndex,
  editorRef,
  onSelect,
}: CommandPaletteProps) {
  const paletteRef = useRef<HTMLDivElement | null>(null);

  const position = () => {
    const editor = editorRef.current;

    const palette = paletteRef.current;

    if (!editor || !palette || !open) {
      return;
    }

    const selection = window.getSelection();

    if (!selection || !selection.rangeCount) {
      return;
    }

    const range = selection.getRangeAt(0);

    let caretRect = range.getBoundingClientRect();

    if (!caretRect.width && !caretRect.height) {
      caretRect = editor.getBoundingClientRect();
    }

    palette.style.visibility = 'hidden';

    const paletteRect = palette.getBoundingClientRect();

    const gap = 6;
    const margin = 8;

    const editorRect = editor.getBoundingClientRect();

    const height = paletteRect.height || 320;

    const width = paletteRect.width || 320;

    const aboveEditor = editorRect.top - margin;

    const belowEditor = window.innerHeight - editorRect.bottom - margin;

    const aboveCaret = caretRect.top - margin;

    const belowCaret = window.innerHeight - caretRect.bottom - margin;

    let top: number;

    if (aboveEditor >= height + gap) {
      top = editorRect.top - height - gap;
    } else if (belowEditor >= height + gap) {
      top = editorRect.bottom + gap;
    } else if (belowCaret >= height + gap) {
      top = caretRect.bottom + gap;
    } else if (aboveCaret >= height + gap) {
      top = caretRect.top - height - gap;
    } else {
      top = Math.max(
        margin,
        Math.min(caretRect.bottom + gap, window.innerHeight - height - margin),
      );
    }

    const left = Math.max(
      margin,
      Math.min(caretRect.left, window.innerWidth - width - margin),
    );

    palette.style.top = `${top}px`;

    palette.style.left = `${left}px`;

    palette.style.visibility = 'visible';
  };

  useLayoutEffect(() => {
    position();
  }, [open, results, selectedIndex]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleResize = () => position();

    const handleScroll = () => position();

    window.addEventListener('resize', handleResize);

    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);

      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  useEffect(() => {
    const palette = paletteRef.current;

    if (!palette) {
      return;
    }

    const selected = palette.querySelector<HTMLElement>(
      `[data-index="${selectedIndex}"]`,
    );

    selected?.scrollIntoView({
      block: 'nearest',
    });
  }, [selectedIndex, results]);

  if (!open) {
    return null;
  }

  const groups = ['FILES', 'AGENTS', 'COMMANDS', 'SKILLS', 'SNIPPETS'] as const;

  let flatIndex = 0;

  return (
    <div
      ref={paletteRef}
      className={cn(
        'fixed z-[1000]',
        'max-w-[min(480px,calc(100vw-16px))] min-w-80',
        'max-h-80 overflow-y-auto',
        'border-border rounded-md border',
        'bg-overlay text-overlay-foreground',
        'p-1',
        'shadow-[var(--overlay-shadow)]',
      )}
      role='listbox'
      aria-label='Composer suggestions'
    >
      {groups.map((group) => {
        const items = results.filter((item) => item.group === group);

        if (!items.length) {
          return null;
        }

        return (
          <React.Fragment key={group}>
            <div
              className={cn(
                'border-separator border-b',
                'px-3 py-1.5',
                'text-[11px] font-medium uppercase',
                'text-muted',
              )}
            >
              {group}
            </div>

            {items.map((item) => {
              const index = flatIndex++;

              const active = index === selectedIndex;

              return (
                <div
                  key={`${group}-${item.id}`}
                  data-index={index}
                  role='option'
                  aria-selected={active}
                  className={cn(
                    'flex cursor-pointer items-center gap-2',
                    'border-separator/20 border-b',
                    'px-3 py-2 text-sm',
                    active ? 'bg-surface-hover' : 'hover:bg-surface-hover',
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onSelect(item);
                  }}
                >
                  <span className='text-muted shrink-0 text-[10px] font-medium uppercase'>
                    {item.kind}
                  </span>

                  <span className='text-foreground min-w-0 font-medium'>
                    {item.label}
                  </span>

                  <span className='text-muted truncate text-xs'>
                    {item.value}
                  </span>
                </div>
              );
            })}
          </React.Fragment>
        );
      })}

      {!results.length && (
        <div className='text-muted px-3 py-2 text-sm'>No results</div>
      )}
    </div>
  );
}
