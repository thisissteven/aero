import { useEffect } from 'react';

import { useKeepMountedStore } from '@/app/stores/keep-mounted';

export function useKeepMounted(id: string, shouldKeep: boolean) {
  const setKeep = useKeepMountedStore((s) => s.setKeep);
  useEffect(() => {
    setKeep(id, shouldKeep);
  }, [id, shouldKeep, setKeep]);

  useEffect(() => {
    return () => setKeep(id, false);
  }, [id, setKeep]);
}
