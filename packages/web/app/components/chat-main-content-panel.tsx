import { Resizable } from '@aero/ui';
import type { ReactNode } from 'react';

export function ChatMainContentPanel({ children }: { children: ReactNode }) {
  return (
    <Resizable.Panel id='main-content-panel' className='h-full min-w-0'>
      {children}
    </Resizable.Panel>
  );
}
