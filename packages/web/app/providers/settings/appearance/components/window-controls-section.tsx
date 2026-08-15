// components/window-controls-section.tsx
import { Label, Typography } from '@aero/ui';

import { ButtonGroupPill } from '@/app/providers/settings/button-group-pill';

import {
  ControlsPosition,
  ControlsStyle,
  useAppearanceStore,
} from '../appearance-store';

export function WindowControlsSection() {
  return (
    <section className='space-y-6'>
      <div className='flex items-center gap-2'>
        <div>
          <Typography type='h6'>Window Controls</Typography>
          <Typography type='body-sm' color='muted' className='mt-0.5'>
            Choose where minimize, maximize, and close buttons appear.
          </Typography>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
        <ControlsPositionPicker />
        <ControlsStylePicker />
      </div>
    </section>
  );
}

function ControlsPositionPicker() {
  const controlsPosition = useAppearanceStore((s) => s.controlsPosition);
  const setControlsPosition = useAppearanceStore((s) => s.setControlsPosition);

  return (
    <div className='flex w-[220px] flex-col gap-2'>
      <Label>Position</Label>
      <ButtonGroupPill
        value={controlsPosition}
        onValueChange={setControlsPosition}
      >
        <ButtonGroupPill.Button<ControlsPosition>
          value='left'
          className='flex-1'
        >
          Left
        </ButtonGroupPill.Button>
        <ButtonGroupPill.Button<ControlsPosition>
          value='right'
          className='flex-1'
        >
          Right
        </ButtonGroupPill.Button>
      </ButtonGroupPill>
    </div>
  );
}

function ControlsStylePicker() {
  const controlsStyle = useAppearanceStore((s) => s.controlsStyle);
  const setControlsStyle = useAppearanceStore((s) => s.setControlsStyle);

  return (
    <div className='flex w-[220px] flex-col gap-2'>
      <Label>Style</Label>
      <ButtonGroupPill value={controlsStyle} onValueChange={setControlsStyle}>
        <ButtonGroupPill.Button<ControlsStyle>
          value='classic'
          className='flex-2'
        >
          Classic
        </ButtonGroupPill.Button>
        <ButtonGroupPill.Button<ControlsStyle>
          value='traffic-lights'
          className='flex-3'
        >
          Traffic Lights
        </ButtonGroupPill.Button>
      </ButtonGroupPill>
    </div>
  );
}
