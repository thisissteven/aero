import {
  Bell,
  Book,
  BookOpen,
  Box,
  BranchesDown,
  ChartBar,
  ChevronLeft,
  Clock,
  Code,
  Comment,
  Cpu,
  Display,
  Folder,
  Gear,
  Globe,
  LogoMcp,
  Microphone,
  Persons,
  PersonWorker,
  Server,
  Sliders,
  Sparkles,
  Terminal,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { SVGProps, useEffect, useRef, useState } from 'react';

import { Modal, SearchField } from '@aero/ui';

import { useWindowSize } from '@/app/hooks/useWindowSize';
import { AppearanceView } from '@/app/providers/settings/appearance/appearance-view';
import { GeneralView } from '@/app/providers/settings/general/general-view';
import { ReloadOpencode } from '@/app/providers/settings/reload-opencode';

import { SettingsTab, useSettingsModalStore } from './settings-store';

interface NavItem {
  id: SettingsTab;
  label: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
  badge?: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'AERO',
    items: [
      { id: 'general', label: 'General', icon: Gear },
      { id: 'appearance', label: 'Appearance', icon: Display },
      { id: 'chat', label: 'Chat', icon: Comment },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'sessions', label: 'Sessions', icon: Clock },
      { id: 'shortcuts', label: 'Shortcuts', icon: Sliders },
      { id: 'voice', label: 'Voice', icon: Microphone },
      { id: 'usage', label: 'Usage', icon: ChartBar },
    ],
  },
  {
    title: 'WORKSPACE',
    items: [
      { id: 'projects', label: 'Projects', icon: Folder },
      { id: 'remote-instances', label: 'Remote Instances', icon: Server },
      {
        id: 'external-tunnel',
        label: 'External Tunnel',
        icon: Globe,
        badge: 'beta',
      },
      { id: 'git', label: 'Git', icon: BranchesDown },
    ],
  },
  {
    title: 'OPENCODE',
    items: [
      { id: 'providers', label: 'Providers', icon: Cpu },
      { id: 'agents', label: 'Agents', icon: Persons },
      { id: 'behavior', label: 'Behavior', icon: PersonWorker },
      { id: 'commands', label: 'Commands', icon: Terminal },
      { id: 'mcp', label: 'MCP', icon: LogoMcp },
      { id: 'plugins', label: 'Plugins', icon: Box },
    ],
  },
  {
    title: 'LIBRARY',
    items: [
      { id: 'magic-prompts', label: 'Magic Prompts', icon: Sparkles },
      { id: 'snippets', label: 'Snippets', icon: Code },
      { id: 'skills', label: 'Skills', icon: BookOpen },
      { id: 'skills-catalog', label: 'Skills Catalog', icon: Book },
    ],
  },
];

function getTabLabel(tab: SettingsTab): string {
  for (const section of NAV_SECTIONS) {
    const item = section.items.find((i) => i.id === tab);
    if (item) return item.label;
  }
  return 'Settings';
}

type MobilePanel = 'list' | 'detail';

export function SettingsModal() {
  const {
    isOpen,
    closeModal,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    sidebarScrollTop,
    setSidebarScrollTop,
  } = useSettingsModalStore();

  const sidebarNavRef = useRef<HTMLDivElement | null>(null);

  // Mobile-only view state. Opens to the 'list' view by default.
  const [panel, setPanel] = useState<MobilePanel>('list');
  const [exitingPanel, setExitingPanel] = useState<MobilePanel | null>(null);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [hasNavigated, setHasNavigated] = useState(false);

  const isMobile = useWindowSize((size) => size.width < 768);

  useEffect(() => {
    if (isOpen) {
      setPanel('list');
      setExitingPanel(null);
      setHasNavigated(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && panel === 'list' && sidebarNavRef.current) {
      sidebarNavRef.current.scrollTop = sidebarScrollTop;
    }
  }, [isOpen, panel]);

  const handleClose = () => {
    const currentScrollTop = sidebarNavRef.current?.scrollTop ?? 0;
    setSidebarScrollTop(currentScrollTop);
    closeModal();
  };

  const navigateTo = (next: MobilePanel) => {
    if (next === panel) return;
    setDirection(next === 'detail' ? 'forward' : 'backward');
    setExitingPanel(panel);
    setPanel(next);
    setHasNavigated(true);
  };

  const handleNavigate = (tab: SettingsTab) => {
    setActiveTab(tab);
    if (isMobile) {
      const currentScrollTop = sidebarNavRef.current?.scrollTop ?? 0;
      setSidebarScrollTop(currentScrollTop);
      navigateTo('detail');
    }
  };

  const handleBack = () => {
    navigateTo('list');
  };

  const renderNavSections = (
    onNavigate: (tab: SettingsTab) => void,
    highlightActive: boolean,
  ) => (
    <nav className='flex flex-col gap-4 px-3 pb-3'>
      {NAV_SECTIONS.map((section, idx) => {
        const filteredItems = section.items.filter((item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()),
        );

        if (filteredItems.length === 0) return null;

        return (
          <div key={idx} className='flex flex-col gap-1'>
            {section.title && (
              <span className='text-muted px-2 text-[10px] font-semibold tracking-wider uppercase'>
                {section.title}
              </span>
            )}
            {filteredItems.map((item) => {
              const isActive = highlightActive && activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm ${
                    isActive
                      ? 'bg-surface-secondary text-surface-foreground font-medium'
                      : 'text-muted hover:bg-surface-secondary'
                  }`}
                >
                  <div className='flex items-center gap-2.5'>
                    <Icon data={item.icon} />
                    <span
                      className={`${
                        isActive ? 'text-surface-foreground' : 'text-muted'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                  {item.badge && (
                    <span className='bg-accent-soft-foreground text-accent-foreground rounded px-1.5 py-0.5 text-[10px] font-normal'>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  const renderContent = () => {
    if (activeTab === 'general') return <GeneralView />;
    if (activeTab === 'appearance') return <AppearanceView />;
    return (
      <div className='text-muted flex w-full items-center justify-center p-8 text-sm'>
        Content for
        <div className='text-foreground mx-1 capitalize'>
          {activeTab.replace('-', ' ')}
        </div>
        is under development.
      </div>
    );
  };

  const isTransitioning = exitingPanel !== null;

  const renderMobileListPanel = (
    ref?: React.Ref<HTMLDivElement>,
    locked?: boolean,
  ) => (
    <div
      ref={ref}
      className={`relative flex h-full scrollbar-thin flex-col gap-1 ${
        locked ? 'overflow-hidden' : 'overflow-y-auto'
      }`}
    >
      <div className='relative sticky top-0 px-3 py-3 pr-10'>
        <div className='bg-surface/50 absolute inset-0 -z-[1] -translate-y-1/2 backdrop-blur-sm'></div>
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          className='relative w-full'
          variant='primary'
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              placeholder='Search settings'
              className='w-full text-sm'
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>

      {renderNavSections(handleNavigate, false)}
    </div>
  );

  const renderMobileDetailPanel = (locked?: boolean) => (
    <div className='flex h-full flex-col'>
      <div className='border-separator flex shrink-0 items-center gap-2 border-b px-2 py-3'>
        <button
          onClick={handleBack}
          className='text-muted hover:text-foreground flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors'
        >
          <Icon data={ChevronLeft} size={18} />
          Back
        </button>
        <span className='text-foreground text-sm font-medium'>
          {getTabLabel(activeTab)}
        </span>
      </div>
      <div
        className={`flex min-h-0 flex-1 ${locked ? 'overflow-hidden' : 'overflow-y-auto'}`}
      >
        {renderContent()}
      </div>
    </div>
  );

  const renderMobilePanel = (
    which: MobilePanel,
    ref?: React.Ref<HTMLDivElement>,
    locked?: boolean,
  ) =>
    which === 'list'
      ? renderMobileListPanel(ref, locked)
      : renderMobileDetailPanel(locked);

  const enterAnimation =
    direction === 'forward'
      ? 'animate-in fade-in slide-in-from-right-full fill-mode-forwards'
      : 'animate-in fade-in slide-in-from-left-full fill-mode-forwards';

  const exitAnimation =
    direction === 'forward'
      ? 'animate-out fade-out slide-out-to-left-full fill-mode-forwards'
      : 'animate-out fade-out slide-out-to-right-full fill-mode-forwards';

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <Modal.Backdrop
        onWheelCapture={(event) => {
          event.stopPropagation();
        }}
      >
        <Modal.Container size='cover'>
          <Modal.Dialog className='bg-surface my-auto h-180 w-full max-w-5xl overflow-hidden rounded-2xl p-0 max-md:h-full max-md:max-w-full'>
            <div className='text-foreground relative flex h-full w-full'>
              {/* Native Close Trigger */}
              <Modal.CloseTrigger className='text-muted hover:text-foreground absolute top-4 right-4 z-10 transition-colors' />

              {isMobile ? (
                <div className='relative isolate h-full w-full overflow-hidden'>
                  {exitingPanel && (
                    <div
                      key={`exit-${exitingPanel}`}
                      onAnimationEnd={() => setExitingPanel(null)}
                      className={`absolute inset-0 z-0 h-full transform-gpu duration-200 ease-in ${exitAnimation} ${
                        isTransitioning ? 'pointer-events-none' : ''
                      }`}
                    >
                      {renderMobilePanel(exitingPanel, undefined, true)}
                    </div>
                  )}
                  <div
                    key={`enter-${panel}`}
                    className={`absolute inset-0 z-10 h-full transform-gpu duration-300 ease-out ${
                      hasNavigated ? enterAnimation : ''
                    } ${isTransitioning ? 'pointer-events-none' : ''}`}
                  >
                    {renderMobilePanel(panel, sidebarNavRef, isTransitioning)}
                  </div>
                </div>
              ) : (
                <>
                  {/* Left Sidebar */}
                  <aside className='border-separator flex w-64 shrink-0 flex-col justify-between border-r'>
                    <div
                      ref={sidebarNavRef}
                      className='relative flex scrollbar-thin flex-col gap-1 overflow-y-auto'
                    >
                      {/* Search Bar */}
                      <div className='relative sticky top-0 px-3 py-3 max-md:pr-12'>
                        <div className='bg-surface/50 absolute inset-0 -z-[1] -translate-y-1/2 backdrop-blur-sm'></div>
                        <SearchField
                          value={searchQuery}
                          onChange={setSearchQuery}
                          className='relative w-full'
                          variant='primary'
                        >
                          <SearchField.Group>
                            <SearchField.SearchIcon />
                            <SearchField.Input
                              placeholder='Search settings'
                              className='w-full text-sm'
                            />
                            <SearchField.ClearButton />
                          </SearchField.Group>
                        </SearchField>
                      </div>

                      {/* Navigation Items */}
                      {renderNavSections(setActiveTab, true)}
                    </div>

                    {/* Sidebar Footer */}
                    <div className='border-separator border-t p-2'>
                      <ReloadOpencode />
                    </div>
                  </aside>

                  {/* Main Content Area */}
                  <main className='flex flex-1 overflow-hidden'>
                    {renderContent()}
                  </main>
                </>
              )}
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
