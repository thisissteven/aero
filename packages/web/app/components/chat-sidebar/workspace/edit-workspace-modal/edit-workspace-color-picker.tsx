import { Xmark } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import {
  Button,
  cn,
  ColorArea,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  Label,
  parseColor,
} from '@aero/ui';

import { ACCENT_COLORS } from './edit-workspace-constants';
import { useEditWorkspaceStore } from './edit-workspace-store';

export function EditWorkspaceAccentColorPicker() {
  const selectedColor = useEditWorkspaceStore((s) => s.selectedColor);
  const workspaceColor = useEditWorkspaceStore(
    (s) => s.workspace.selectedColor,
  );
  const setSelectedColor = useEditWorkspaceStore((s) => s.setSelectedColor);

  const getParsedColor = () => {
    if (selectedColor && selectedColor.startsWith('#')) {
      try {
        return parseColor(selectedColor);
      } catch {
        //
      }
    }
    if (workspaceColor && workspaceColor.startsWith('#')) {
      try {
        return parseColor(workspaceColor);
      } catch {
        //
      }
    }
    return parseColor('#D4DEC8');
  };

  const isCustomColor = Boolean(selectedColor && selectedColor.startsWith('#'));

  return (
    <div className='flex flex-col gap-3'>
      <Label className='font-medium'>Accent Color</Label>
      <div className='flex flex-wrap items-center gap-2'>
        <Button
          isIconOnly
          size='sm'
          variant={selectedColor === null ? 'primary' : 'outline'}
          onPress={() => setSelectedColor(null)}
        >
          <Icon data={Xmark} size={16} />
        </Button>

        {ACCENT_COLORS.map(({ id, bgClass }) => (
          <Button
            key={id}
            isIconOnly
            size='sm'
            className={cn(
              'rounded-full',
              bgClass,
              selectedColor === id &&
                'ring-accent ring-offset-surface ring ring-2 ring-offset-2',
            )}
            onPress={() => setSelectedColor(id)}
          />
        ))}

        <ColorPicker
          value={getParsedColor()}
          onChange={(color) => setSelectedColor(color.toString('hex'))}
        >
          <ColorPicker.Trigger
            className={cn(
              'inline-flex cursor-pointer items-center justify-center rounded-full transition-all',
              isCustomColor &&
                'ring-accent ring-offset-surface ring ring-2 ring-offset-2',
            )}
          >
            <ColorSwatch className='size-8 rounded-full' />
          </ColorPicker.Trigger>
          <ColorPicker.Popover className='flex flex-col gap-2 p-3'>
            <ColorArea
              aria-label='Color area'
              className='max-w-full'
              colorSpace='hsb'
              xChannel='saturation'
              yChannel='brightness'
            >
              <ColorArea.Thumb />
            </ColorArea>
            <ColorSlider
              aria-label='Hue slider'
              channel='hue'
              className='gap-1 px-1'
              colorSpace='hsb'
            >
              <ColorSlider.Track>
                <ColorSlider.Thumb />
              </ColorSlider.Track>
            </ColorSlider>
          </ColorPicker.Popover>
        </ColorPicker>
      </div>
    </div>
  );
}
