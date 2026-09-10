import { useEffect, useRef } from 'react';

import type { PanelImperativeHandle } from '@aero/ui';
import { Resizable } from '@aero/ui';

import {
  StatusPanel,
  StatusPanelFloating,
} from '@/app/components/status-panel/status-panel';
import { useSidePanelStore } from '@/app/stores/side-panel-store';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

export function StatusAsidePanel() {
  const isOpen = useStatusPanelStore((s) => s.isOpen);
  const isSidePanelOpen = useSidePanelStore((s) => s.isOpen);

  const panelRef = useRef<PanelImperativeHandle | null>(null);
  const lastSizeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isSidePanelOpen && panelRef.current && lastSizeRef.current !== null) {
      const restoredSize = `${lastSizeRef.current}px`;

      requestAnimationFrame(() => {
        panelRef.current?.resize(restoredSize);
      });
    }
  }, [isSidePanelOpen]);

  if (!isOpen) return null;

  if (isSidePanelOpen) {
    return <StatusPanelFloating />;
  }

  return (
    <>
      {!isOpen && <Resizable.Handle type='line' variant='primary' />}

      <Resizable.Panel
        handleRef={panelRef}
        id='status-aside-panel'
        defaultSize='360px'
        minSize='320px'
        maxSize='70%'
        groupResizeBehavior='preserve-pixel-size'
      >
        <aside className='flex h-full flex-col'>
          <StatusPanel />
        </aside>
      </Resizable.Panel>
    </>
  );
}
