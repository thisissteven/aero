import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { cn } from '@aero/ui';

import { CaretRect } from '@/app/components/smart-composer/use-composer-palette';

import type { SearchItem } from '../smart-composer-helpers';

interface CommandPaletteProps {
  open: boolean;
  results: SearchItem[];
  selectedIndex: number;
  caretRect: CaretRect | null;
  onSelect: (item: SearchItem) => void;
}

export function ComposerCommandPalette({
  open,
  results,
  selectedIndex,
  caretRect,
  onSelect,
}: CommandPaletteProps) {
  const paletteRef = useRef<HTMLDivElement | null>(null);

  const position = useCallback(() => {
    const palette = paletteRef.current;

    if (!palette || !open || !caretRect) {
      return;
    }

    const rect = palette.getBoundingClientRect();

    const width = rect.width;
    const height = rect.height;

    const gap = 6;
    const margin = 8;

    const spaceBelow = window.innerHeight - caretRect.bottom - margin;

    const spaceAbove = caretRect.top - margin;

    let top: number;

    if (spaceBelow >= height + gap) {
      top = caretRect.bottom + gap;
    } else if (spaceAbove >= height + gap) {
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
  }, [caretRect, open]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    position();
  }, [open, results, selectedIndex, caretRect, position]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleResize = () => {
      position();
    };

    const handleScroll = () => {
      position();
    };

    window.addEventListener('resize', handleResize);

    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);

      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, position]);

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
        'fixed z-[1]',
        'max-w-[min(480px,calc(100vw-16px))] min-w-80',
        'max-h-80 scrollbar-thin overflow-y-auto',
        'border-separator rounded-xl border',
        'bg-overlay text-overlay-foreground',
        'p-1',
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
                    'border-separator/20 rounded-md border-b',
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
