import { Comment, Gear, Keyboard } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useRef } from 'react';

import { cn, Command, ListLayout, Virtualizer } from '@aero/ui';

import { ShortcutsModal } from '@/app/components/chat-sidebar/sidebar-footer';
import { useCommandPaletteStore } from '@/app/components/command-palette/command-palette-store';
import { CommandPaletteLoader } from '@/app/components/command-palette/cp-loader';
import { useSessions } from '@/app/hooks/api/sessions';
import { useInfiniteScroll } from '@/app/hooks/useInfiniteScroll';
import { formatCompactRelativeTime } from '@/app/lib';
import { useGlobalModalStore } from '@/app/providers';
import { useSettingsModalStore } from '@/app/providers/settings/settings-store';
import type { AeroSessionSummary } from '@/server/services/harness/types';

export type VirtualPaletteItem =
  | { kind: 'header'; id: string; title: string; isFirst: boolean }
  | {
      kind: 'action';
      id: string;
      textValue: string;
      icon: typeof Comment;
      label: string;
      onAction: () => void;
    }
  | { kind: 'session'; id: string; session: AeroSessionSummary }
  | { kind: 'loader'; id: string };

export function CommandPaletteList() {
  const listRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const selectedFilters = useCommandPaletteStore(
    (state) => state.selectedFilters,
  );
  const debouncedSearch = useCommandPaletteStore(
    (state) => state.debouncedSearch,
  );
  const toggleIsOpen = useCommandPaletteStore((state) => state.toggleIsOpen);
  const openSettingsModal = useSettingsModalStore((state) => state.openModal);

  const toggleOpenShortcutsModal = useGlobalModalStore(
    (state) => state.toggleOpen,
  );

  const sessionsQuery = useSessions({
    search: debouncedSearch || undefined,
  });
  const { isPlaceholderData } = sessionsQuery;

  const view = useMemo(
    () => ({
      sessionsHeading: debouncedSearch ? 'Search results' : 'Recent Sessions',
    }),
    [debouncedSearch],
  );

  const committedViewRef = useRef(view);
  if (!isPlaceholderData) {
    committedViewRef.current = view;
  }

  const {
    items: sessions,
    loadMoreRef,
    hasNextPage,
  } = useInfiniteScroll<AeroSessionSummary>(sessionsQuery, {
    search: debouncedSearch,
    rootRef: listRef,
    limitWithoutSearch: 10,
  });

  const showActions = selectedFilters.includes('Actions');
  const showSessions = selectedFilters.includes('Sessions');

  function onSelect(callback: () => void) {
    toggleIsOpen();
    callback();
  }

  const flatItems = useMemo<VirtualPaletteItem[]>(() => {
    const items: VirtualPaletteItem[] = [];
    const query = debouncedSearch.trim().toLowerCase();

    const hasHeader = () => items.some((item) => item.kind === 'header');

    if (showActions) {
      const allActions: Extract<VirtualPaletteItem, { kind: 'action' }>[] = [
        {
          kind: 'action',
          id: 'action-new-chat',
          textValue: 'New Chat',
          icon: Comment,
          label: 'New Chat',
          onAction: () => onSelect(() => navigate({ to: '/new' })),
        },
        {
          kind: 'action',
          id: 'action-settings',
          textValue: 'Settings',
          icon: Gear,
          label: 'Settings',
          onAction: () => onSelect(openSettingsModal),
        },
        {
          kind: 'action',
          id: 'action-shortcuts',
          textValue: 'Shortcuts',
          icon: Keyboard,
          label: 'Shortcuts',
          onAction: () =>
            onSelect(() =>
              toggleOpenShortcutsModal({ children: <ShortcutsModal /> }),
            ),
        },
      ];

      const filteredActions = query
        ? allActions.filter((a) => a.textValue.toLowerCase().includes(query))
        : allActions;

      if (filteredActions.length > 0) {
        items.push({
          kind: 'header',
          id: 'header-actions',
          title: 'Actions',
          isFirst: !hasHeader(),
        });
        items.push(...filteredActions);
      }
    }

    if (showSessions && sessions.length > 0) {
      items.push({
        kind: 'header',
        id: 'header-sessions',
        title: committedViewRef.current.sessionsHeading,
        isFirst: !hasHeader(),
      });

      sessions.forEach((session) => {
        items.push({
          kind: 'session',
          id: session.id,
          session,
        });
      });

      if (hasNextPage) {
        items.push({ kind: 'loader', id: 'sentinel-loader' });
      }
    }

    return items;
  }, [
    showActions,
    showSessions,
    sessions,
    debouncedSearch,
    hasNextPage,
    committedViewRef.current.sessionsHeading,
  ]);

  const layout = useMemo(
    () =>
      new ListLayout({
        headingSize: 32,
        loaderSize: 36,
        estimatedRowSize: 48,
      }),
    [],
  );

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [debouncedSearch]);

  return (
    <Virtualizer layout={layout}>
      <Command.List
        ref={listRef}
        items={flatItems}
        selectionMode='single'
        shouldFocusWrap={false}
        autoFocus='first'
        renderEmptyState={() => (
          <div className='text-muted flex h-16 items-center justify-center text-sm'>
            No files, sessions, and commands match that search.
          </div>
        )}
        className='max-h-[380px] w-full scroll-py-8 overflow-x-hidden overflow-y-auto px-0'
      >
        {(item) => {
          const typedItem = item as VirtualPaletteItem;

          switch (typedItem.kind) {
            case 'header':
              return (
                <Command.Item
                  key={typedItem.id}
                  id={typedItem.id}
                  textValue={typedItem.title}
                  isDisabled
                  className={cn(
                    'pointer-events-none mx-2 flex h-[24px] items-end px-2 text-xs font-medium select-none aria-selected:bg-transparent',
                    typedItem.isFirst ? 'h-[24px]' : 'h-[32px]',
                  )}
                >
                  {typedItem.title}
                </Command.Item>
              );

            case 'action':
              return (
                <Command.Item
                  key={typedItem.id}
                  textValue={typedItem.textValue}
                  onAction={typedItem.onAction}
                  className='mx-2'
                >
                  <Icon data={typedItem.icon} className='shrink-0' />
                  <span className='truncate'>{typedItem.label}</span>
                </Command.Item>
              );

            case 'session': {
              const updatedAtStr = formatCompactRelativeTime(
                typedItem.session.updatedAt,
              );
              return (
                <Command.Item
                  key={typedItem.id}
                  id={typedItem.id}
                  textValue={`${typedItem.session.title} Recent session`}
                  onAction={() =>
                    onSelect(() =>
                      navigate({ to: `/sessions/${typedItem.session.id}` }),
                    )
                  }
                  className='mx-2 h-[48px]'
                >
                  <Icon data={Comment} className='shrink-0' />
                  <div className='flex min-w-0 flex-1 flex-col justify-center'>
                    <span className='text-foreground truncate text-sm leading-tight font-medium'>
                      {typedItem.session.title}
                    </span>
                    <span className='text-muted truncate text-xs'>
                      Recent chat
                    </span>
                  </div>
                  <span className='text-muted ml-auto shrink-0 text-[11px]'>
                    {updatedAtStr}
                  </span>
                </Command.Item>
              );
            }

            case 'loader':
              return (
                <CommandPaletteLoader
                  key={typedItem.id}
                  id={typedItem.id}
                  loadMoreRef={loadMoreRef}
                />
              );
          }
        }}
      </Command.List>
    </Virtualizer>
  );
}
