import { useRef } from 'react';

import { cn } from '@aero/ui';

import { FileTypeIcon } from '@/app/components/file-type-icon';
import { TOKEN_COLOR_MAP } from '@/app/components/smart-composer/smart-composer-dom';
import { MiddleTruncatePath } from '@/app/components/tool-call-view/middle-truncate-path';

import type { SearchItem } from '../smart-composer-helpers';

interface CommandPaletteItemProps {
  item: SearchItem;
  index: number;
  active: boolean;
  onSelect: (item: SearchItem) => void;
  onHover: (index: number) => void;
  onShowTooltip: (item: SearchItem, element: HTMLElement) => void;
}

export function CommandPaletteItem({
  item,
  index,
  active,
  onSelect,
  onHover,
  onShowTooltip,
}: CommandPaletteItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    const element = itemRef.current;

    if (!element) {
      return;
    }

    onHover(index);
    onShowTooltip(item, element);
  };

  const metadata =
    item.kind === 'agent'
      ? [
          item.agent.mode === 'subagent' ? 'subagent' : 'primary',
          item.agent.native ? 'built-in' : 'custom',
        ]
      : item.kind === 'command'
        ? [
            item.command.source,
            ...(item.command.hints.length
              ? [
                  `${item.command.hints.length} arg${
                    item.command.hints.length === 1 ? '' : 's'
                  }`,
                ]
              : []),
          ]
        : item.kind === 'skill'
          ? [item.skill.scope]
          : [];

  return (
    <div
      ref={itemRef}
      data-index={index}
      role='option'
      aria-selected={active}
      className={cn(
        'group flex cursor-pointer items-center',
        'border-separator/20 rounded-md border-b px-3 py-2',
        active && 'bg-surface-hover',
      )}
      onMouseEnter={handleMouseEnter}
      onMouseDown={(event) => {
        event.preventDefault();
        onSelect(item);
      }}
    >
      {item.kind === 'file' && (
        <FileTypeIcon filePath={item.value} className='shrink-0' />
      )}

      {item.kind !== 'file' && (
        <span
          className={cn(
            'shrink-0 text-sm font-medium',
            TOKEN_COLOR_MAP[item.kind],
          )}
        >
          {item.triggerChar}
        </span>
      )}

      <div className='min-w-0 flex-1 text-sm'>
        {item.kind === 'file' ? (
          <MiddleTruncatePath
            path={item.value}
            className='text-muted ml-1'
            fileClassName='text-foreground'
          />
        ) : (
          <span
            className={cn(
              'block truncate text-sm font-medium',
              TOKEN_COLOR_MAP[item.kind],
            )}
          >
            {item.value}
          </span>
        )}
      </div>

      {metadata.length > 0 && (
        <div className='text-muted ml-1 flex shrink-0 items-center gap-1'>
          {metadata.map((value) => (
            <span
              key={value}
              className='bg-surface rounded px-1.5 py-0.5 text-[10px] leading-none'
            >
              {value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
