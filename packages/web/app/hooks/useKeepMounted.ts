import { useEffect } from 'react';

import { useKeepMountedStoreFeed } from '@/app/stores/keep-mounted';

export function useKeepMountedFeed(id: string, shouldKeep: boolean) {
  const setKeep = useKeepMountedStoreFeed((s) => s.setKeep);
  useEffect(() => {
    setKeep(id, shouldKeep);
  }, [id, shouldKeep, setKeep]);

  useEffect(() => {
    return () => setKeep(id, false);
  }, [id, setKeep]);
}
