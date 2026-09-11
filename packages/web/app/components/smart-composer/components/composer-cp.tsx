import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { cn, Kbd, ScrollShadow } from '@aero/ui';

import { CommandPaletteItem } from '@/app/components/smart-composer/components/composer-cp-item';
import type { CaretRect } from '@/app/components/smart-composer/use-composer-palette';
import { useOnClickOutside } from '@/app/hooks/useOnClickOutside';
import { useTooltipStore } from '@/app/providers/GlobalTooltipProvider';

import type { SearchItem } from '../smart-composer-helpers';

interface CommandPaletteProps {
  open: boolean;
  results: SearchItem[];
  selectedIndex: number;
  caretRect: CaretRect | null;
  onSelect: (item: SearchItem) => void;
  close: () => void;
}

const GROUPS = ['AGENTS', 'FILES', 'COMMANDS', 'SKILLS', 'SNIPPETS'] as const;

export function ComposerCommandPalette({
  open,
  results,
  selectedIndex,
  caretRect,
  onSelect,
  close,
}: CommandPaletteProps) {
  const paletteRef = useRef<HTMLDivElement | null>(null);

  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  // After keyboard navigation, don't let a stationary pointer
  // take control back until the pointer actually moves.
  const ignoreHoverRef = useRef(false);

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
              {item.triggerChar}
              {item.value}
            </div>

            {description && (
              <p className='text-muted text-xs leading-4'>{description}</p>
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

  // Only keyboard navigation controls scrolling.
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
      `[data-index="${selectedIndex}"]`,
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
  }, [open, selectedIndex]);

  // Keyboard navigation always wins over the mouse.
  // The pointer must physically move before hover can take control again.
  useEffect(() => {
    if (!open) {
      return;
    }

    ignoreHoverRef.current = true;
    setActiveIndex(selectedIndex);
  }, [selectedIndex, open]);

  // A real pointer movement hands control back to the mouse.
  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerMove = () => {
      ignoreHoverRef.current = false;
    };

    window.addEventListener('pointermove', handlePointerMove);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [open]);

  // Keep the tooltip attached to the currently active item.
  // Hide it when the active item does not provide a tooltip.
  useLayoutEffect(() => {
    if (!open || activeIndex < 0) {
      return;
    }

    const palette = paletteRef.current;
    const item = flatResults[activeIndex];

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
      `[data-index="${activeIndex}"]`,
    );

    if (!element) {
      hideTooltip();
      return;
    }

    showItemTooltip(item, element);
  }, [open, activeIndex, flatResults, showItemTooltip, hideTooltip]);

  useEffect(() => {
    if (!open) {
      hideTooltip();
    }
  }, [open, hideTooltip]);

  useEffect(() => {
    if (!open) {
      setActiveIndex(selectedIndex);
      ignoreHoverRef.current = false;
    }
  }, [open, selectedIndex]);

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
        'border-separator dark:border-separator/50 rounded-xl border',
        'bg-overlay/60 text-overlay-foreground overflow-hidden backdrop-blur-sm',
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
                  'border-separator dark:border-separator/50 mb-1 border-b',
                  'px-3 py-1.5',
                  'text-[11px] font-medium uppercase',
                  'text-muted',
                )}
              >
                {group}
              </div>

              {items.map((item) => {
                const index = flatIndex++;
                const active = index === activeIndex;

                return (
                  <CommandPaletteItem
                    key={`${group}-${item.id}`}
                    item={item}
                    index={index}
                    active={active}
                    onSelect={onSelect}
                    onHover={(hoveredIndex) => {
                      if (ignoreHoverRef.current) {
                        return;
                      }

                      setActiveIndex(hoveredIndex);
                    }}
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

      <div className='text-muted border-separator dark:border-separator/50 relative flex items-center gap-3 border-t p-1.5'>
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
