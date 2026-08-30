import { ChevronLeft, ChevronRight, Folder } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Modal, SearchField } from '@aero/ui';

export const Route = createFileRoute('/_app/plugins/')({
  component: PluginsPage,
});

function PluginsPage() {
  return (
    <FolderPicker
      onSelect={(path) => {
        console.log('Selected:', path);
      }}
    />
  );
}

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

interface SearchResult {
  name: string;
  path: string;
}

interface SearchResponse {
  root: string;
  query: string;
  results: SearchResult[];
  truncated: boolean;
}

interface FolderNavigatorProps {
  endpoint?: string;
  onSelect?: (path: string) => void;
}

export function FolderPicker({
  endpoint = '/api/folder-picker',
  onSelect,
}: FolderNavigatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [roots, setRoots] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [parent, setParent] = useState<string | null>(null);
  const [directories, setDirectories] = useState<DirectoryEntry[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRoots = useCallback(async () => {
    try {
      const response = await fetch(`${endpoint}/roots`);

      if (!response.ok) {
        throw new Error(`Failed to load filesystem roots`);
      }

      const data = (await response.json()) as RootResponse;

      setRoots(data.roots);

      if (!currentPath && data.roots.length > 0) {
        await loadDirectory(data.roots[0]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load filesystem roots',
      );
    }
  }, [currentPath, endpoint]);

  const loadDirectory = useCallback(
    async (path: string) => {
      setLoading(true);
      setError(null);
      setSearchQuery('');
      setSearchResults([]);

      try {
        const response = await fetch(
          `${endpoint}/list?path=${encodeURIComponent(path)}`,
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error ?? `Failed to load directory`);
        }

        const result = data as DirectoryResponse;

        setCurrentPath(result.path);
        setParent(result.parent);
        setDirectories(result.directories);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load directory',
        );
      } finally {
        setLoading(false);
      }
    },
    [endpoint],
  );

  const searchDirectories = useCallback(async () => {
    const query = searchQuery.trim();

    if (!query || !currentPath) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        path: currentPath,
        query,
      });

      const response = await fetch(`${endpoint}/search?${params.toString()}`);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? 'Search failed');
      }

      const result = data as SearchResponse;

      setSearchResults(result.results);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to search directories',
      );
    } finally {
      setSearching(false);
    }
  }, [currentPath, endpoint, searchQuery]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void loadRoots();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      void searchDirectories();
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isOpen, searchQuery, searchDirectories]);

  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(currentPath),
    [currentPath],
  );

  const isSearching = searchQuery.trim().length > 0;

  const handleClose = () => {
    setIsOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  };

  const handleSelect = () => {
    if (!currentPath) {
      return;
    }

    onSelect?.(currentPath);
    handleClose();
  };

  return (
    <>
      <button
        type='button'
        onClick={() => setIsOpen(true)}
        className='text-muted hover:text-foreground hover:bg-surface-secondary flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors'
      >
        <Icon data={Folder} size={16} />
        <span>Choose folder</span>
      </button>

      <Modal
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleClose();
          }
        }}
      >
        <Modal.Backdrop>
          <Modal.Container size='cover'>
            <Modal.Dialog className='bg-surface text-foreground my-auto flex h-[min(680px,calc(100vh-48px))] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border-0 p-0 shadow-none'>
              {/* Header */}
              <div className='border-separator flex shrink-0 items-center gap-3 border-b px-5 py-4'>
                <div className='bg-surface-secondary flex size-9 shrink-0 items-center justify-center rounded-lg'>
                  <Icon data={Folder} size={18} />
                </div>

                <div className='min-w-0 flex-1'>
                  <div className='text-sm font-medium'>Select folder</div>
                  <div className='text-muted truncate text-xs'>
                    Choose a directory to use as your workspace
                  </div>
                </div>

                <Modal.CloseTrigger className='text-muted hover:text-foreground static transition-colors' />
              </div>

              {/* Search */}
              <div className='border-separator shrink-0 border-b px-4 py-3'>
                <SearchField
                  value={searchQuery}
                  onChange={setSearchQuery}
                  className='w-full'
                  variant='primary'
                >
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input
                      placeholder='Search directories'
                      className='w-full text-sm'
                    />
                    <SearchField.ClearButton />
                  </SearchField.Group>
                </SearchField>
              </div>

              {/* Breadcrumbs */}
              <div className='border-separator flex shrink-0 scrollbar-thin items-center gap-1 overflow-x-auto border-b px-4 py-2.5'>
                <button
                  type='button'
                  disabled={!parent || loading}
                  onClick={() => {
                    if (parent) {
                      void loadDirectory(parent);
                    }
                  }}
                  className='text-muted hover:text-foreground hover:bg-surface-secondary flex size-7 shrink-0 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-40'
                >
                  <Icon data={ChevronLeft} size={16} />
                </button>

                {breadcrumbs.map((breadcrumb, index) => (
                  <div
                    key={breadcrumb.path}
                    className='flex shrink-0 items-center gap-1'
                  >
                    {index > 0 && (
                      <Icon
                        data={ChevronRight}
                        size={14}
                        className='text-muted'
                      />
                    )}

                    <button
                      type='button'
                      onClick={() => {
                        void loadDirectory(breadcrumb.path);
                      }}
                      className={`max-w-48 truncate rounded px-1.5 py-1 text-xs transition-colors ${
                        index === breadcrumbs.length - 1
                          ? 'text-foreground font-medium'
                          : 'text-muted hover:text-foreground hover:bg-surface-secondary'
                      }`}
                      title={breadcrumb.path}
                    >
                      {breadcrumb.name}
                    </button>
                  </div>
                ))}
              </div>

              {/* Content */}
              <div className='min-h-0 flex-1 scrollbar-thin overflow-y-auto'>
                {error ? (
                  <div className='flex h-full items-center justify-center px-6'>
                    <div className='text-danger text-sm'>{error}</div>
                  </div>
                ) : isSearching ? (
                  <SearchResults
                    results={searchResults}
                    searching={searching}
                    onOpen={(path) => {
                      void loadDirectory(path);
                    }}
                  />
                ) : (
                  <DirectoryList
                    directories={directories}
                    loading={loading}
                    parent={parent}
                    roots={roots}
                    currentPath={currentPath}
                    onOpen={(path) => {
                      void loadDirectory(path);
                    }}
                  />
                )}
              </div>

              {/* Footer */}
              <div className='border-separator flex shrink-0 items-center justify-between border-t px-4 py-3'>
                <div className='text-muted min-w-0 truncate pr-4 text-xs'>
                  {currentPath || 'No folder selected'}
                </div>

                <div className='flex shrink-0 items-center gap-2'>
                  <button
                    type='button'
                    onClick={handleClose}
                    className='text-muted hover:text-foreground hover:bg-surface-secondary rounded-md px-3 py-1.5 text-xs font-medium transition-colors'
                  >
                    Cancel
                  </button>

                  <button
                    type='button'
                    disabled={!currentPath || loading}
                    onClick={handleSelect}
                    className='bg-accent text-accent-foreground rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40'
                  >
                    Select folder
                  </button>
                </div>
              </div>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

interface DirectoryListProps {
  directories: DirectoryEntry[];
  loading: boolean;
  parent: string | null;
  roots: string[];
  currentPath: string;
  onOpen: (path: string) => void;
}

function DirectoryList({
  directories,
  loading,
  parent,
  roots,
  currentPath,
  onOpen,
}: DirectoryListProps) {
  if (!currentPath) {
    return (
      <div className='p-4'>
        <div className='text-muted mb-2 px-2 text-[10px] font-semibold tracking-wider uppercase'>
          Locations
        </div>

        <div className='space-y-1'>
          {roots.map((root) => (
            <FolderRow
              key={root}
              name={root}
              path={root}
              onClick={() => onOpen(root)}
            />
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-muted text-xs'>Loading...</div>
      </div>
    );
  }

  return (
    <div className='p-3'>
      {parent && (
        <button
          type='button'
          onClick={() => onOpen(parent)}
          className='text-muted hover:text-foreground hover:bg-surface-secondary mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors'
        >
          <Icon data={ChevronLeft} size={16} />

          <span>..</span>
        </button>
      )}

      {directories.length === 0 ? (
        <div className='text-muted flex min-h-40 items-center justify-center text-xs'>
          This folder contains no directories.
        </div>
      ) : (
        <div className='space-y-0.5'>
          {directories.map((directory) => (
            <FolderRow
              key={directory.path}
              name={directory.name}
              path={directory.path}
              onClick={() => onOpen(directory.path)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FolderRow({
  name,
  path,
  onClick,
}: {
  name: string;
  path: string;
  onClick: () => void;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='group hover:bg-surface-secondary flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors'
    >
      <div className='text-muted group-hover:text-foreground shrink-0'>
        <Icon data={Folder} size={17} />
      </div>

      <div className='min-w-0 flex-1'>
        <div className='text-foreground truncate text-sm'>{name}</div>

        <div className='text-muted truncate text-[11px]'>{path}</div>
      </div>

      <Icon
        data={ChevronRight}
        size={14}
        className='text-muted opacity-0 transition-opacity group-hover:opacity-100'
      />
    </button>
  );
}

function SearchResults({
  results,
  searching,
  onOpen,
}: {
  results: SearchResult[];
  searching: boolean;
  onOpen: (path: string) => void;
}) {
  if (searching) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-muted text-xs'>Searching...</div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-muted text-xs'>No directories found.</div>
      </div>
    );
  }

  return (
    <div className='p-3'>
      <div className='text-muted mb-2 px-2 text-[10px] font-semibold tracking-wider uppercase'>
        Search results
      </div>

      <div className='space-y-0.5'>
        {results.map((result) => (
          <FolderRow
            key={result.path}
            name={result.name}
            path={result.path}
            onClick={() => onOpen(result.path)}
          />
        ))}
      </div>
    </div>
  );
}

interface Breadcrumb {
  name: string;
  path: string;
}

function buildBreadcrumbs(inputPath: string): Breadcrumb[] {
  if (!inputPath) {
    return [];
  }

  const normalized = inputPath.replaceAll('\\', '/');

  const driveMatch = normalized.match(/^([A-Za-z]:)(?:\/(.*))?$/);

  if (driveMatch) {
    const drive = driveMatch[1];
    const remainder = driveMatch[2];

    const breadcrumbs: Breadcrumb[] = [
      {
        name: drive,
        path: `${drive}/`,
      },
    ];

    if (!remainder) {
      return breadcrumbs;
    }

    let accumulated = `${drive}/`;

    for (const part of remainder.split('/').filter(Boolean)) {
      accumulated += `${part}/`;

      breadcrumbs.push({
        name: part,
        path: accumulated.replace(/\/$/, ''),
      });
    }

    return breadcrumbs;
  }

  if (normalized.startsWith('/')) {
    const breadcrumbs: Breadcrumb[] = [
      {
        name: '/',
        path: '/',
      },
    ];

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

  return [
    {
      name: normalized,
      path: normalized,
    },
  ];
}
