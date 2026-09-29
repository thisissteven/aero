// app/components/chat-aside/changes/change-group.tsx
import { Checkbox, Chip, cn, IconButton, Tooltip } from '@aero/ui';
import { ArrowUpRightFromSquare, ChevronRight } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { FileTypeIcon } from '@/app/components/file-type-icon';
import { MiddleTruncatePath } from '@/app/components/tool-call-view/middle-truncate-path';
import { useI18n } from '@/app/hooks/i18n';

import { ChangeDiffPanel } from './change-diff-panel';
import { changeBadge } from './lib';
import type { ChangeEntry } from './types';

export function ChangeGroup({
  variant,
  directory,
  title,
  entries,
  selected,
  expandedKey,
  onToggle,
  onToggleExpanded,
  onOpenFile,
}: {
  variant: 'staged' | 'working';
  directory: string;
  title: string;
  entries: ChangeEntry[];
  selected: Set<string>;
  expandedKey: string | null;
  onToggle: (path: string) => void;
  onToggleExpanded: (key: string) => void;
  onOpenFile: (path: string) => void;
}) {
  const { t } = useI18n();

  if (!entries.length) return null;

  return (
    <section className='mb-1'>
      <div className='text-muted flex items-center justify-between px-2 py-1 text-[10px] font-medium tracking-wide uppercase'>
        <span>{title}</span>
        <span className='tabular-nums'>{entries.length}</span>
      </div>

      <ul>
        {entries.map((entry) => {
          const isSelected = selected.has(entry.path);
          const entryKey = `${variant}:${entry.path}`;
          const isExpanded = expandedKey === entryKey;
          const { letter, color: badgeColor } = changeBadge(entry, variant);

          return (
            <li key={entry.path} className='overflow-hidden'>
              <div
                role='button'
                tabIndex={0}
                aria-expanded={isExpanded}
                onClick={() => onToggleExpanded(entryKey)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggleExpanded(entryKey);
                  }
                }}
                className={cn(
                  'group flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 outline-none transition-colors duration-150',
                  'focus-visible:ring-2 focus-visible:ring-accent active:bg-default/60',
                  isExpanded ? 'bg-default/50' : 'hover:bg-default/40',
                )}
              >
                <Icon
                  data={ChevronRight}
                  size={12}
                  className={cn(
                    'text-muted shrink-0 transition-transform duration-150 ease-out motion-reduce:transition-none',
                    isExpanded && 'rotate-90',
                  )}
                />

                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    variant='secondary'
                    isSelected={isSelected}
                    onChange={() => onToggle(entry.path)}
                    aria-label={t.changesPanel.selectFile(entry.path)}
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                    </Checkbox.Content>
                  </Checkbox>
                </div>

                <FileTypeIcon filePath={entry.path} />

                <div className='min-w-0 flex-1'>
                  <MiddleTruncatePath
                    path={entry.path}
                    className='text-muted text-xs'
                    fileClassName='text-foreground text-xs'
                  />
                </div>

                <div className='flex shrink-0 items-center gap-1.5 text-xs tabular-nums'>
                  {entry.additions > 0 && (
                    <span className='text-success'>+{entry.additions}</span>
                  )}
                  {entry.deletions > 0 && (
                    <span className='text-danger'>-{entry.deletions}</span>
                  )}
                  <Chip
                    size='sm'
                    className='text-xs'
                    variant='soft'
                    color={badgeColor}
                  >
                    {letter}
                  </Chip>
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  <Tooltip>
                    <Tooltip.Trigger>
                      <IconButton
                        aria-label={t.toolCall.openInEditor}
                        onPress={() => onOpenFile(entry.path)}
                      >
                        <Icon data={ArrowUpRightFromSquare} />
                      </IconButton>
                    </Tooltip.Trigger>
                    <Tooltip.Content>{t.toolCall.openInEditor}</Tooltip.Content>
                  </Tooltip>
                </div>
              </div>

              {isExpanded && (
                <ChangeDiffPanel
                  directory={directory}
                  entry={entry}
                  variant={variant}
                  onOpenFile={onOpenFile}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
