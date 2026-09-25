// providers-view.tsx
import { ChevronLeft } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '@/app/hooks/i18n';
import { useWindowSize } from '@/app/hooks/useWindowSize';

import { ConnectProviderView } from './components/connect-provider-view';
import { ProviderDetailsView } from './components/provider-details-view';
import { ProvidersSidebar } from './components/providers-sidebar';
import { useProvidersStore } from './providers-store';

type MobilePanel = 'list' | 'detail';

export function ProvidersView() {
  const viewMode = useProvidersStore((s) => s.viewMode);
  const mobilePanel = useProvidersStore((s) => s.mobilePanel);
  const setMobilePanel = useProvidersStore((s) => s.setMobilePanel);
  const { t } = useI18n();

  const isMobile = useWindowSize((size) => size.width < 768);

  // Track panel transitions for slide animations
  const [exitingPanel, setExitingPanel] = useState<MobilePanel | null>(null);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [hasNavigated, setHasNavigated] = useState(false);

  // Refs used to coordinate the mount-time reset and to detect real panel
  // changes without triggering animations on the very first render.
  const isInitializedRef = useRef(false);
  const prevPanelRef = useRef<MobilePanel>('list');

  useLayoutEffect(() => {
    // Leaving mobile: reset everything so the next entry is a clean slate.
    if (!isMobile) {
      setMobilePanel('list');
      prevPanelRef.current = 'list';
      setExitingPanel(null);
      setHasNavigated(false);
      isInitializedRef.current = false;
      return;
    }

    // First render in mobile: silently normalize to the list panel without
    // animating. Using useLayoutEffect ensures this runs before paint, so
    // the user never sees the stale panel value flash on screen.
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      prevPanelRef.current = 'list';
      if (mobilePanel !== 'list') {
        setMobilePanel('list');
      }
      return;
    }

    // No change — nothing to animate.
    if (prevPanelRef.current === mobilePanel) return;

    // Real panel change: trigger the slide animation.
    const prev = prevPanelRef.current;
    prevPanelRef.current = mobilePanel;

    setExitingPanel(prev);
    setDirection(mobilePanel === 'detail' ? 'forward' : 'backward');
    setHasNavigated(true);
  }, [mobilePanel, isMobile, setMobilePanel]);

  const renderContent = () =>
    viewMode === 'connect' ? <ConnectProviderView /> : <ProviderDetailsView />;

  const renderDetailPanel = (locked?: boolean) => (
    <div className='flex h-full flex-col'>
      <div className='border-separator flex shrink-0 items-center gap-2 border-b px-2 py-3'>
        <button
          onClick={() => setMobilePanel('list')}
          className='text-muted hover:text-foreground flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors'
        >
          <Icon data={ChevronLeft} size={18} />
          {t.common.back}
        </button>
        <span className='text-foreground text-sm font-medium'>
          {viewMode === 'connect'
            ? t.settingsProviders.connectProvider
            : t.settingsProviders.providerDetails}
        </span>
      </div>
      <div
        className={`flex min-h-0 flex-1 ${
          locked ? 'overflow-hidden' : 'scrollbar-thin overflow-y-auto'
        }`}
      >
        <main className='flex-1 p-4 md:p-8'>
          <div className='mx-auto w-full max-w-3xl'>{renderContent()}</div>
        </main>
      </div>
    </div>
  );

  const renderMobilePanel = (which: MobilePanel, locked?: boolean) =>
    which === 'list' ? <ProvidersSidebar /> : renderDetailPanel(locked);

  const enterAnimation =
    direction === 'forward'
      ? 'animate-in fade-in slide-in-from-right-full fill-mode-forwards'
      : 'animate-in fade-in slide-in-from-left-full fill-mode-forwards';

  const exitAnimation =
    direction === 'forward'
      ? 'animate-out fade-out slide-out-to-left-full fill-mode-forwards'
      : 'animate-out fade-out slide-out-to-right-full fill-mode-forwards';

  // Desktop: side-by-side layout
  if (!isMobile) {
    return (
      <div className='bg-background flex h-full w-full overflow-hidden'>
        <ProvidersSidebar />
        <main className='scrollbar-thin flex flex-1 overflow-y-auto p-8'>
          <div className='mx-auto w-full max-w-3xl'>{renderContent()}</div>
        </main>
      </div>
    );
  }

  // Mobile: single panel with sliding animations
  const isTransitioning = exitingPanel !== null;

  return (
    <div className='bg-background relative isolate h-full w-full overflow-hidden'>
      {exitingPanel && (
        <div
          key={`exit-${exitingPanel}`}
          onAnimationEnd={() => setExitingPanel(null)}
          className={`absolute inset-0 z-0 h-full transform-gpu duration-200 ease-in ${exitAnimation} ${
            isTransitioning ? 'pointer-events-none' : ''
          }`}
        >
          {renderMobilePanel(exitingPanel, true)}
        </div>
      )}
      <div
        key={`enter-${mobilePanel}`}
        className={`absolute inset-0 z-10 h-full transform-gpu duration-300 ease-out ${
          hasNavigated ? enterAnimation : ''
        } ${isTransitioning ? 'pointer-events-none' : ''}`}
      >
        {renderMobilePanel(mobilePanel, isTransitioning)}
      </div>
    </div>
  );
}
