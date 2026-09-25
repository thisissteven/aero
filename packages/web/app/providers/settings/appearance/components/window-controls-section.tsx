// components/window-controls-section.tsx
import { Label, Typography } from '@aero/ui';

import { useI18n } from '@/app/hooks/i18n';
import { ButtonGroupPill } from '@/app/providers/settings/button-group-pill';

import {
  ControlsPosition,
  ControlsStyle,
  useAppearanceStore,
} from '../appearance-store';

export function WindowControlsSection() {
  const { t } = useI18n();

  return (
    <section className='space-y-6'>
      <div className='flex items-center gap-2'>
        <div>
          <Typography type='h6'>
            {t.settingsAppearance.windowControls}
          </Typography>
          <Typography type='body-sm' color='muted' className='mt-0.5'>
            {t.settingsAppearance.windowControlsSubtitle}
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
  const { t } = useI18n();

  return (
    <div className='flex w-[220px] flex-col gap-2'>
      <Label>{t.settingsAppearance.position}</Label>
      <ButtonGroupPill
        value={controlsPosition}
        onValueChange={setControlsPosition}
      >
        <ButtonGroupPill.Button<ControlsPosition>
          value='left'
          className='flex-1'
        >
          {t.settingsAppearance.positionLeft}
        </ButtonGroupPill.Button>
        <ButtonGroupPill.Button<ControlsPosition>
          value='right'
          className='flex-1'
        >
          {t.settingsAppearance.positionRight}
        </ButtonGroupPill.Button>
      </ButtonGroupPill>
    </div>
  );
}

function ControlsStylePicker() {
  const controlsStyle = useAppearanceStore((s) => s.controlsStyle);
  const setControlsStyle = useAppearanceStore((s) => s.setControlsStyle);
  const { t } = useI18n();

  return (
    <div className='flex w-[220px] flex-col gap-2'>
      <Label>{t.settingsAppearance.style}</Label>
      <ButtonGroupPill value={controlsStyle} onValueChange={setControlsStyle}>
        <ButtonGroupPill.Button<ControlsStyle>
          value='classic'
          className='flex-2'
        >
          {t.settingsAppearance.styleClassic}
        </ButtonGroupPill.Button>
        <ButtonGroupPill.Button<ControlsStyle>
          value='traffic-lights'
          className='flex-3'
        >
          {t.settingsAppearance.styleTrafficLights}
        </ButtonGroupPill.Button>
      </ButtonGroupPill>
    </div>
  );
}
