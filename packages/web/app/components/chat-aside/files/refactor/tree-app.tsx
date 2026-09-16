import type { FileContents } from '@pierre/diffs';
import type {
  Editor,
  EditorChangeEvent,
  EditorOptions,
} from '@pierre/diffs/edit';
import { File, useStableCallback, Virtualizer } from '@pierre/diffs/react';
import { createFileTreeIconResolver } from '@pierre/trees';
import { FileTree, useFileTreeSearch } from '@pierre/trees/react';
import { basename } from 'path';
import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DefaultEmpty } from '@/app/components/chat-aside/files/refactor/components/default-empty';
import { DefaultProjectHeader } from '@/app/components/chat-aside/files/refactor/components/default-project-header';
import { DefaultTab } from '@/app/components/chat-aside/files/refactor/components/default-tab';
import { ThemeToggleButton } from '@/app/components/chat-aside/files/refactor/components/theme-toggle-button';
import {
  CHROME_STYLES,
  DEFAULT_EXPLORER_WIDTH,
  DEFAULT_MAX_EXPLORER_WIDTH,
  DEFAULT_MIN_EXPLORER_WIDTH,
  DEFAULT_NEW_FILE_NAME,
  DEFAULT_NEW_FOLDER_NAME,
  FILE_STYLE,
} from '@/app/components/chat-aside/files/refactor/tree-app-constants';
import {
  TreeAppContextMenuActions,
  TreeAppProjectHeaderRenderContext,
  TreeAppProps,
  TreeAppResolvedTabIcon,
  TreeAppTabRenderContext,
  TreeAppTheme,
} from '@/app/components/chat-aside/files/refactor/tree-app-types';
import {
  areColoredTabIconsEnabled,
  getParentPath,
  getTabIconSpriteMarkup,
  pickByTheme,
  remapFileContentsMap,
  remapPathMap,
  remapPathSet,
} from '@/app/components/chat-aside/files/refactor/tree-app-utils';
import { useExplorerWidth } from '@/app/components/chat-aside/files/refactor/use-explorer-width';
import { useOpenTabs } from '@/app/components/chat-aside/files/refactor/use-open-tabs';
import { useTreeMutations } from '@/app/components/chat-aside/files/refactor/use-tree-mutations';
import { useUsesLocalFile } from '@/app/components/chat-aside/files/refactor/use-uses-local-file';
import { useLatestValueRef } from '@/app/components/chat-aside/files/temp/lib/useLatestValueRef';
import { useWindowSize } from '@/app/hooks/useWindowSize';

export function TreeApp<LAnnotation = unknown>({
  className,
  contextMenuPortalContainer: _contextMenuPortalContainer,
  defaultTheme = 'dark',
  files,
  fileOptions: fileOptionsProp,
  height = '100%',
  initialActivePath,
  initialExplorerWidth = DEFAULT_EXPLORER_WIDTH,
  initialOpenPaths,
  maxExplorerWidth = DEFAULT_MAX_EXPLORER_WIDTH,
  minExplorerWidth = DEFAULT_MIN_EXPLORER_WIDTH,
  model,
  newFileTemplateName = DEFAULT_NEW_FILE_NAME,
  newFolderTemplateName = DEFAULT_NEW_FOLDER_NAME,
  onSave,
  onThemeChange,
  preloadedTreeData,
  prerenderedHTMLByPath,
  projectName,
  renderContextMenu: _renderContextMenu,
  renderEmpty,
  renderProjectHeader,
  renderTab,
  renderWindowChrome,
  searchEnabled = false,
  showTabs = true,
  showThemeToggle = false,
  storageKey,
  style,
  tabIcons,
  theme: themeProp,
  treeClassName,
  treeStyle,
}: TreeAppProps<LAnnotation>): React.JSX.Element {
  const [internalTheme, setInternalTheme] =
    useState<TreeAppTheme>(defaultTheme);
  const theme = themeProp ?? internalTheme;
  const chrome = CHROME_STYLES[theme];

  const isMobile = useWindowSize((size) => size.width < 768);
  const { activePath, activateTab, closeTab, openPaths } = useOpenTabs({
    initialActivePath,
    initialOpenPaths,
    isMobile,
    model,
    storageKey,
  });
  const activePathRef = useLatestValueRef(activePath);

  // Edited buffers keyed by path. Prefer these over the caller-supplied `files`
  // map so tab switches keep unsaved text without requiring the host to own
  // the edit loop.
  const [editedFilesByPath, setEditedFilesByPath] = useState<
    Readonly<Record<string, FileContents>>
  >({});
  const [unsavedPaths, setUnsavedPaths] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  // Per-path baselines established by Cmd/Ctrl+S.
  const [savedBaselinesByPath, setSavedBaselinesByPath] = useState<
    Readonly<Record<string, FileContents>>
  >({});
  // A clean local snapshot only bridges the time between save and the host
  // replacing its file entry.
  const hostFilesAtSaveByPathRef = useRef(
    new Map<string, FileContents | undefined>(),
  );
  const unsavedPathsRef = useLatestValueRef(unsavedPaths);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const editorRef = useRef<Editor<'file', LAnnotation> | null>(null);
  const editorOptions = useMemo<EditorOptions<'file', LAnnotation, undefined>>(
    () => ({
      onAttach(editor) {
        editorRef.current = editor;
      },
    }),
    [],
  );

  // Marks a path unsaved (or clean). Snapshots edited contents so tab switches
  // keep the dirty buffer.
  const syncUnsavedPath = useCallback(
    (path: string, nextFile: FileContents, isUnsaved: boolean) => {
      const alreadyUnsaved = unsavedPathsRef.current.has(path);
      if (isUnsaved !== alreadyUnsaved) {
        const next = new Set(unsavedPathsRef.current);
        if (isUnsaved) {
          next.add(path);
        } else {
          next.delete(path);
        }
        unsavedPathsRef.current = next;
        setUnsavedPaths(next);
      }

      if (isUnsaved) {
        // Snapshot contents now: editor `onChange` may hand back a FileContents
        // whose `contents` is a live getter over the current TextDocument.
        const snapshot: FileContents = {
          ...nextFile,
          contents: nextFile.contents,
          name: nextFile.name ?? basename(path),
        };
        setEditedFilesByPath((current) => ({
          ...current,
          [path]: snapshot,
        }));
        return;
      }

      setEditedFilesByPath((current) => {
        if (!(path in current)) {
          return current;
        }
        const { [path]: _removed, ...rest } = current;
        return rest;
      });
    },
    [unsavedPathsRef],
  );

  const toggleTheme = useCallback(() => {
    const nextTheme: TreeAppTheme = theme === 'dark' ? 'light' : 'dark';
    if (themeProp == null) {
      setInternalTheme(nextTheme);
    }
    onThemeChange?.(nextTheme);
  }, [onThemeChange, theme, themeProp]);

  // Resolve the theme-scoped inputs once.
  const resolvedTreeStyle = pickByTheme(treeStyle, theme);
  const resolvedTreeClassName = pickByTheme(treeClassName, theme);
  const resolvedFileOptions = pickByTheme(fileOptionsProp, theme);
  const resolvedPrerenderedHTMLByPath = pickByTheme(
    prerenderedHTMLByPath,
    theme,
  );

  const handleEditorChange = useCallback(
    (file: FileContents) => {
      const path = activePathRef.current;
      if (path == null) {
        return;
      }

      const baseline = savedBaselinesByPath[path] ?? files?.[path];
      const isUnsaved = baseline == null || file.contents !== baseline.contents;
      syncUnsavedPath(path, file, isUnsaved);
    },
    [activePathRef, files, savedBaselinesByPath, syncUnsavedPath],
  );
  // The editor keeps the first onEditChange it is given, so hand it a callback
  // whose identity never changes but whose body always sees the latest handler.
  const handleEditChange = useStableCallback(
    (event: EditorChangeEvent<'file', LAnnotation, undefined>) => {
      handleEditorChange(event.file);
    },
  );

  // Cmd/Ctrl+S: treat the current buffer as saved.
  const saveActiveFile = useCallback(() => {
    const path = activePathRef.current;
    if (path == null) {
      return false;
    }

    let file: FileContents | undefined;
    try {
      file =
        editorRef.current?.getFile() ??
        editedFilesByPath[path] ??
        files?.[path];
    } catch {
      file = editedFilesByPath[path] ?? files?.[path];
    }
    if (file == null) {
      return false;
    }

    const snapshot: FileContents = {
      ...file,
      contents: file.contents,
      name: file.name ?? basename(path),
    };

    setSavedBaselinesByPath((current) => ({
      ...current,
      [path]: snapshot,
    }));
    setEditedFilesByPath((current) => ({
      ...current,
      [path]: snapshot,
    }));
    hostFilesAtSaveByPathRef.current.set(path, files?.[path]);
    if (unsavedPathsRef.current.has(path)) {
      const next = new Set(unsavedPathsRef.current);
      next.delete(path);
      unsavedPathsRef.current = next;
      setUnsavedPaths(next);
    }
    onSave?.(path, snapshot);
    return true;
  }, [activePathRef, editedFilesByPath, files, onSave, unsavedPathsRef]);

  useEffect(() => {
    const acknowledgedPaths = new Set<string>();
    for (const [path, hostFileAtSave] of hostFilesAtSaveByPathRef.current) {
      if (files?.[path] !== hostFileAtSave) {
        acknowledgedPaths.add(path);
        hostFilesAtSaveByPathRef.current.delete(path);
      }
    }
    if (acknowledgedPaths.size === 0) {
      return;
    }

    setEditedFilesByPath((current) => {
      let changed = false;
      const next = { ...current };
      for (const path of acknowledgedPaths) {
        if (!unsavedPathsRef.current.has(path) && path in next) {
          delete next[path];
          changed = true;
        }
      }
      return changed ? next : current;
    });
    setSavedBaselinesByPath((current) => {
      let changed = false;
      const next = { ...current };
      for (const path of acknowledgedPaths) {
        if (path in next) {
          delete next[path];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [files, unsavedPathsRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (container == null) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.shiftKey) {
        return;
      }
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }
      if (event.key !== 's' && event.key !== 'S') {
        return;
      }
      // composedPath crosses shadow roots (editor + tree), which `contains`
      // does not. Only handle when the event originated inside TreeApp.
      if (!event.composedPath().includes(container)) {
        return;
      }
      event.preventDefault();
      saveActiveFile();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [saveActiveFile]);

  const treeStyleRecord = resolvedTreeStyle as
    | Record<string, string | number>
    | undefined;
  const explorer = useExplorerWidth(
    initialExplorerWidth,
    minExplorerWidth,
    maxExplorerWidth,
    storageKey,
  );

  useEffect(
    () =>
      model.onMutation('*', (event) => {
        const moveEvents =
          event.operation === 'move'
            ? [event]
            : event.operation === 'batch'
              ? event.events.filter((entry) => entry.operation === 'move')
              : [];
        if (moveEvents.length === 0) {
          return;
        }

        let nextHostFilesAtSave = hostFilesAtSaveByPathRef.current;
        for (const moveEvent of moveEvents) {
          nextHostFilesAtSave = remapPathMap(
            nextHostFilesAtSave,
            moveEvent.from,
            moveEvent.to,
          );
        }
        hostFilesAtSaveByPathRef.current = nextHostFilesAtSave;

        setUnsavedPaths((current) => {
          let next = current;
          for (const moveEvent of moveEvents) {
            next = remapPathSet(next, moveEvent.from, moveEvent.to);
          }
          unsavedPathsRef.current = next;
          return next;
        });
        setEditedFilesByPath((current) => {
          let next = current;
          for (const moveEvent of moveEvents) {
            next = remapFileContentsMap(next, moveEvent.from, moveEvent.to);
          }
          return next;
        });
        setSavedBaselinesByPath((current) => {
          let next = current;
          for (const moveEvent of moveEvents) {
            next = remapFileContentsMap(next, moveEvent.from, moveEvent.to);
          }
          return next;
        });
      }),
    [model, unsavedPathsRef],
  );

  const mutations = useTreeMutations({
    model,
    newFileTemplateName,
    newFolderTemplateName,
  });
  const search = useFileTreeSearch(model);
  const toggleSearch = useCallback(() => {
    if (search.isOpen) {
      search.close();
      return;
    }
    search.open();
  }, [search]);

  const fileOptions = useMemo(
    () => ({
      ...resolvedFileOptions,
      overflow: 'wrap' as const,
      disableFileHeader: true,
    }),
    [resolvedFileOptions],
  );

  const treeSurfaceColor = useMemo(() => {
    const explicitTreeBackground =
      treeStyleRecord?.['--trees-bg-override'] ??
      treeStyleRecord?.['--trees-theme-sidebar-bg'];
    return typeof explicitTreeBackground === 'string'
      ? explicitTreeBackground
      : chrome.treeSurfaceFallback;
  }, [chrome.treeSurfaceFallback, treeStyleRecord]);

  const treeCssVariables = useMemo<CSSProperties>(() => {
    if (treeStyleRecord == null) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(treeStyleRecord).filter(([key]) =>
        key.startsWith('--trees-'),
      ),
    );
  }, [treeStyleRecord]);

  const containerStyle = useMemo<CSSProperties>(() => {
    const normalizedHeight =
      typeof height === 'number' ? `${String(height)}px` : height;
    return {
      ...treeCssVariables,
      '--tree-app-tree-surface': treeSurfaceColor,
      '--tree-app-chrome-bg': chrome.tabbarBgVar,
      '--tree-app-editor-bg': chrome.editorBgVar,
      '--tree-app-height': normalizedHeight,
      ...style,
    } as CSSProperties;
  }, [
    chrome.editorBgVar,
    chrome.tabbarBgVar,
    height,
    style,
    treeCssVariables,
    treeSurfaceColor,
  ]);

  const sidebarStyle = useMemo<CSSProperties>(
    () =>
      ({
        '--tree-app-explorer-width': `${String(explorer.width)}px`,
      }) as CSSProperties,
    [explorer.width],
  );

  const treeHostStyle = useMemo<CSSProperties>(
    () => ({
      ...resolvedTreeStyle,
      width: '100%',
      height: '100%',
      paddingBottom: 10,
      borderRadius: 8,
      border: '1px solid currentColor',
      borderColor:
        theme === 'dark' ? 'rgb(255 255 255 / 0.05)' : 'rgb(0 0 0 / 0.08)',
    }),
    [resolvedTreeStyle, theme],
  );
  const windowChromeNode = renderWindowChrome?.();
  const effectiveTabIcons = tabIcons ?? 'complete';
  const tabIconSpriteMarkup = useMemo(
    () => getTabIconSpriteMarkup(effectiveTabIcons),
    [effectiveTabIcons],
  );
  const resolveTabIcon = useMemo(
    () => createFileTreeIconResolver(effectiveTabIcons).resolveIcon,
    [effectiveTabIcons],
  );
  const tabIconsColored = useMemo(
    () => areColoredTabIconsEnabled(effectiveTabIcons),
    [effectiveTabIcons],
  );

  const headerNode = useMemo<ReactNode>(() => {
    if (projectName == null && renderProjectHeader == null) {
      return null;
    }
    const headerContext: TreeAppProjectHeaderRenderContext = {
      actions: {
        addFile: () => {
          mutations.addEntry('', 'file');
        },
        addFolder: () => {
          mutations.addEntry('', 'folder');
        },
        toggleSearch,
      },
      isSearchEnabled: searchEnabled,
      isSearchOpen: search.isOpen,
      projectName: projectName ?? '',
    };
    if (renderProjectHeader != null) {
      return renderProjectHeader(headerContext);
    }
    return <DefaultProjectHeader {...headerContext} theme={theme} />;
  }, [
    mutations,
    projectName,
    renderProjectHeader,
    search.isOpen,
    searchEnabled,
    theme,
    toggleSearch,
  ]);

  const buildContextMenuActions = useCallback(
    (
      item: import('@pierre/trees').ContextMenuItem,
    ): TreeAppContextMenuActions => {
      const baseDirectoryPath =
        item.kind === 'directory' ? item.path : getParentPath(item.path);
      return {
        addFile: () => {
          mutations.addEntry(baseDirectoryPath, 'file');
        },
        addFolder: () => {
          mutations.addEntry(baseDirectoryPath, 'folder');
        },
        remove: () => {
          mutations.remove(item);
        },
        rename: () => {
          mutations.rename(item);
        },
      };
    },
    [mutations],
  );
  // `buildContextMenuActions` and `_renderContextMenu` are kept for API
  // parity; the current slot rendering is driven by the tree model's own
  // context menu composition.
  void buildContextMenuActions;

  const activeHostFile = activePath == null ? undefined : files?.[activePath];
  const usesLocalFile = useUsesLocalFile(
    activePath,
    activeHostFile,
    unsavedPaths,
    hostFilesAtSaveByPathRef,
  );
  const activeFile =
    activePath != null && usesLocalFile
      ? (editedFilesByPath[activePath] ?? activeHostFile)
      : activeHostFile;
  // Keep unkeyed caller files isolated from edit-session mutation without
  // inventing a shared renderer-cache identity.
  const activeEditorFile = useMemo(
    () =>
      activeFile == null || activeFile.cacheKey != null
        ? activeFile
        : { ...activeFile },
    [activeFile],
  );
  // Skip stale prerendered HTML while the editor is showing local contents.
  const activePrerenderedHTML =
    activePath == null || usesLocalFile
      ? undefined
      : resolvedPrerenderedHTMLByPath?.[activePath];

  const hasTabs = showTabs && openPaths.length > 0;
  const showTabBar = hasTabs || showThemeToggle;

  // Scroll the active tab into view when the active path changes or when tabs
  // are added/removed.
  const tabScrollerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasTabs || activePath == null) return;
    const scroller = tabScrollerRef.current;
    if (scroller == null) return;
    const activeTab = scroller.querySelector<HTMLElement>(
      '[data-tree-app-tab-active="true"]',
    );
    if (activeTab == null) return;
    activeTab.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [activePath, hasTabs, openPaths]);

  // Track whether the tab scroller has hidden content on either edge so we
  // can fade the corresponding side in.
  const [tabScrollState, setTabScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });
  useEffect(() => {
    if (!hasTabs) return;
    const scroller = tabScrollerRef.current;
    if (scroller == null) return;

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scroller;
      setTabScrollState({
        canScrollLeft: scrollLeft > 1,
        canScrollRight: scrollLeft + clientWidth < scrollWidth - 1,
      });
    };

    update();
    scroller.addEventListener('scroll', update, { passive: true });
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(scroller);
    for (const child of Array.from(scroller.children)) {
      resizeObserver.observe(child);
    }

    return () => {
      scroller.removeEventListener('scroll', update);
      resizeObserver.disconnect();
    };
  }, [hasTabs, openPaths.length]);

  return (
    <div
      ref={containerRef}
      className={[
        'relative flex flex-col overflow-hidden rounded-xl bg-clip-padding border border-[rgb(0_0_0_/0.1)] dark:border-[rgb(255_255_255_/0.1)] shadow-lg p-1.5 h-[var(--tree-app-height)]',
        chrome.container,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={containerStyle}
    >
      <div
        aria-hidden='true'
        className='absolute h-0 w-0 overflow-hidden'
        dangerouslySetInnerHTML={{ __html: tabIconSpriteMarkup }}
      />
      {windowChromeNode != null ? (
        <div className='shrink-0'>{windowChromeNode}</div>
      ) : null}
      <div className='flex min-h-0 flex-1 flex-row'>
        <aside
          className='group/tree-app-explorer flex w-[var(--tree-app-explorer-width)] shrink-0 flex-col'
          style={sidebarStyle}
        >
          <FileTree
            className={resolvedTreeClassName}
            header={headerNode}
            model={model}
            preloadedData={preloadedTreeData}
            style={treeHostStyle}
          />
        </aside>
        {isMobile ? null : (
          <div
            role='separator'
            aria-orientation='vertical'
            aria-label='Resize explorer'
            onPointerDown={explorer.onPointerDown}
            onPointerMove={explorer.onPointerMove}
            onPointerUp={explorer.onPointerUp}
            onPointerCancel={explorer.onPointerUp}
            className="relative block w-px shrink-0 cursor-col-resize bg-white/0 after:absolute after:inset-y-0 after:-left-1 after:w-2 after:content-['']"
          />
        )}
        <section className='flex min-w-0 flex-1 flex-col'>
          {showTabBar ? (
            <div
              className='group/tabbar flex h-10 items-center gap-1 px-2 pt-0.75'
              style={{ backgroundColor: 'var(--tree-app-chrome-bg)' }}
            >
              <div className='relative flex min-w-0 flex-1'>
                <div
                  ref={tabScrollerRef}
                  className='scrollbar-thin flex min-w-0 flex-1 items-center gap-1 overflow-x-auto'
                >
                  {hasTabs
                    ? openPaths.map((path) => {
                        const isActive = path === activePath;
                        const tabContext: TreeAppTabRenderContext = {
                          activate: () => {
                            activateTab(path);
                          },
                          close: () => {
                            closeTab(path);
                          },
                          isActive,
                          isUnsaved: unsavedPaths.has(path),
                          path,
                        };
                        const tabIcon = resolveTabIcon(
                          'file-tree-icon-file',
                          path,
                        ) as TreeAppResolvedTabIcon;
                        return (
                          <div
                            key={path}
                            className='flex'
                            data-tree-app-tab-active={
                              isActive ? 'true' : undefined
                            }
                          >
                            {renderTab != null ? (
                              renderTab(tabContext)
                            ) : (
                              <DefaultTab
                                {...tabContext}
                                icon={tabIcon}
                                iconsColored={tabIconsColored}
                                isMobile={isMobile}
                                theme={theme}
                              />
                            )}
                          </div>
                        );
                      })
                    : null}
                </div>
                <div
                  aria-hidden='true'
                  className={[
                    'pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[var(--tree-app-chrome-bg)] to-transparent transition-opacity duration-150',
                    tabScrollState.canScrollLeft ? 'opacity-100' : 'opacity-0',
                  ].join(' ')}
                />
                <div
                  aria-hidden='true'
                  className={[
                    'pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--tree-app-chrome-bg)] to-transparent transition-opacity duration-150',
                    tabScrollState.canScrollRight ? 'opacity-100' : 'opacity-0',
                  ].join(' ')}
                />
              </div>
              {showThemeToggle ? (
                <ThemeToggleButton onToggle={toggleTheme} theme={theme} />
              ) : null}
            </div>
          ) : null}
          <div
            className='relative flex min-h-0 flex-1 bg-transparent'
            style={{ backgroundColor: 'var(--tree-app-editor-bg)' }}
          >
            <div
              className='relative flex min-h-0 flex-1'
              inert={isMobile ? true : undefined}
            >
              <Virtualizer
                className='scrollbar-thin relative min-h-0 min-w-0 flex-1 overflow-auto'
                style={{ overflow: 'auto' }}
                contentStyle={{
                  display: 'flex',
                  minHeight: '100%',
                  width: '100%',
                }}
              >
                {activeEditorFile == null ? (
                  (renderEmpty?.() ?? <DefaultEmpty theme={theme} />)
                ) : (
                  <File
                    key={`${activePath ?? 'empty'}:${theme}`}
                    style={FILE_STYLE}
                    file={activeEditorFile}
                    options={fileOptions}
                    prerenderedHTML={activePrerenderedHTML}
                    edit
                    editorOptions={editorOptions}
                    onEditChange={handleEditChange}
                  />
                )}
              </Virtualizer>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
