import { Target } from '@gravity-ui/icons';

import { useGoalMode, useToggleGoalMode } from '@/app/hooks/api/config';

import { BooleanSettingToggleButton } from './boolean-setting';

export function GoalModeToggleButton({ sessionId }: { sessionId: string }) {
  const { data } = useGoalMode(sessionId);

  const { mutate: toggleGoalMode } = useToggleGoalMode();

  const enabled = data?.value ?? false;

  return (
    <BooleanSettingToggleButton
      enabled={enabled}
      label='Goal mode'
      icon={<Target />}
      onPress={() => toggleGoalMode(sessionId)}
    />
  );
}
