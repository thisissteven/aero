import { cn, ToggleButton, Tooltip } from '@aero/ui';
import type { ReactNode } from 'react';

import { useI18n } from '@/app/hooks/i18n';

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
  const { t } = useI18n();

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <ToggleButton
          isIconOnly
          aria-label={label}
          variant='ghost'
          size='sm'
          className={cn('rounded-lg', !enabled && '', className)}
          isSelected={enabled}
          isDisabled={isDisabled}
          onPress={onPress}
        >
          {icon}
        </ToggleButton>
      </Tooltip.Trigger>

      <Tooltip.Content>
        {label}: {enabled ? t.common.on : t.common.off}
      </Tooltip.Content>
    </Tooltip>
  );
}
