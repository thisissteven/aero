import {
  ChevronsCollapseUpRight,
  ChevronsExpandUpRight,
} from '@gravity-ui/icons';

import {
  useChatInputExpanded,
  useUpdateSetting,
} from '@/app/hooks/api/settings';

import { useI18n } from '@/app/hooks/i18n';

import { BooleanSettingToggleButton } from './boolean-setting';

export function ChatInputExpandedToggleButton({
  sessionId,
}: {
  sessionId: string;
}) {
  const { t } = useI18n();
  const enabled = useChatInputExpanded();
  const { mutate: updateSetting } = useUpdateSetting();

  return (
    <BooleanSettingToggleButton
      enabled={enabled}
      label={t.chatInput.expandedChatInput}
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
