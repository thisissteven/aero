export function usePortalContainer(): HTMLElement | null {
  return typeof document !== 'undefined' ? document.body : null;
}
