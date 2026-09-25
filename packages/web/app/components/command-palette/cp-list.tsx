import { Command, cn, ListLayout, Virtualizer } from '@aero/ui';
import { Comment, Gear, Keyboard } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useRef } from 'react';

import { openFileWhenReady } from '@/app/components/chat-aside/files/open-file-when-ready';
import { SessionItemMetadata } from '@/app/components/chat-sidebar/session/session-item-metadata';
import { ShortcutsModal } from '@/app/components/chat-sidebar/sidebar-footer';
import { WorkspaceIcon } from '@/app/components/chat-sidebar/workspace/workspace-icon';
import { useWorkspaceStore } from '@/app/components/chat-sidebar/workspace/workspaces-store';
import { useCommandPaletteStore } from '@/app/components/command-palette/command-palette-store';
import { CommandPaletteLoader } from '@/app/components/command-palette/cp-loader';
import { FileTypeIcon } from '@/app/components/file-type-icon';
import { MiddleTruncatePath } from '@/app/components/tool-call-view/middle-truncate-path';
import { useSessionDirectory, useSessions } from '@/app/hooks/api/sessions';
import { useFilesInDirectory } from '@/app/hooks/api/system';
import { useWorkspaces } from '@/app/hooks/api/workspaces';
import { useI18n } from '@/app/hooks/i18n';
import { useInfiniteScroll } from '@/app/hooks/useInfiniteScroll';
import { formatCompactRelativeTime } from '@/app/lib';
import { toWorkspaceRelative } from '@/app/lib/file';
import { useGlobalModalStore } from '@/app/providers';
import { useSettingsModalStore } from '@/app/providers/settings/settings-store';
import { useSidePanelStore } from '@/app/stores/side-panel-store';
import type {
  AeroSessionSummary,
  AeroWorkspaceSummary,
} from '@/server/services/harness/types';

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
  | { kind: 'workspace'; id: string; workspace: AeroWorkspaceSummary }
  | { kind: 'file'; id: string; file: string }
  | {
      kind: 'loader';
      id: string;
      loadMoreRef: (node: HTMLElement | null) => void;
    };

export function CommandPaletteList() {
  const { t } = useI18n();
  const listRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

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
    childSessions: true,
  });
  const { isPlaceholderData } = sessionsQuery;

  const view = useMemo(
    () => ({
      sessionsHeading: debouncedSearch
        ? t.commandPalette.searchResults
        : t.session.recentSessions,
    }),
    [debouncedSearch, t],
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

  const workspacesQuery = useWorkspaces(debouncedSearch || undefined);

  const {
    items: workspaces,
    loadMoreRef: loadMoreWorkspacesRef,
    hasNextPage: hasNextWorkspacesPage,
  } = useInfiniteScroll<AeroWorkspaceSummary>(workspacesQuery, {
    search: debouncedSearch,
    rootRef: listRef,
    limitWithoutSearch: 5,
  });

  const directory = useSessionDirectory();

  const { data: files = [] } = useFilesInDirectory({
    harnessId: undefined,
    directory,
    query: debouncedSearch,
    limit: debouncedSearch.length > 0 ? '20' : '5',
  });

  function onSelect(callback: () => void) {
    toggleIsOpen();
    callback();
  }

  function openIsolatedWorkspace(workspace: AeroWorkspaceSummary) {
    const store = useWorkspaceStore.getState();
    store.setState('isolated');
    store.setIsolatedWorkspaceDirectory(workspace.directory);
    store.setIsWorkspacesOpen(true);
  }

  const selectedFilters = useCommandPaletteStore(
    (state) => state.selectedFilters,
  );

  const flatItems = useMemo<VirtualPaletteItem[]>(() => {
    const items: VirtualPaletteItem[] = [];
    const query = debouncedSearch.trim().toLowerCase();

    const hasHeader = () => items.some((item) => item.kind === 'header');

    const showActions = selectedFilters.includes('Actions');
    const showFiles = selectedFilters.includes('Files');
    const showSessions = selectedFilters.includes('Sessions');
    const showWorkspaces = selectedFilters.includes('Workspaces');

    if (showActions) {
      const allActions: Extract<VirtualPaletteItem, { kind: 'action' }>[] = [
        {
          kind: 'action',
          id: 'action-new-chat',
          textValue: t.commandPalette.newChat,
          icon: Comment,
          label: t.commandPalette.newChat,
          onAction: () => onSelect(() => navigate({ to: '/new' })),
        },
        {
          kind: 'action',
          id: 'action-settings',
          textValue: t.common.settings,
          icon: Gear,
          label: t.common.settings,
          onAction: () => onSelect(openSettingsModal),
        },
        {
          kind: 'action',
          id: 'action-shortcuts',
          textValue: t.common.shortcuts,
          icon: Keyboard,
          label: t.common.shortcuts,
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
          title: t.common.actions,
          isFirst: !hasHeader(),
        });
        items.push(...filteredActions);
      }
    }

    if (showWorkspaces && workspaces.length > 0) {
      items.push({
        kind: 'header',
        id: 'header-workspaces',
        title: t.commandPalette.workspaces,
        isFirst: !hasHeader(),
      });

      workspaces.forEach((workspace) => {
        items.push({
          kind: 'workspace',
          id: workspace.id,
          workspace,
        });
      });

      if (hasNextWorkspacesPage && debouncedSearch !== '') {
        items.push({
          kind: 'loader',
          id: 'workspaces-loader',
          loadMoreRef: loadMoreWorkspacesRef,
        });
      }
    }

    if (showFiles && files.length > 0) {
      items.push({
        kind: 'header',
        id: 'header-files',
        title: t.common.files,
        isFirst: !hasHeader(),
      });

      files.forEach((file) => {
        items.push({
          kind: 'file',
          id: file,
          file,
        });
      });
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

      if (hasNextPage && debouncedSearch !== '') {
        items.push({
          kind: 'loader',
          id: 'sessions-loader',
          loadMoreRef,
        });
      }
    }

    return items;
  }, [
    files,
    sessions,
    workspaces,
    debouncedSearch,
    selectedFilters,
    hasNextPage,
    hasNextWorkspacesPage,
    loadMoreRef,
    loadMoreWorkspacesRef,
    committedViewRef.current.sessionsHeading,
    t,
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
        autoFocus='first'
        renderEmptyState={() => (
          <div className='text-muted flex h-16 items-center justify-center text-sm'>
            {t.commandPalette.noMatch}
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

            case 'file': {
              return (
                <Command.Item
                  key={typedItem.id}
                  textValue={typedItem.file}
                  onAction={() =>
                    onSelect(() => {
                      if (!directory) return null;

                      const relativePath = toWorkspaceRelative(
                        typedItem.file,
                        directory,
                      );
                      useSidePanelStore.getState().setActiveNavItem('files');
                      openFileWhenReady(relativePath);
                    })
                  }
                  className='mx-2'
                >
                  <FileTypeIcon
                    filePath={typedItem.file}
                    className='shrink-0'
                  />
                  <MiddleTruncatePath
                    path={typedItem.file}
                    className='text-muted ml-1'
                    fileClassName='text-foreground'
                  />
                </Command.Item>
              );
            }

            case 'session': {
              const updatedAtStr = formatCompactRelativeTime(
                typedItem.session.updatedAt,
                undefined,
                t.dateTime,
              );

              return (
                <Command.Item
                  key={typedItem.id}
                  id={typedItem.id}
                  textValue={t.commandPalette.recentSession(
                    typedItem.session.title,
                  )}
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
                    <SessionItemMetadata session={typedItem.session} />
                  </div>
                  <span className='text-muted ml-auto shrink-0 text-[11px]'>
                    {updatedAtStr}
                  </span>
                </Command.Item>
              );
            }

            case 'workspace': {
              return (
                <Command.Item
                  key={typedItem.id}
                  id={typedItem.id}
                  textValue={typedItem.workspace.name}
                  onAction={() =>
                    onSelect(() => openIsolatedWorkspace(typedItem.workspace))
                  }
                  className='mx-2 h-[48px]'
                >
                  <span className='shrink-0'>
                    <WorkspaceIcon workspace={typedItem.workspace} />
                  </span>
                  <div className='flex min-w-0 flex-1 flex-col justify-center'>
                    <span className='text-foreground truncate text-sm leading-tight font-medium'>
                      {typedItem.workspace.name}
                    </span>
                    <span className='text-muted truncate text-xs leading-tight'>
                      {typedItem.workspace.directory}
                    </span>
                  </div>
                </Command.Item>
              );
            }

            case 'loader':
              return (
                <CommandPaletteLoader
                  key={typedItem.id}
                  id={typedItem.id}
                  loadMoreRef={typedItem.loadMoreRef}
                />
              );
          }
        }}
      </Command.List>
    </Virtualizer>
  );
}
