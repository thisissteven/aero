import {
  ChevronsCollapseUpRight,
  ChevronsExpandUpRight,
} from '@gravity-ui/icons';

import {
  useChatInputExpanded,
  useToggleChatInputExpanded,
} from '@/app/hooks/api/config';

import { BooleanSettingToggleButton } from './boolean-setting';

export function ChatInputExpandedToggleButton({
  sessionId,
}: {
  sessionId: string;
}) {
  const { data } = useChatInputExpanded(sessionId);

  const { mutate: toggleChatInputExpanded } = useToggleChatInputExpanded();

  const enabled = data?.value ?? false;

  return (
    <BooleanSettingToggleButton
      enabled={enabled}
      label='Expanded chat input'
      icon={enabled ? <ChevronsCollapseUpRight /> : <ChevronsExpandUpRight />}
      onPress={() => toggleChatInputExpanded(sessionId)}
      className='bg-transparent hover:bg-transparent'
    />
  );
}
