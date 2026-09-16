import { IconFilePlus, IconFolderPlus, IconSearch } from '@pierre/icons';
import { CHROME_STYLES } from '../tree-app-constants';
import type {
  TreeAppProjectHeaderRenderContext,
  TreeAppTheme,
} from '../tree-app-types';
import { WindowControls } from './window-controls';

export function DefaultProjectHeader({
  actions,
  isSearchEnabled,
  isSearchOpen,
  projectName,
  theme,
}: TreeAppProjectHeaderRenderContext & {
  theme: TreeAppTheme;
}): React.JSX.Element {
  const chrome = CHROME_STYLES[theme];
  return (
    <div className='mb-2 flex h-10 items-center justify-between gap-2 px-3 py-3'>
      <div className='flex min-w-0 items-center gap-2.5'>
        <WindowControls />
        <div
          className={[
            'min-w-0 truncate text-xs font-medium',
            chrome.headerTitle,
          ].join(' ')}
        >
          {projectName}
        </div>
      </div>
      <div className='flex items-center gap-2'>
        {isSearchEnabled ? (
          // Search button sits outside the hover-only opacity group so that
          // when search is active the user always sees the toggle that closes
          // it. When search is closed we still only reveal it on hover.
          <button
            type='button'
            title={isSearchOpen ? 'Clear and close search' : 'Search files'}
            aria-pressed={isSearchOpen}
            // preventDefault on mousedown keeps focus on the search input so
            // its onBlur handler doesn't race our click and auto-close+reopen
            // the search.
            onMouseDown={(event) => {
              if (isSearchOpen) {
                event.preventDefault();
              }
            }}
            onClick={actions.toggleSearch}
            className={[
              'h-4 w-4 transition-opacity duration-150 cursor-pointer',
              isSearchOpen
                ? `${chrome.headerSearchActive} opacity-100`
                : `${chrome.headerSearchInactive} opacity-25 focus-visible:opacity-100`,
            ].join(' ')}
          >
            <IconSearch aria-hidden='true' className='h-[14px] w-[14px]' />
          </button>
        ) : null}
        {/* New file/folder buttons live inside the explorer hover group. */}
        <div className='flex items-center gap-2 opacity-25 transition-opacity duration-150 group-hover/tree-app-explorer:opacity-100 focus-within:opacity-100'>
          <button
            type='button'
            title='New file'
            onClick={actions.addFile}
            className={['h-4 w-4 cursor-pointer', chrome.headerIconButton].join(
              ' ',
            )}
          >
            <IconFilePlus aria-hidden='true' />
          </button>
          <button
            type='button'
            title='New folder'
            onClick={actions.addFolder}
            className={['h-4 w-4 cursor-pointer', chrome.headerIconButton].join(
              ' ',
            )}
          >
            <IconFolderPlus aria-hidden='true' />
          </button>
        </div>
      </div>
    </div>
  );
}
