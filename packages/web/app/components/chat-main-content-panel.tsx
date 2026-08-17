import type { ReactNode } from 'react';

import { Resizable } from '@aero/ui';

export function ChatMainContentPanel({ children }: { children: ReactNode }) {
  return (
    <Resizable.Panel className='h-full min-w-0'>
      <div>{children}</div>
    </Resizable.Panel>
  );
}
