// components/desktop-network-access-section.tsx

import { Button, Checkbox, Input, Label, Typography } from '@aero/ui';

import { InfoTooltip } from './info-tooltip';
import { useGeneralStore } from '../general-store';

export function DesktopNetworkAccessSection() {
  return (
    <section className='space-y-6'>
      <Typography type='h6'>Desktop Network Access</Typography>

      <div className='space-y-3'>
        <StartOnLoginCheckbox />
        <MinimizeToTrayCheckbox />
        <KeepAwakeCheckbox />
      </div>

      <DesktopPasswordInput />
      <AllowNetworkAccessCheckbox />

      <div>
        <Button variant='tertiary'>Save & Restart</Button>
      </div>
    </section>
  );
}

function StartOnLoginCheckbox() {
  const startOnLogin = useGeneralStore((s) => s.startOnLogin);
  const setStartOnLogin = useGeneralStore((s) => s.setStartOnLogin);

  return (
    <div className='flex items-center gap-2'>
      <Checkbox
        name='start-on-login'
        isSelected={startOnLogin}
        onChange={setStartOnLogin}
      >
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          Start Aero when you log in
        </Checkbox.Content>
      </Checkbox>
      <InfoTooltip>
        Launch Aero automatically when you log into your computer.
      </InfoTooltip>
    </div>
  );
}

function MinimizeToTrayCheckbox() {
  const minimizeToTray = useGeneralStore((s) => s.minimizeToTray);
  const setMinimizeToTray = useGeneralStore((s) => s.setMinimizeToTray);

  return (
    <div className='flex items-center gap-2'>
      <Checkbox
        name='minimize-to-tray'
        isSelected={minimizeToTray}
        onChange={setMinimizeToTray}
      >
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          Minimize and close to the system tray
        </Checkbox.Content>
      </Checkbox>
      <InfoTooltip>
        Closing the window keeps Aero running in the background.
      </InfoTooltip>
    </div>
  );
}

function KeepAwakeCheckbox() {
  const keepAwake = useGeneralStore((s) => s.keepAwake);
  const setKeepAwake = useGeneralStore((s) => s.setKeepAwake);

  return (
    <div className='flex items-center gap-2'>
      <Checkbox
        name='keep-awake'
        isSelected={keepAwake}
        onChange={setKeepAwake}
      >
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          Keep computer awake while OpenChamber is running
        </Checkbox.Content>
      </Checkbox>
      <InfoTooltip>
        Prevents sleep/display-off while Aero is active.
      </InfoTooltip>
    </div>
  );
}

function DesktopPasswordInput() {
  const desktopPassword = useGeneralStore((s) => s.desktopPassword);
  const setDesktopPassword = useGeneralStore((s) => s.setDesktopPassword);

  return (
    <div className='w-[320px] space-y-2'>
      <div className='flex items-center gap-1.5'>
        <Label>Desktop UI Password</Label>
        <InfoTooltip>Require a password to access the UI.</InfoTooltip>
      </div>
      <Input
        type='password'
        placeholder='No password required'
        value={desktopPassword}
        onChange={(e) => setDesktopPassword(e.target.value)}
        className='w-full'
      />
    </div>
  );
}

function AllowNetworkAccessCheckbox() {
  const allowNetworkAccess = useGeneralStore((s) => s.allowNetworkAccess);
  const setAllowNetworkAccess = useGeneralStore((s) => s.setAllowNetworkAccess);

  return (
    <div className='space-y-1'>
      <div className='flex items-center gap-2'>
        <Checkbox
          isSelected={allowNetworkAccess}
          onChange={setAllowNetworkAccess}
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Let other devices on your local network open this app
          </Checkbox.Content>
        </Checkbox>
        <InfoTooltip>
          Binds server interface to local network IP addresses.
        </InfoTooltip>
      </div>
      {allowNetworkAccess && (
        <Typography type='body-xs' className='text-warning pl-6'>
          Warning: while enabled, the app is reachable by anyone on the same
          local network.
        </Typography>
      )}
    </div>
  );
}
