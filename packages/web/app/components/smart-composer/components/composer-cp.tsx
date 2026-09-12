import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';

import { cn, Kbd, ScrollShadow } from '@aero/ui';

import { CommandPaletteItem } from '@/app/components/smart-composer/components/composer-cp-item';
import type { CaretRect } from '@/app/components/smart-composer/use-composer-palette';
import { useOnClickOutside } from '@/app/hooks/useOnClickOutside';
import { useTooltipStore } from '@/app/providers/global-tooltip/global-tooltip-store';
import { capitalizeFirstLetter, toPascalCase } from '@/server/shared';

import type { SearchItem } from '../smart-composer-helpers';

interface CommandPaletteProps {
  open: boolean;
  results: SearchItem[];
  selectedIndex: number;
  scrollIndex: number;
  caretRect: CaretRect | null;
  onSelect: (item: SearchItem) => void;
  onHover: (index: number) => void;
  onHoverReset: () => void;
  close: () => void;
}

const GROUPS = ['AGENTS', 'FILES', 'COMMANDS', 'SKILLS', 'SNIPPETS'] as const;

export function ComposerCommandPalette({
  open,
  results,
  selectedIndex,
  scrollIndex,
  caretRect,
  onSelect,
  onHover,
  onHoverReset,
  close,
}: CommandPaletteProps) {
  const paletteRef = useRef<HTMLDivElement | null>(null);

  const showTooltip = useTooltipStore((s) => s.showTooltip);
  const hideTooltip = useTooltipStore((s) => s.hideTooltip);

  useOnClickOutside(paletteRef, close);

  const flatResults = useMemo(
    () =>
      GROUPS.flatMap((group) => results.filter((item) => item.group === group)),
    [results],
  );

  const showItemTooltip = useCallback(
    (item: SearchItem, element: HTMLElement) => {
      const description =
        item.kind === 'agent'
          ? item.agent.description
          : item.kind === 'command'
            ? item.command.description
            : item.kind === 'skill'
              ? item.skill.description
              : undefined;

      if (!description) return;

      showTooltip({
        content: (
          <div className='max-w-sm p-2'>
            <div className='mb-1 text-sm font-medium'>
              {toPascalCase(item.value)}
            </div>

            {description && (
              <p className='text-muted text-xs leading-4'>
                {capitalizeFirstLetter(description)}
              </p>
            )}
          </div>
        ),
        rect: element.getBoundingClientRect(),
        isInteractive: true,
      });
    },
    [showTooltip],
  );

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

    if (spaceAbove >= height + gap) {
      top = caretRect.top - height - gap;
    } else if (spaceBelow >= height + gap) {
      top = caretRect.bottom + gap;
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
  }, [open, results, caretRect, position]);

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

  // Only keyboard navigation controls scrolling — scrollIndex only ever
  // moves via moveSelection, so hovering an item never scrolls the list,
  // even though hover and keyboard nav share selectedIndex for highlight.
  // Respect scroll-py-* by explicitly accounting for the list's
  // computed scrollPaddingTop/Bottom when changing scrollTop.
  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const palette = paletteRef.current;

    if (!palette) {
      return;
    }

    const list = palette.querySelector<HTMLElement>('[role="listbox"]');
    const item = list?.querySelector<HTMLElement>(
      `[data-index="${scrollIndex}"]`,
    );

    if (!list || !item) {
      return;
    }

    const listRect = list.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    const styles = getComputedStyle(list);
    const paddingTop = parseFloat(styles.scrollPaddingTop) || 0;
    const paddingBottom = parseFloat(styles.scrollPaddingBottom) || 0;

    const visibleTop = listRect.top + paddingTop;
    const visibleBottom = listRect.bottom - paddingBottom;

    if (itemRect.top < visibleTop) {
      list.scrollTop -= visibleTop - itemRect.top;
    } else if (itemRect.bottom > visibleBottom) {
      list.scrollTop += itemRect.bottom - visibleBottom;
    }
  }, [open, scrollIndex]);

  // A real pointer movement hands control back to the mouse.
  useEffect(() => {
    if (!open) {
      return;
    }

    window.addEventListener('pointermove', onHoverReset);

    return () => {
      window.removeEventListener('pointermove', onHoverReset);
    };
  }, [open, onHoverReset]);

  // Keep the tooltip attached to the currently selected item.
  // Hide it when that item does not provide a tooltip.
  useLayoutEffect(() => {
    if (!open || selectedIndex < 0) {
      return;
    }

    const palette = paletteRef.current;
    const item = flatResults[selectedIndex];

    if (!palette || !item) {
      hideTooltip();
      return;
    }

    if (
      item.kind !== 'agent' &&
      item.kind !== 'command' &&
      item.kind !== 'skill'
    ) {
      hideTooltip();
      return;
    }

    const element = palette.querySelector<HTMLElement>(
      `[data-index="${selectedIndex}"]`,
    );

    if (!element) {
      hideTooltip();
      return;
    }

    showItemTooltip(item, element);
  }, [open, selectedIndex, flatResults, showItemTooltip, hideTooltip]);

  useEffect(() => {
    if (!open) {
      hideTooltip();
    }
  }, [open, hideTooltip]);

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
        'bg-overlay/80 text-overlay-foreground overflow-hidden backdrop-blur-sm',
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
                  <CommandPaletteItem
                    key={`${group}-${item.id}`}
                    item={item}
                    index={index}
                    active={active}
                    onSelect={onSelect}
                    onHover={onHover}
                    onShowTooltip={showItemTooltip}
                  />
                );
              })}
            </React.Fragment>
          );
        })}

        {!results.length && (
          <div className='text-muted px-3 py-2 text-sm'>No results</div>
        )}
      </ScrollShadow>

      <div className='text-muted border-separator relative flex items-center gap-3 border-t p-1.5'>
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
