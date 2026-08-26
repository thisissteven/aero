import { Microphone } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { PromptInput } from '@aero/ui';

export function VoiceInputButton() {
  return (
    <PromptInput.Action aria-label='Use voice'>
      <Icon aria-hidden data={Microphone} />
    </PromptInput.Action>
  );
}
