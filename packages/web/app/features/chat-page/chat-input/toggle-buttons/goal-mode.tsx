import { Target } from '@gravity-ui/icons';

import { useGoalMode, useUpdateSetting } from '@/app/hooks/api/settings';

import { useI18n } from '@/app/hooks/i18n';

import { BooleanSettingToggleButton } from './boolean-setting';

export function GoalModeToggleButton({ sessionId }: { sessionId: string }) {
  const { t } = useI18n();
  const { data } = useGoalMode(sessionId);
  const { mutate: updateSetting } = useUpdateSetting();

  const enabled = data?.value ?? false;

  return (
    <BooleanSettingToggleButton
      enabled={enabled}
      label={t.chatInput.goalMode}
      icon={<Target />}
      onPress={() =>
        updateSetting({
          path: ['goalMode', sessionId],
          value: !enabled,
        })
      }
    />
  );
}
