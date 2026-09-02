import {
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Folder,
  FolderPlus,
  Magnifier,
  Xmark,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { Button, Checkbox, Label, Modal, SearchField } from '@aero/ui';

import { useGlobalModalStore } from '@/app/providers';

interface DirectoryEntry {
  name: string;
  path: string;
}

interface DirectoryResponse {
  path: string;
  parent: string | null;
  directories: DirectoryEntry[];
}

interface RootResponse {
  roots: string[];
}

interface FolderNavigatorProps {
  endpoint?: string;
  onSelect?: (path: string) => void;
}

interface FolderPickerStore {
  lastSelectedPath: string;
  setLastSelectedPath: (path: string) => void;
}

export const useFolderPickerStore = create<FolderPickerStore>()(
  persist(
    (set) => ({
      lastSelectedPath: '',
      setLastSelectedPath: (path: string) => set({ lastSelectedPath: path }),
    }),
    {
      name: 'aero-folder-picker-storage',
    },
  ),
);

export function FolderPicker({
  endpoint = '/api/folder-picker',
  onSelect,
}: FolderNavigatorProps) {
  const queryClient = useQueryClient();

  const [currentPath, setCurrentPath] = useState('');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Inline Folder Creation State
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // History stack for Explorer Back/Forward navigation
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Zustand persistent store state
  const lastSelectedPath = useFolderPickerStore(
    (state) => state.lastSelectedPath,
  );
  const setLastSelectedPath = useFolderPickerStore(
    (state) => state.setLastSelectedPath,
  );

  // 1. Fetch filesystem roots
  const rootsQuery = useQuery({
    queryKey: ['folder-picker', endpoint, 'roots'],
    queryFn: async () => {
      const response = await fetch(`${endpoint}/roots`);
      if (!response.ok) {
        throw new Error('Failed to load filesystem roots');
      }
      return (await response.json()) as RootResponse;
    },
  });

  const roots = rootsQuery.data?.roots ?? [];

  // Initialize initial path when modal opens and roots arrive
  useEffect(() => {
    if (!currentPath && roots.length > 0) {
      const initialPath =
        lastSelectedPath &&
        roots.some((root) => lastSelectedPath.startsWith(root))
          ? lastSelectedPath
          : roots[0];

      setCurrentPath(initialPath);
      setHistory([initialPath]);
      setHistoryIndex(0);
    }
  }, [currentPath, roots, lastSelectedPath]);

  // 2. Fetch active directory contents
  const listQuery = useQuery({
    queryKey: ['folder-picker', endpoint, 'list', currentPath, showHidden],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `${endpoint}/list?path=${encodeURIComponent(
          currentPath,
        )}&showHidden=${showHidden}`,
        { signal },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? 'Failed to load directory');
      }

      return data as DirectoryResponse;
    },
    enabled: Boolean(currentPath),
    placeholderData: keepPreviousData,
  });

  // 3. Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (folderName: string) => {
      const response = await fetch(`${endpoint}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentPath: currentPath,
          name: folderName,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? 'Failed to create folder');
      }

      return data;
    },
    onSuccess: () => {
      setCreateError(null);
      setIsCreatingFolder(false);
      setNewFolderName('');

      // Refresh directory contents
      queryClient.invalidateQueries({
        queryKey: ['folder-picker', endpoint, 'list', currentPath],
      });
    },
    onError: (err: Error) => {
      setCreateError(err.message);
    },
  });

  // 4. Local search filtering on active directory items
  const filteredDirectories = useMemo(() => {
    const directories = listQuery.data?.directories ?? [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return directories;
    return directories.filter((dir) => dir.name.toLowerCase().includes(query));
  }, [listQuery.data?.directories, searchQuery]);

  const navigateToPath = useCallback(
    (targetPath: string, replaceHistory = false) => {
      if (!replaceHistory && targetPath === currentPath) {
        return;
      }

      setIsCreatingFolder(false);
      setCreateError(null);
      setSearchQuery('');
      setSelectedPath(null);
      setCurrentPath(targetPath);

      setHistory((prev) => {
        if (replaceHistory) {
          setHistoryIndex(0);
          return [targetPath];
        }
        const nextHistory = [...prev.slice(0, historyIndex + 1), targetPath];
        setHistoryIndex(nextHistory.length - 1);
        return nextHistory;
      });
    },
    [currentPath, historyIndex],
  );

  const handleBack = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const targetPath = history[prevIndex];
      setHistoryIndex(prevIndex);
      setIsCreatingFolder(false);
      setSearchQuery('');
      setSelectedPath(null);
      setCurrentPath(targetPath);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const targetPath = history[nextIndex];
      setHistoryIndex(nextIndex);
      setIsCreatingFolder(false);
      setSearchQuery('');
      setSelectedPath(null);
      setCurrentPath(targetPath);
    }
  };

  const handleUp = () => {
    const parentPath = listQuery.data?.parent;
    if (parentPath) {
      navigateToPath(parentPath);
    }
  };

  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(currentPath),
    [currentPath],
  );

  const activeError =
    rootsQuery.error?.message || listQuery.error?.message || createError;

  const closeModal = useGlobalModalStore((state) => state.closeModal);

  const handleClose = () => {
    setIsCreatingFolder(false);
    setSearchQuery('');
    setSelectedPath(null);
    closeModal();
  };

  const handleSelectConfirm = () => {
    const finalSelection = selectedPath || currentPath;
    if (!finalSelection) return;

    setLastSelectedPath(finalSelection);
    onSelect?.(finalSelection);
    handleClose();
  };

  const handleStartCreateFolder = () => {
    setIsCreatingFolder(true);
    setCreateError(null);
    setNewFolderName('');
  };

  const handleCancelCreateFolder = () => {
    setIsCreatingFolder(false);
    setCreateError(null);
    setNewFolderName('');
  };

  const handleConfirmCreateFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    createFolderMutation.mutate(trimmed);
  };

  return (
    <Modal.Dialog className='bg-surface text-foreground border-separator my-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl border p-0 shadow-2xl sm:h-[min(640px,calc(100vh-48px))]'>
      {/* Explorer Toolbar */}
      <div className='border-separator bg-surface-secondary/50 flex shrink-0 flex-col gap-2 border-b px-3 py-2 sm:flex-row sm:items-center'>
        <div className='flex min-w-0 flex-1 items-center gap-2'>
          {/* Back / Forward / Up Controls */}
          <div className='flex shrink-0 items-center gap-1'>
            <button
              type='button'
              title='Back'
              disabled={historyIndex <= 0}
              onClick={handleBack}
              className='text-muted hover:text-foreground hover:bg-surface-secondary flex size-7 items-center justify-center rounded transition-colors disabled:opacity-30'
            >
              <Icon data={ChevronLeft} size={16} />
            </button>

            <button
              type='button'
              title='Forward'
              disabled={historyIndex >= history.length - 1}
              onClick={handleForward}
              className='text-muted hover:text-foreground hover:bg-surface-secondary flex size-7 items-center justify-center rounded transition-colors disabled:opacity-30'
            >
              <Icon data={ChevronRight} size={16} />
            </button>

            <button
              type='button'
              title='Up to parent directory'
              disabled={!listQuery.data?.parent}
              onClick={handleUp}
              className='text-muted hover:text-foreground hover:bg-surface-secondary flex size-7 items-center justify-center rounded font-bold transition-colors disabled:opacity-30'
            >
              <Icon data={ArrowUp} size={16} />
            </button>
          </div>

          {/* Breadcrumbs / Address Bar */}
          <div className='border-separator bg-surface flex min-w-0 flex-1 scrollbar-none items-center gap-1 overflow-x-auto rounded border px-2 py-1'>
            <Icon
              data={Folder}
              size={14}
              className='text-muted mr-1 shrink-0'
            />
            {breadcrumbs.map((breadcrumb, index) => (
              <div
                key={breadcrumb.path}
                className='flex shrink-0 items-center gap-1 text-xs'
              >
                {index > 0 && <span className='text-muted select-none'>/</span>}
                <button
                  type='button'
                  onClick={() => navigateToPath(breadcrumb.path)}
                  className={`truncate rounded px-1 py-0.5 transition-colors ${
                    index === breadcrumbs.length - 1
                      ? 'text-foreground font-semibold'
                      : 'text-muted hover:text-foreground hover:bg-surface-secondary'
                  }`}
                  title={breadcrumb.path}
                >
                  {breadcrumb.name}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Local Search Field */}
        <div className='flex w-full shrink-0 items-center gap-2 sm:w-64'>
          <div className='flex-1 sm:w-64'>
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              className='h-7 w-full'
              variant='primary'
            >
              <SearchField.Group className='border-separator rounded border'>
                <Icon data={Magnifier} size={14} className='text-muted ml-3' />
                <SearchField.Input
                  placeholder={`Search ${
                    breadcrumbs.length > 0
                      ? breadcrumbs[breadcrumbs.length - 1].name
                      : 'folder'
                  }`}
                  className='w-full pl-2 text-xs'
                />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          </div>
        </div>
      </div>

      {/* Sub-Bar Controls */}
      <div className='border-separator bg-surface-secondary/20 flex shrink-0 items-center justify-between border-b px-3 py-1.5 sm:px-4'>
        <Label className='text-muted flex cursor-pointer items-center gap-1.5 text-xs select-none'>
          <Checkbox
            name='show-hidden-items'
            slot='selection'
            isSelected={showHidden}
            onChange={setShowHidden}
            variant='secondary'
          >
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
            </Checkbox.Content>
          </Checkbox>
          <span>Show hidden items</span>
        </Label>

        {/* Create Folder Button */}
        <button
          type='button'
          onClick={handleStartCreateFolder}
          disabled={!currentPath || isCreatingFolder}
          className='text-muted hover:text-foreground hover:bg-surface-secondary flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors disabled:opacity-30'
        >
          <Icon data={FolderPlus} size={14} />
          <span>New folder</span>
        </button>
      </div>

      {/* Explorer Body */}
      <div className='flex min-h-0 flex-1 flex-col sm:flex-row'>
        {/* Navigation Pane */}
        <div className='border-separator bg-surface-secondary/30 flex w-full shrink-0 flex-row gap-1 overflow-x-auto border-b p-1.5 sm:w-48 sm:flex-col sm:gap-0.5 sm:overflow-y-auto sm:border-r sm:border-b-0 sm:p-2'>
          <div className='text-muted mb-1 hidden px-2 text-[10px] font-bold tracking-wider uppercase select-none sm:block'>
            This PC
          </div>
          {roots.map((rootPath) => (
            <button
              key={rootPath}
              type='button'
              onClick={() => navigateToPath(rootPath)}
              className={`flex shrink-0 items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs transition-colors sm:shrink sm:gap-2 ${
                currentPath.startsWith(rootPath)
                  ? 'bg-surface-secondary text-foreground font-medium'
                  : 'text-muted hover:text-foreground hover:bg-surface-secondary/50'
              }`}
            >
              <Icon data={Folder} size={14} />
              <span className='truncate'>{rootPath}</span>
            </button>
          ))}
        </div>

        {/* Directory Content List */}
        <div className='bg-surface min-h-0 flex-1 scrollbar-thin overflow-y-auto'>
          {activeError ? (
            <div className='flex h-full items-center justify-center px-6'>
              <div className='text-danger text-xs'>{activeError}</div>
            </div>
          ) : (
            <DirectoryList
              directories={filteredDirectories}
              searchQuery={searchQuery}
              selectedPath={selectedPath}
              isCreatingFolder={isCreatingFolder}
              newFolderName={newFolderName}
              isCreatingLoading={createFolderMutation.isPending}
              onNewFolderNameChange={setNewFolderName}
              onConfirmCreateFolder={handleConfirmCreateFolder}
              onCancelCreateFolder={handleCancelCreateFolder}
              onSelect={(path) => setSelectedPath(path)}
              onOpen={(path) => navigateToPath(path)}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className='border-separator bg-surface-secondary/30 flex shrink-0 flex-col items-stretch justify-between gap-2 border-t px-3 py-2 sm:flex-row sm:items-center sm:px-4 sm:py-2.5'>
        <div className='text-muted truncate text-center font-mono text-xs sm:text-left'>
          {selectedPath
            ? `Selected: ${selectedPath}`
            : `${filteredDirectories.length} folder(s) | ${currentPath}`}
        </div>

        <div className='flex shrink-0 items-center justify-end gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleClose}
            className='flex-1 sm:flex-none'
          >
            Cancel
          </Button>

          <Button
            variant='primary'
            size='sm'
            isDisabled={!currentPath && !selectedPath}
            onClick={handleSelectConfirm}
            className='flex-1 sm:flex-none'
          >
            Select Folder
          </Button>
        </div>
      </div>
    </Modal.Dialog>
  );
}

interface DirectoryListProps {
  directories: DirectoryEntry[];
  searchQuery: string;
  selectedPath: string | null;
  isCreatingFolder: boolean;
  newFolderName: string;
  isCreatingLoading: boolean;
  onNewFolderNameChange: (value: string) => void;
  onConfirmCreateFolder: () => void;
  onCancelCreateFolder: () => void;
  onSelect: (path: string) => void;
  onOpen: (path: string) => void;
}

function DirectoryList({
  directories,
  searchQuery,
  selectedPath,
  isCreatingFolder,
  newFolderName,
  isCreatingLoading,
  onNewFolderNameChange,
  onConfirmCreateFolder,
  onCancelCreateFolder,
  onSelect,
  onOpen,
}: DirectoryListProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreatingFolder) {
      inputRef.current?.focus();
    }
  }, [isCreatingFolder]);

  if (directories.length === 0 && !isCreatingFolder) {
    return (
      <div className='text-muted flex min-h-40 items-center justify-center text-xs'>
        {searchQuery ? 'No matching folders found.' : 'This folder is empty.'}
      </div>
    );
  }

  return (
    <div className='p-2 select-none'>
      <div className='text-muted border-separator/50 mb-1 grid grid-cols-1 border-b px-3 py-1 text-[11px] font-semibold sm:grid-cols-[1fr_120px]'>
        <span>Name</span>
        <span className='hidden sm:block'>Type</span>
      </div>

      <div className='space-y-0.5'>
        {/* Inline Folder Creation Row */}
        {isCreatingFolder && (
          <div className='bg-accent/10 border-accent/10 grid grid-cols-1 items-center gap-2 rounded border px-3 py-0.5 text-xs sm:grid-cols-[1fr_120px] sm:gap-3'>
            <div className='flex min-w-0 items-center gap-2'>
              <Icon data={Folder} size={16} className='text-warning shrink-0' />
              <input
                ref={inputRef}
                type='text'
                value={newFolderName}
                disabled={isCreatingLoading}
                placeholder='New folder name...'
                onChange={(e) => onNewFolderNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onConfirmCreateFolder();
                  if (e.key === 'Escape') onCancelCreateFolder();
                }}
                className='bg-surface border-separator text-foreground placeholder:text-muted focus:border-accent/30 w-full min-w-0 rounded border px-2 py-1 text-xs focus:outline-none'
              />
              <div className='flex items-center'>
                <button
                  type='button'
                  onClick={onConfirmCreateFolder}
                  disabled={isCreatingLoading || !newFolderName.trim()}
                  className='text-muted hover:text-foreground hover:bg-surface-secondary rounded p-1 transition-colors disabled:opacity-30'
                  title='Create'
                >
                  <Icon data={Check} size={14} />
                </button>
                <button
                  type='button'
                  onClick={onCancelCreateFolder}
                  disabled={isCreatingLoading}
                  className='text-muted hover:text-foreground hover:bg-surface-secondary rounded p-1 transition-colors'
                  title='Cancel'
                >
                  <Icon data={Xmark} size={14} />
                </button>
              </div>
            </div>
            <span className='text-muted hidden truncate text-[11px] select-none sm:block'>
              File folder
            </span>
          </div>
        )}

        {directories.map((dir) => (
          <FolderRow
            key={dir.path}
            name={dir.name}
            isSelected={selectedPath === dir.path}
            onSelect={() => onSelect(dir.path)}
            onDoubleClick={() => onOpen(dir.path)}
          />
        ))}
      </div>
    </div>
  );
}

function FolderRow({
  name,
  isSelected,
  onSelect,
  onDoubleClick,
}: {
  name: string;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      className={`grid cursor-pointer grid-cols-1 items-center gap-2 rounded px-3 py-1.5 text-xs transition-colors sm:grid-cols-[1fr_120px] sm:gap-3 ${
        isSelected
          ? 'bg-accent/15 text-foreground font-medium'
          : 'hover:bg-surface-secondary/70 text-foreground'
      }`}
    >
      <div className='flex min-w-0 items-center gap-2.5'>
        <Icon data={Folder} size={16} className='text-warning shrink-0' />
        <span className='truncate'>{name}</span>
      </div>

      <span className='text-muted hidden truncate text-[11px] select-none sm:block'>
        File folder
      </span>
    </div>
  );
}

interface Breadcrumb {
  name: string;
  path: string;
}

function buildBreadcrumbs(inputPath: string): Breadcrumb[] {
  if (!inputPath) return [];

  const normalized = inputPath.replaceAll('\\', '/');
  const driveMatch = normalized.match(/^([A-Za-z]:)(?:\/(.*))?$/);

  if (driveMatch) {
    const drive = driveMatch[1];
    const remainder = driveMatch[2];

    const breadcrumbs: Breadcrumb[] = [
      {
        name: `${drive}\\`,
        path: `${drive}\\`,
      },
    ];

    if (!remainder) return breadcrumbs;

    let accumulated = `${drive}\\`;

    for (const part of remainder.split('/').filter(Boolean)) {
      accumulated = `${accumulated.replace(/\\$/, '')}\\${part}`;
      breadcrumbs.push({
        name: part,
        path: accumulated,
      });
    }

    return breadcrumbs;
  }

  if (normalized.startsWith('/')) {
    const breadcrumbs: Breadcrumb[] = [{ name: '/', path: '/' }];
    let accumulated = '';

    for (const part of normalized.split('/').filter(Boolean)) {
      accumulated += `/${part}`;
      breadcrumbs.push({
        name: part,
        path: accumulated,
      });
    }

    return breadcrumbs;
  }

  return [{ name: normalized, path: normalized }];
}
