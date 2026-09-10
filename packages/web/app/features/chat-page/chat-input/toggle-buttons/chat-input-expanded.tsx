import {
  ChevronsCollapseUpRight,
  ChevronsExpandUpRight,
} from '@gravity-ui/icons';

import {
  useChatInputExpanded,
  useUpdateSetting,
} from '@/app/hooks/api/settings';

import { BooleanSettingToggleButton } from './boolean-setting';

export function ChatInputExpandedToggleButton({
  sessionId,
}: {
  sessionId: string;
}) {
  const enabled = useChatInputExpanded();
  const { mutate: updateSetting } = useUpdateSetting();

  return (
    <BooleanSettingToggleButton
      enabled={enabled}
      label='Expanded chat input'
      icon={enabled ? <ChevronsCollapseUpRight /> : <ChevronsExpandUpRight />}
      onPress={() =>
        updateSetting({
          path: ['chatInputExpanded', sessionId],
          value: !enabled,
        })
      }
      className='bg-transparent hover:bg-transparent'
    />
  );
}
