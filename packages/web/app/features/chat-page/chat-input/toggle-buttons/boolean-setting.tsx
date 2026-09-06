import type { ReactNode } from 'react';

import { cn, ToggleButton, Tooltip } from '@aero/ui';

interface BooleanSettingToggleButtonProps {
  enabled: boolean;
  label: string;
  onPress: () => void;
  icon: ReactNode;
  isDisabled?: boolean;
  className?: string;
}

export function BooleanSettingToggleButton({
  enabled,
  label,
  onPress,
  icon,
  isDisabled = false,
  className,
}: BooleanSettingToggleButtonProps) {
  return (
    <Tooltip delay={300}>
      <Tooltip.Trigger>
        <ToggleButton
          isIconOnly
          aria-label={label}
          variant='ghost'
          size='sm'
          className={cn('rounded-lg', !enabled && 'text-muted', className)}
          isSelected={enabled}
          isDisabled={isDisabled}
          onPress={onPress}
        >
          {icon}
        </ToggleButton>
      </Tooltip.Trigger>

      <Tooltip.Content>
        {label}: {enabled ? 'on' : 'off'}
      </Tooltip.Content>
    </Tooltip>
  );
}
