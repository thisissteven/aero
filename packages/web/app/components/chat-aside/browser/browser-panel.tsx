import { useEffect } from 'react';

import { BrowserPane } from './browser-pane';
import {
  useActiveBrowserTabId,
  useBrowserActions,
  useBrowserTabs,
} from './browser-store';
import { BrowserTabs } from './browser-tabs';

interface BrowserPanelProps {
  onAttachToChat?: (text: string) => void;
}

export function BrowserPanel({ onAttachToChat }: BrowserPanelProps) {
  const tabs = useBrowserTabs();
  const activeTabId = useActiveBrowserTabId();
  const { addTab } = useBrowserActions();

  // Ensure there's always at least one tab, same as terminal's initialSession —
  // but browser tabs start empty (no session process to spin up), so this
  // just seeds the tab list rather than opening a connection.
  useEffect(() => {
    if (tabs.length === 0) addTab();
  }, [tabs.length, addTab]);

  return (
    <div className='border-border bg-background flex h-full flex-col overflow-hidden'>
      <div className='border-border flex scrollbar-thin items-center overflow-x-auto border-b'>
        <BrowserTabs />
      </div>
      <div className='relative min-h-0 flex-1 overflow-hidden'>
        {tabs.length === 0 ? (
          <div className='text-muted flex h-full items-center justify-center text-sm'>
            No tabs open
          </div>
        ) : (
          tabs.map((tab) => (
            <BrowserPane
              key={tab.id}
              tabId={tab.id}
              active={tab.id === activeTabId}
              onAttachToChat={onAttachToChat}
            />
          ))
        )}
      </div>
    </div>
  );
}
