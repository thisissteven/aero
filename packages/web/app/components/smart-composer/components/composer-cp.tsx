import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { cn, Kbd, ScrollShadow } from '@aero/ui';

import { FileTypeIcon } from '@/app/components/file-type-icon';
import type { CaretRect } from '@/app/components/smart-composer/use-composer-palette';
import { MiddleTruncatePath } from '@/app/components/tool-call-view/middle-truncate-path';
import { useOnClickOutside } from '@/app/hooks/useOnClickOutside';

import type { SearchItem } from '../smart-composer-helpers';

interface CommandPaletteProps {
  open: boolean;
  results: SearchItem[];
  selectedIndex: number;
  caretRect: CaretRect | null;
  onSelect: (item: SearchItem) => void;
  close: () => void;
}

const GROUPS = ['FILES', 'AGENTS', 'COMMANDS', 'SKILLS', 'SNIPPETS'] as const;

export function ComposerCommandPalette({
  open,
  results,
  selectedIndex,
  caretRect,
  onSelect,
  close,
}: CommandPaletteProps) {
  const paletteRef = useRef<HTMLDivElement | null>(null);

  useOnClickOutside(paletteRef, close);

  const position = useCallback(() => {
    const palette = paletteRef.current;

    if (!palette || !open || !caretRect) {
      return;
    }

    const { width, height } = palette.getBoundingClientRect();

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
    if (open) {
      position();
    }
  }, [open, results, selectedIndex, caretRect, position]);

  useEffect(() => {
    if (!open) {
      return;
    }

    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);

    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [open, position]);

  useEffect(() => {
    const palette = paletteRef.current;

    if (!palette) {
      return;
    }

    palette
      .querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`)
      ?.scrollIntoView({
        block: 'nearest',
      });
  }, [selectedIndex, results]);

  if (!open) {
    return null;
  }

  let flatIndex = 0;

  return (
    <div
      ref={paletteRef}
      className={cn(
        'fixed z-50',
        'max-w-[min(480px,calc(100vw-32px))] min-w-60',
        'border-separator rounded-xl border',
        'bg-overlay text-overlay-foreground overflow-hidden',
      )}
    >
      <ScrollShadow
        role='listbox'
        aria-label='Composer suggestions'
        className='max-h-80 scroll-py-10 scrollbar-thin overflow-y-auto p-1'
      >
        {GROUPS.map((group) => {
          const items = results.filter((item) => item.group === group);

          if (!items.length) {
            return null;
          }

          return (
            <React.Fragment key={group}>
              <div
                className={cn(
                  'border-separator mb-1 border-b',
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
                    {item.kind === 'file' && (
                      <FileTypeIcon filePath={item.value} />
                    )}

                    {item.kind === 'file' && (
                      <MiddleTruncatePath
                        path={item.value}
                        className='text-muted'
                        fileClassName='text-foreground'
                      />
                    )}

                    {item.kind !== 'file' && (
                      <span className='truncate text-xs'>{item.value}</span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}

        {!results.length && (
          <div className='text-muted px-3 py-2 text-sm'>No results</div>
        )}
      </ScrollShadow>
      <div className='bg-overlay text-muted border-separator relative flex items-center gap-3 border-t p-1.5'>
        <div className='flex items-center gap-2'>
          <div className='flex items-center gap-0.5'>
            <Kbd className='h-5 rounded-md px-1.5 text-xs'>
              <Kbd.Abbr keyValue='up' />
            </Kbd>
            <Kbd className='h-5 rounded-md px-1.5 text-xs'>
              <Kbd.Abbr keyValue='down' />
            </Kbd>
          </div>
          <span className='text-xs'>Navigate</span>
        </div>

        <div className='flex items-center gap-2'>
          <Kbd className='h-5 rounded-md px-1.5'>
            <Kbd.Abbr keyValue='enter' />
          </Kbd>
          <span className='text-xs'>Select</span>
        </div>
      </div>
    </div>
  );
}
