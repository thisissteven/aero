// general-view.tsx
import { Separator, Typography } from '@aero/ui';

import { DesktopNetworkAccessSection } from './components/desktop-network-access-section';
import { MessageStreamTransportSection } from './components/message-stream-transport-section';
import { NavigationSection } from './components/navigation-section';
import { OpenCodeCliSection } from './components/opencode-cli-section';
import { PrivacySection } from './components/privacy-section';

export function GeneralView() {
  return (
    <div className='bg-background max-w-4xl flex-1 scrollbar-thin space-y-8 overflow-y-auto p-8'>
      <div>
        <Typography type='h3' weight='semibold'>
          General
        </Typography>
        <Typography type='body-sm' color='muted'>
          App startup, security, connection, and privacy.
        </Typography>
      </div>

      <Separator />
      <DesktopNetworkAccessSection />
      <Separator />
      <OpenCodeCliSection />
      <Separator />
      <NavigationSection />
      <Separator />
      <MessageStreamTransportSection />
      <Separator />
      <PrivacySection />
    </div>
  );
}
