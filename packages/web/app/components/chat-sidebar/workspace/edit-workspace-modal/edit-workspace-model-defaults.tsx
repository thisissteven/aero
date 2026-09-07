import { ArrowRotateLeft, CircleQuestion } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { Label, Tooltip } from '@aero/ui';

import { WorkspaceModelDropdown } from '@/app/components/chat-sidebar/workspace/workspace-model-dropdown';
import { IconButton } from '@/app/components/ui/icon-button';

import { useEditWorkspaceStore } from './edit-workspace-store';

export function EditWorkspaceModelDefaults() {
  const defaultModel = useEditWorkspaceStore((s) => s.defaultModel);
  const setDefaultModel = useEditWorkspaceStore((s) => s.setDefaultModel);

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center gap-1.5 font-medium'>
        <Label>Defaults for new chats</Label>
        <Tooltip>
          <Tooltip.Trigger className='inline-flex cursor-pointer'>
            <Icon data={CircleQuestion} size={16} />
          </Tooltip.Trigger>
          <Tooltip.Content>
            Default AI settings for new conversations in this workspace
          </Tooltip.Content>
        </Tooltip>
      </div>
      <div className='flex flex-col gap-2'>
        <Label>Project Model</Label>

        <div className='relative flex w-full items-center gap-2'>
          <WorkspaceModelDropdown
            value={defaultModel}
            onChange={(model) => setDefaultModel(model)}
          />
          <IconButton
            onPress={() => setDefaultModel(null)}
            variant='ghost'
            className='text-foreground shrink-0'
          >
            <Icon data={ArrowRotateLeft} className='text-foreground' />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
