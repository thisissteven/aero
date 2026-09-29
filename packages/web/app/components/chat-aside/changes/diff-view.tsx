// app/components/chat-aside/changes/diff-view.tsx
//
// Shared split/unified preference for a group of diff blocks. Toggling the
// view mode on any block updates every block rendered under the provider, and
// the choice carries across the changes panel and the git diff dialogs.

import { type ReactNode, useState } from 'react';

import { DiffViewContext, type DiffViewMode } from './diff-view-context';

export function DiffViewProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<DiffViewMode>('unified');

  return (
    <DiffViewContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </DiffViewContext.Provider>
  );
}
