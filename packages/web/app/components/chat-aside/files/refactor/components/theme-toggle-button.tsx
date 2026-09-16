import { IconMoon, IconSun } from '@pierre/icons';
import { CHROME_STYLES } from '../tree-app-constants';
import type { TreeAppTheme } from '../tree-app-types';

export function ThemeToggleButton({
  onToggle,
  theme,
}: {
  onToggle: () => void;
  theme: TreeAppTheme;
}): React.JSX.Element {
  const chrome = CHROME_STYLES[theme];
  const nextLabel =
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button
      type='button'
      onClick={onToggle}
      title={nextLabel}
      aria-label={nextLabel}
      className={[
        'flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-sm opacity-25 transition duration-150 group-hover/tabbar:opacity-100 focus-visible:opacity-100',
        chrome.themeToggleButton,
      ].join(' ')}
    >
      {theme === 'dark' ? (
        <IconSun aria-hidden='true' className='h-4 w-4' />
      ) : (
        <IconMoon aria-hidden='true' className='h-4 w-4' />
      )}
    </button>
  );
}
