import { useCallback, useState } from 'react';

export function useResettableState<T>(initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  const resetState = useCallback((valueOrUpdater: T | ((prev: T) => T)) => {
    setState(valueOrUpdater as any);
  }, []);
  return [state, resetState] as const;
}
