import { PromptInput } from '@aero/ui';
import { File, Folder, Picture, Plus } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { CollapsibleActions } from '@/app/components/collapsible-actions';

import { useI18n } from '@/app/hooks/i18n';

interface FileAttachmentsButtonProps {
  isMobile: boolean;
}

export function FileAttachmentsButton({
  isMobile,
}: FileAttachmentsButtonProps) {
  const { t } = useI18n();

  return (
    <CollapsibleActions
      expandBehavior='horizontal'
      expandOrigin='trigger-right'
      gap={isMobile ? 44 : 40}
      distance={isMobile ? 44 : 40}
    >
      <CollapsibleActions.Trigger>
        <PromptInput.Action
          aria-label={t.chatInput.addContextAria}
          variant='ghost'
        >
          <Icon aria-hidden data={Plus} />
        </PromptInput.Action>
      </CollapsibleActions.Trigger>

      <CollapsibleActions.Contents>
        <PromptInput.Action aria-label={t.chatInput.attachFilesAria}>
          <Icon aria-hidden data={File} />
        </PromptInput.Action>

        <PromptInput.Action aria-label={t.chatInput.attachImagesAria}>
          <Icon aria-hidden data={Picture} />
        </PromptInput.Action>

        <PromptInput.Action aria-label={t.chatInput.attachFoldersAria}>
          <Icon aria-hidden data={Folder} />
        </PromptInput.Action>
      </CollapsibleActions.Contents>
    </CollapsibleActions>
  );
}
