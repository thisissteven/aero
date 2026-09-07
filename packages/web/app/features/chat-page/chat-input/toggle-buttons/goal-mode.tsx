import { Target } from '@gravity-ui/icons';

import { useGoalMode, useUpdateSetting } from '@/app/hooks/api/config';

import { BooleanSettingToggleButton } from './boolean-setting';

export function GoalModeToggleButton({ sessionId }: { sessionId: string }) {
  const { data } = useGoalMode(sessionId);
  const { mutate: updateSetting } = useUpdateSetting();

  const enabled = data?.value ?? false;

  return (
    <BooleanSettingToggleButton
      enabled={enabled}
      label='Goal mode'
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
