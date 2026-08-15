// components/privacy-section.tsx
import { Checkbox, Typography } from '@aero/ui';

import { InfoTooltip } from './info-tooltip';
import { useGeneralStore } from '../general-store';

export function PrivacySection() {
  const sendUsageReports = useGeneralStore((s) => s.sendUsageReports);
  const setSendUsageReports = useGeneralStore((s) => s.setSendUsageReports);

  return (
    <section className='space-y-6'>
      <Typography type='h6'>Privacy</Typography>

      <div className='flex items-center gap-2'>
        <Checkbox isSelected={sendUsageReports} onChange={setSendUsageReports}>
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Send anonymous usage reports
          </Checkbox.Content>
        </Checkbox>
        <InfoTooltip>
          Helps improve software performance and diagnostic stability.
        </InfoTooltip>
      </div>
    </section>
  );
}
