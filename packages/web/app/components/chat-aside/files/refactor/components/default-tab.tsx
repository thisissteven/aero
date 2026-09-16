import { IconX } from '@pierre/icons';
import { basename } from 'path';
import { TreeAppTabIcon } from '@/app/components/chat-aside/files/refactor/components/tree-app-tab-icon';
import { CHROME_STYLES } from '@/app/components/chat-aside/files/refactor/tree-app-constants';
import {
  TreeAppResolvedTabIcon,
  TreeAppTabRenderContext,
  TreeAppTheme,
} from '@/app/components/chat-aside/files/refactor/tree-app-types';

interface DefaultTabProps extends TreeAppTabRenderContext {
  icon: TreeAppResolvedTabIcon;
  iconsColored: boolean;
  isMobile: boolean;
  theme: TreeAppTheme;
}

export function DefaultTab({
  activate,
  close,
  icon,
  iconsColored,
  isActive,
  isMobile,
  isUnsaved,
  path,
  theme,
}: DefaultTabProps): React.JSX.Element {
  const chrome = CHROME_STYLES[theme];
  const label = basename(path);
  return (
    <div
      className={[
        'group relative isolate flex h-7 max-w-[200px] items-center overflow-hidden rounded-sm text-xs font-medium transition-colors',
        isActive ? chrome.tabActive : chrome.tabInactive,
      ].join(' ')}
    >
      <button
        type='button'
        onClick={activate}
        title={isUnsaved ? `${path} (unsaved)` : path}
        className='relative z-0 flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-md pr-3 pl-2 text-left'
      >
        <TreeAppTabIcon colored={iconsColored} icon={icon} />
        <span className='block truncate'>{label}</span>
        {isUnsaved ? (
          <span
            aria-label='Unsaved changes'
            className='ml-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3b82f6]'
            title='Unsaved changes'
          />
        ) : null}
      </button>
      {isMobile ? null : (
        <>
          <div
            aria-hidden='true'
            className={[
              'pointer-events-none absolute top-0 right-0 bottom-0 z-10 w-12 bg-gradient-to-l to-transparent opacity-0 transition-opacity group-hover:opacity-100',
              chrome.tabCloseGradientFrom,
            ].join(' ')}
          />
          {/* The close button is invisible until the tab is hovered. It must
              also be non-interactive while hidden, otherwise clicks on the
              right edge of a tab silently close it instead of activating it. */}
          <button
            type='button'
            onClick={close}
            title='Close tab'
            aria-label={`Close ${label}`}
            className={[
              'pointer-events-none absolute top-1/2 right-1 z-20 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 focus:pointer-events-auto focus:opacity-100',
              chrome.tabCloseButton,
            ].join(' ')}
          >
            <IconX aria-hidden='true' className='h-3 w-3' />
          </button>
        </>
      )}
    </div>
  );
}
