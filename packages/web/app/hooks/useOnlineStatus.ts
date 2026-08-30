import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

export function useOnlineStatus() {
  return useSyncExternalStore(
    (callback) => onlineManager.subscribe(callback),
    () => onlineManager.isOnline(),
    () => true,
  );
}
