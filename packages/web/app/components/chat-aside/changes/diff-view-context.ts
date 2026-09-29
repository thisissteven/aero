// app/components/chat-aside/changes/diff-view-context.ts
//
// Context for the shared split/unified pref used by diff blocks.

import { createContext, useContext } from 'react';

export type DiffViewMode = 'split' | 'unified';

export interface DiffViewContextValue {
  viewMode: DiffViewMode;
  setViewMode: (mode: DiffViewMode) => void;
}

export const DiffViewContext = createContext<DiffViewContextValue>({
  viewMode: 'unified',
  setViewMode: () => {
    //
  },
});

export function useDiffViewMode() {
  return useContext(DiffViewContext);
}
