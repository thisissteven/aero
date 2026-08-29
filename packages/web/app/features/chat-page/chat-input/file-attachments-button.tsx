import { File, Folder, Picture, Plus } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { PromptInput } from '@aero/ui';

import { CollapsibleActions } from '@/app/components/collapsible-actions';

interface FileAttachmentsButtonProps {
  isMobile: boolean;
}

export function FileAttachmentsButton({
  isMobile,
}: FileAttachmentsButtonProps) {
  return (
    <CollapsibleActions
      expandBehavior='horizontal'
      expandOrigin='trigger-right'
      gap={isMobile ? 44 : 40}
      distance={isMobile ? 44 : 40}
    >
      <CollapsibleActions.Trigger>
        <PromptInput.Action aria-label='Add context' variant='ghost'>
          <Icon aria-hidden data={Plus} />
        </PromptInput.Action>
      </CollapsibleActions.Trigger>

      <CollapsibleActions.Contents>
        <PromptInput.Action aria-label='Attach Files'>
          <Icon aria-hidden data={File} />
        </PromptInput.Action>

        <PromptInput.Action aria-label='Attach Images'>
          <Icon aria-hidden data={Picture} />
        </PromptInput.Action>

        <PromptInput.Action aria-label='Attach Folders'>
          <Icon aria-hidden data={Folder} />
        </PromptInput.Action>
      </CollapsibleActions.Contents>
    </CollapsibleActions>
  );
}
