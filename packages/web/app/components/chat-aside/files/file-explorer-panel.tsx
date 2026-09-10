import { useParams } from '@tanstack/react-router';
import { useState } from 'react';

import { Skeleton } from '@aero/ui';

import { FileContentPane } from '@/app/components/chat-aside/files/file-content-pane';
import { FileExplorer } from '@/app/components/chat-aside/files/file-explorer';
import { useLazyFileTree } from '@/app/components/chat-aside/files/use-lazy-file-tree';
import { useSession } from '@/app/hooks/api/sessions';

export function FileExplorerPanel() {
  const { sessionId } = useParams({
    strict: false,
  });

  const { data: session, isLoading } = useSession(undefined, sessionId);

  if (!sessionId) {
    return (
      <div className='text-muted flex h-full w-full flex-1 items-center justify-center p-6 text-center text-sm'>
        Open a session to browse its files.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='relative h-full w-full'>
        <div className='absolute inset-0 space-y-3 p-4 opacity-60 dark:opacity-50'>
          <Skeleton className='h-8 w-full' />
          <Skeleton className='h-6 w-3/4' />
          <Skeleton className='h-64 w-full' />
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <FileExplorerPanelInner key={session.workspace} root={session.workspace} />
  );
}

function FileExplorerPanelInner({ root }: { root: string }) {
  const [openPath, setOpenPath] = useState<string | null>(null);

  const lazyFileTree = useLazyFileTree({ root });

  return (
    <div className='flex h-full min-h-0 w-full'>
      <div className='min-h-0 min-w-0 flex-1'>
        <FileContentPane socket={lazyFileTree.socket} path={openPath} />
      </div>
      <FileExplorer
        {...lazyFileTree}
        onOpenFile={setOpenPath}
        className='w-72 shrink-0'
      />
    </div>
  );
}
