// components/message-stream-transport-section.tsx
import { ButtonGroup, Typography } from '@aero/ui';

import { useI18n } from '@/app/hooks/i18n';
import { ButtonGroupPill } from '@/app/providers/settings/button-group-pill';

import { TransportOption, useGeneralStore } from '../general-store';

export function MessageStreamTransportSection() {
  const streamTransport = useGeneralStore((s) => s.streamTransport);
  const setStreamTransport = useGeneralStore((s) => s.setStreamTransport);
  const { t } = useI18n();

  return (
    <section className='space-y-4'>
      <Typography type='h6'>
        {t.settingsGeneral.messageStreamTransport}
      </Typography>

      <ButtonGroup size='sm' variant='outline'>
        <ButtonGroupPill
          value={streamTransport}
          onValueChange={setStreamTransport}
        >
          <ButtonGroupPill.Button<TransportOption> value='auto'>
            {t.settingsGeneral.transportAuto}
          </ButtonGroupPill.Button>
          <ButtonGroupPill.Button<TransportOption> value='websocket'>
            {t.settingsGeneral.transportWebsocket}
          </ButtonGroupPill.Button>
          <ButtonGroupPill.Button<TransportOption> value='sse'>
            {t.settingsGeneral.transportSse}
          </ButtonGroupPill.Button>
        </ButtonGroupPill>
      </ButtonGroup>

      <Typography type='body-sm' color='muted'>
        {t.settingsGeneral.transportDescription}
      </Typography>
    </section>
  );
}
