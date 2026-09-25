// components/desktop-network-access-section.tsx

import { Button, Checkbox, Input, Label, Typography } from '@aero/ui';
import { useI18n } from '@/app/hooks/i18n';
import { useGeneralStore } from '../general-store';
import { InfoTooltip } from './info-tooltip';

export function DesktopNetworkAccessSection() {
  const { t } = useI18n();

  return (
    <section className='space-y-6'>
      <Typography type='h6'>
        {t.settingsGeneral.desktopNetworkAccess}
      </Typography>

      <div className='space-y-3'>
        <StartOnLoginCheckbox />
        <MinimizeToTrayCheckbox />
        <KeepAwakeCheckbox />
      </div>

      <DesktopPasswordInput />
      <AllowNetworkAccessCheckbox />

      <div>
        <Button variant='tertiary'>{t.settingsGeneral.saveAndRestart}</Button>
      </div>
    </section>
  );
}

function StartOnLoginCheckbox() {
  const startOnLogin = useGeneralStore((s) => s.startOnLogin);
  const setStartOnLogin = useGeneralStore((s) => s.setStartOnLogin);
  const { t } = useI18n();

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
          {t.settingsGeneral.startOnLogin}
        </Checkbox.Content>
      </Checkbox>
      <InfoTooltip>{t.settingsGeneral.startOnLoginTooltip}</InfoTooltip>
    </div>
  );
}

function MinimizeToTrayCheckbox() {
  const minimizeToTray = useGeneralStore((s) => s.minimizeToTray);
  const setMinimizeToTray = useGeneralStore((s) => s.setMinimizeToTray);
  const { t } = useI18n();

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
          {t.settingsGeneral.minimizeToTray}
        </Checkbox.Content>
      </Checkbox>
      <InfoTooltip>{t.settingsGeneral.minimizeToTrayTooltip}</InfoTooltip>
    </div>
  );
}

function KeepAwakeCheckbox() {
  const keepAwake = useGeneralStore((s) => s.keepAwake);
  const setKeepAwake = useGeneralStore((s) => s.setKeepAwake);
  const { t } = useI18n();

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
          {t.settingsGeneral.keepAwake}
        </Checkbox.Content>
      </Checkbox>
      <InfoTooltip>{t.settingsGeneral.keepAwakeTooltip}</InfoTooltip>
    </div>
  );
}

function DesktopPasswordInput() {
  const desktopPassword = useGeneralStore((s) => s.desktopPassword);
  const setDesktopPassword = useGeneralStore((s) => s.setDesktopPassword);
  const { t } = useI18n();

  return (
    <div className='w-[320px] space-y-2'>
      <div className='flex items-center gap-1.5'>
        <Label>{t.settingsGeneral.desktopUiPassword}</Label>
        <InfoTooltip>{t.settingsGeneral.desktopUiPasswordTooltip}</InfoTooltip>
      </div>
      <Input
        type='password'
        placeholder={t.settingsGeneral.noPasswordRequired}
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
  const { t } = useI18n();

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
            {t.settingsGeneral.letLocalNetworkOpen}
          </Checkbox.Content>
        </Checkbox>
        <InfoTooltip>
          {t.settingsGeneral.letLocalNetworkOpenTooltip}
        </InfoTooltip>
      </div>
      {allowNetworkAccess && (
        <Typography type='body-xs' className='text-warning pl-6'>
          {t.settingsGeneral.networkWarning}
        </Typography>
      )}
    </div>
  );
}
