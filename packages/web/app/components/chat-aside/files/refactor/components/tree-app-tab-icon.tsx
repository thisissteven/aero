import type { TreeAppResolvedTabIcon } from '../tree-app-types';

export function TreeAppTabIcon({
  colored,
  icon,
}: {
  colored: boolean;
  icon: TreeAppResolvedTabIcon;
}): React.JSX.Element {
  const href = `#${icon.name.replace(/^#/, '')}`;
  const viewBox =
    icon.viewBox ??
    `0 0 ${String(icon.width ?? 16)} ${String(icon.height ?? 16)}`;
  const colorStyle =
    colored && icon.token != null
      ? {
          color: `var(--trees-file-icon-color-${icon.token}, var(--trees-file-icon-color))`,
        }
      : undefined;

  return (
    <svg
      aria-hidden='true'
      data-icon-name={icon.name}
      data-icon-token={icon.token}
      viewBox={viewBox}
      width={icon.width ?? 16}
      height={icon.height ?? 16}
      className='h-4 w-4 shrink-0'
      style={colorStyle}
    >
      <use href={href} />
    </svg>
  );
}
