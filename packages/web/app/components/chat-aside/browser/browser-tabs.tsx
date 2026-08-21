import { Globe, Plus, Xmark } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { IconButton } from '@/app/components/ui/icon-button';

import {
  useActiveBrowserTabId,
  useBrowserActions,
  useBrowserTabs,
} from './browser-store';

export function BrowserTabs() {
  const tabs = useBrowserTabs();
  const activeTabId = useActiveBrowserTabId();
  const { addTab, removeTab, setActiveTab } = useBrowserActions();

  return (
    <div className='bg-background flex items-center gap-1 px-1 py-1'>
      <div className='flex flex-1 items-center gap-1 overflow-x-auto'>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type='button'
              onClick={() => setActiveTab(tab.id)}
              className={
                isActive
                  ? 'bg-default text-foreground flex items-center gap-2 rounded-md px-3 py-1.5 text-sm'
                  : 'text-muted hover:bg-default hover:text-foreground flex items-center gap-2 rounded-md px-3 py-1.5 text-sm'
              }
            >
              <Icon data={Globe} size={14} className='shrink-0 opacity-70' />
              <span className='max-w-[10rem] truncate'>{tab.title}</span>
              <span
                role='button'
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  removeTab(tab.id);
                }}
                className='text-muted ml-1'
              >
                <Icon data={Xmark} size={14} />
              </span>
            </button>
          );
        })}
      </div>
      <IconButton onPress={() => addTab()}>
        <Icon data={Plus} />
      </IconButton>
    </div>
  );
}
