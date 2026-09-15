// @ts-nocheck
import { useCallback, useState } from 'react';

export function useLatestValueRef<T>(value: T) {
  const ref = useState({ current: value })[0];
  ref.current = value;
  return ref;
}
