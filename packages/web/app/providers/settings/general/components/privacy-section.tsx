// components/privacy-section.tsx
import { Checkbox, Typography } from '@aero/ui';

import { useI18n } from '@/app/hooks/i18n';
import { useGeneralStore } from '../general-store';
import { InfoTooltip } from './info-tooltip';

export function PrivacySection() {
  const sendUsageReports = useGeneralStore((s) => s.sendUsageReports);
  const setSendUsageReports = useGeneralStore((s) => s.setSendUsageReports);
  const { t } = useI18n();

  return (
    <section className='space-y-6'>
      <Typography type='h6'>{t.settingsGeneral.privacy}</Typography>

      <div className='flex items-center gap-2'>
        <Checkbox isSelected={sendUsageReports} onChange={setSendUsageReports}>
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            {t.settingsGeneral.sendAnonymousReports}
          </Checkbox.Content>
        </Checkbox>
        <InfoTooltip>
          {t.settingsGeneral.sendAnonymousReportsTooltip}
        </InfoTooltip>
      </div>
    </section>
  );
}
