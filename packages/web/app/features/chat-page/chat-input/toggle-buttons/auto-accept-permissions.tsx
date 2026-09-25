import { ShieldCheck } from '@gravity-ui/icons';

import {
  usePermissionAutoAccept,
  useUpdateSetting,
} from '@/app/hooks/api/settings';

import { useI18n } from '@/app/hooks/i18n';

import { BooleanSettingToggleButton } from './boolean-setting';

export function AutoAcceptPermissionsToggleButton({
  sessionId,
}: {
  sessionId: string;
}) {
  const { t } = useI18n();
  const { data } = usePermissionAutoAccept(sessionId);

  const { mutate: updateSetting } = useUpdateSetting();

  const enabled = data?.value ?? false;

  return (
    <BooleanSettingToggleButton
      enabled={enabled}
      label={t.chatInput.autoAcceptPermissions}
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
