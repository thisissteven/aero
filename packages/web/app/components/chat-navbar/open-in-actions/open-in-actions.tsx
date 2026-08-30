import {
  Check,
  ChevronDown,
  Code,
  Copy,
  Folder,
  Terminal,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useParams } from '@tanstack/react-router';
import { useRef } from 'react';

import { Dropdown, Label, Separator } from '@aero/ui';

import { useOpenInStore } from '@/app/components/chat-navbar/open-in-actions/open-in-store';
import { IconButton } from '@/app/components/ui/icon-button';
import { useSession } from '@/app/hooks/api/sessions';
import { useSystemApps } from '@/app/hooks/api/system';
import { useCopyToClipboard } from '@/app/hooks/useCopyToClipboard';
import { copyButtonCss } from '@/app/lib/file';

interface DetectedApp {
  id: string;
  label: string;
  appName: string;
  appIconUrl?: string;
  available: boolean;
}

async function openApp(path: string, appId: string): Promise<boolean> {
  const res = await fetch('/api/system/open-app', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, appId }),
  });
  return res.ok;
}

export function OpenInActions() {
  const { sessionId } = useParams({
    strict: false,
  });

  const { data: session } = useSession(undefined, sessionId);

  const workspace = session?.workspace;

  if (!sessionId || !workspace) return null;

  return <OpenInActionsContent projectPath={workspace} />;
}

function OpenInActionsContent({ projectPath }: { projectPath: string }) {
  const { selectedAppId, setSelectedAppId } = useOpenInStore();

  const handleSelect = async (appId: string) => {
    setSelectedAppId(appId);
    openApp(projectPath, appId);
  };

  const { data: systemData } = useSystemApps();

  const apps = (systemData?.editors ?? []).filter(
    (a: DetectedApp) => a.available,
  );

  const selectedApp = apps.find((app) => app.id === selectedAppId);

  return (
    <div className='border-separator inline-flex items-center rounded-lg border p-0.5'>
      {/* Dynamic Primary Action Button */}
      <IconButton
        aria-label='Open project'
        onPress={async () => await openApp(projectPath, selectedAppId)}
      >
        <AppIcon app={selectedApp} fallbackId={selectedAppId} />
      </IconButton>

      {/* Dropdown Menu */}
      <Dropdown size='sm'>
        <IconButton aria-label='Open in options'>
          <Icon data={ChevronDown} />
        </IconButton>

        <Dropdown.Popover
          className='w-44 max-sm:min-w-44'
          placement='bottom right'
          crossOffset={4}
        >
          <Dropdown.Menu className='flex flex-col gap-0.5'>
            <CopyPath path={projectPath} />

            <Separator className='my-0.5 h-[0.5px]' />

            {/* Render items dynamically from detected apps */}
            {apps.length > 0 ? (
              apps.map((app) => (
                <Dropdown.Item
                  key={app.id}
                  className='flex items-center justify-between'
                  onAction={async () => await handleSelect(app.id)}
                >
                  <div className='flex items-center gap-2.5'>
                    <AppIcon app={app} fallbackId={app.id} />
                    <Label>{app.label}</Label>
                  </div>
                  {selectedAppId === app.id && (
                    <Icon data={Check} className='text-accent' size={16} />
                  )}
                </Dropdown.Item>
              ))
            ) : (
              /* Fallback item while fetching or if none detected */
              <Dropdown.Item
                className='flex items-center justify-between'
                onAction={() => handleSelect('finder')}
              >
                <div className='flex items-center gap-2.5'>
                  <AppIcon fallbackId='finder' />
                  <Label>Finder</Label>
                </div>
                {selectedAppId === 'finder' && (
                  <Icon data={Check} className='text-accent' size={16} />
                )}
              </Dropdown.Item>
            )}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}

function AppIcon({
  app,
  fallbackId,
}: {
  app?: DetectedApp;
  fallbackId?: string;
}) {
  if (app?.appIconUrl) {
    return (
      <img
        src={app.appIconUrl}
        alt={app.appName || app.label}
        className='h-3.5 w-3.5 shrink-0 object-contain'
      />
    );
  }

  // Fallback icon rendering when no native appIconUrl is returned
  const id = app?.id || fallbackId;
  if (id === 'finder') {
    return <Icon data={Folder} size={16} className='text-warning' />;
  }
  if (id === 'terminal' || id === 'iterm2' || id === 'ghostty') {
    return <Icon data={Terminal} size={16} className='text-muted' />;
  }
  return <Icon data={Code} size={16} className='text-sky-400' />;
}

function CopyPath({ path }: { path: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { copied, copy } = useCopyToClipboard({
    animatedRef: containerRef,
  });

  return (
    <Dropdown.Item onPress={() => copy(path)} shouldCloseOnSelect={false}>
      <style dangerouslySetInnerHTML={{ __html: copyButtonCss }} />

      <div ref={containerRef} className='t-text-swap items-center gap-2.25'>
        <div className='shrink-0'>
          {copied ? (
            <Icon size={16} data={Check} />
          ) : (
            <Icon size={16} data={Copy} />
          )}
        </div>

        <Label className='min-w-0 flex-1'>
          {copied ? 'Copied' : 'Copy Path'}
        </Label>
      </div>
    </Dropdown.Item>
  );
}
