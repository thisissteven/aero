// components/message-stream-transport-section.tsx
import { ButtonGroup, Typography } from '@aero/ui';

import { ButtonGroupPill } from '@/app/providers/settings/button-group-pill';

import { TransportOption, useGeneralStore } from '../general-store';

export function MessageStreamTransportSection() {
  const streamTransport = useGeneralStore((s) => s.streamTransport);
  const setStreamTransport = useGeneralStore((s) => s.setStreamTransport);

  return (
    <section className='space-y-4'>
      <Typography type='h6'>Message Stream Transport</Typography>

      <ButtonGroup size='sm' variant='outline'>
        <ButtonGroupPill
          value={streamTransport}
          onValueChange={setStreamTransport}
        >
          <ButtonGroupPill.Button<TransportOption> value='auto'>
            Auto
          </ButtonGroupPill.Button>
          <ButtonGroupPill.Button<TransportOption> value='websocket'>
            Websocket
          </ButtonGroupPill.Button>
          <ButtonGroupPill.Button<TransportOption> value='sse'>
            SSE
          </ButtonGroupPill.Button>
        </ButtonGroupPill>
      </ButtonGroup>

      <Typography type='body-sm' color='muted'>
        Prefer WebSocket and fall back to SSE if needed.
      </Typography>
    </section>
  );
}
