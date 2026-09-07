import { ShieldCheck } from '@gravity-ui/icons';

import {
  usePermissionAutoAccept,
  useUpdateSetting,
} from '@/app/hooks/api/config';

import { BooleanSettingToggleButton } from './boolean-setting';

export function AutoAcceptPermissionsToggleButton({
  sessionId,
}: {
  sessionId: string;
}) {
  const { data } = usePermissionAutoAccept(sessionId);

  const { mutate: updateSetting } = useUpdateSetting();

  const enabled = data?.value ?? false;

  return (
    <BooleanSettingToggleButton
      enabled={enabled}
      label='Auto accept permissions'
      icon={<ShieldCheck />}
      onPress={() =>
        updateSetting({
          path: ['permissionAutoAcceptSessions', sessionId],
          value: !enabled,
        })
      }
    />
  );
}
