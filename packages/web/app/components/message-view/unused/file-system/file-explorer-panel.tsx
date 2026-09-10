import { useState } from 'react';

import { FileContentPane } from '@/app/components/message-view/unused/file-system/file-content-pane';
import { FileExplorer } from '@/app/components/message-view/unused/file-system/file-explorer';
import { useLazyFileTree } from '@/app/components/message-view/unused/file-system/use-lazy-file-tree';

/** Example composition wiring the pieces together, plus a way to pick which
 * server-side directory to browse. */
export function FileExplorerPanel() {
  const [root, setRoot] = useState('');
  const [committedRoot, setCommittedRoot] = useState<string | null>(null);

  if (!committedRoot) {
    return (
      <form
        style={{ padding: 16 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (root.trim()) setCommittedRoot(root.trim());
        }}
      >
        <label style={{ display: 'block', marginBottom: 8 }}>
          Directory on the server to browse
        </label>
        <input
          value={root}
          onChange={(e) => setRoot(e.target.value)}
          placeholder='/home/me/projects/my-repo'
          style={{ width: 320 }}
        />
        <button type='submit' style={{ marginLeft: 8 }}>
          Open
        </button>
      </form>
    );
  }

  // key={committedRoot} remounts on root change, since useLazyFileTree's
  // socket is fixed for the lifetime of the hook instance.
  return <FileExplorerPanelInner key={committedRoot} root={committedRoot} />;
}

function FileExplorerPanelInner({ root }: { root: string }) {
  const [openPath, setOpenPath] = useState<string | null>(null);
  // Called once here and passed down, so the tree and the content pane
  // share a single socket/model instead of each opening their own.
  const lazyFileTree = useLazyFileTree({ root });

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <FileExplorer
        {...lazyFileTree}
        onOpenFile={setOpenPath}
        className='w-72 border-r'
      />
      <div style={{ flex: 1 }}>
        <FileContentPane socket={lazyFileTree.socket} path={openPath} />
      </div>
    </div>
  );
}
