import { ShieldCheck } from '@gravity-ui/icons';

import {
  usePermissionAutoAccept,
  useTogglePermissionAutoAccept,
} from '@/app/hooks/api/config';

import { BooleanSettingToggleButton } from './boolean-setting';

export function AutoAcceptPermissionsToggleButton({
  sessionId,
}: {
  sessionId: string;
}) {
  const { data } = usePermissionAutoAccept(sessionId);

  const { mutate: toggleAutoAccept } = useTogglePermissionAutoAccept();

  const enabled = data?.value ?? false;

  return (
    <BooleanSettingToggleButton
      enabled={enabled}
      label='Auto accept permissions'
      icon={<ShieldCheck />}
      onPress={() => toggleAutoAccept(sessionId)}
    />
  );
}
