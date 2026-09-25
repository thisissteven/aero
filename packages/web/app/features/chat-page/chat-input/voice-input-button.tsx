import { PromptInput } from '@aero/ui';
import { Microphone } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { useI18n } from '@/app/hooks/i18n';

export function VoiceInputButton() {
  const { t } = useI18n();

  return (
    <PromptInput.Action aria-label={t.chatInput.useVoiceAria} variant='ghost'>
      <Icon aria-hidden data={Microphone} />
    </PromptInput.Action>
  );
}
