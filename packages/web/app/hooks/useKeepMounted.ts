import { useEffect } from 'react';

import {
  useKeepMountedStoreContext,
  useKeepMountedStoreFeed,
} from '@/app/stores/keep-mounted';

export function useKeepMountedFeed(id: string, shouldKeep: boolean) {
  const setKeep = useKeepMountedStoreFeed((s) => s.setKeep);
  useEffect(() => {
    setKeep(id, shouldKeep);
  }, [id, shouldKeep, setKeep]);

  useEffect(() => {
    return () => setKeep(id, false);
  }, [id, setKeep]);
}

export function useKeepMountedContext(id: string, shouldKeep: boolean) {
  const setKeep = useKeepMountedStoreContext((s) => s.setKeep);
  useEffect(() => {
    setKeep(id, shouldKeep);
  }, [id, shouldKeep, setKeep]);

  useEffect(() => {
    return () => setKeep(id, false);
  }, [id, setKeep]);
}
