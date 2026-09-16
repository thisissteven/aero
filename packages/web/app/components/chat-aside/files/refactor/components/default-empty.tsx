import { CHROME_STYLES } from '../tree-app-constants';
import type { TreeAppTheme } from '../tree-app-types';

export function DefaultEmpty({
  theme,
}: {
  theme: TreeAppTheme;
}): React.JSX.Element {
  const chrome = CHROME_STYLES[theme];
  return (
    <div
      className={[
        'flex flex-1 items-center justify-center px-6 text-sm',
        chrome.emptyText,
      ].join(' ')}
    >
      Select a file from the explorer.
    </div>
  );
}
