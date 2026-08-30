import { CircleExclamation } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { cn, Sidebar } from '@aero/ui';

import { useWorkspaceItemDropdownStore } from '@/app/components/chat-sidebar/workspace/workspace-item-dropdown';
import { useGitErrorCode } from '@/app/hooks/api/git';

export function DirectoryNotFoundIndicator({
  directory,
}: {
  directory: string;
}) {
  const { data: errorCode } = useGitErrorCode(directory);

  const dropdownOpen = useWorkspaceItemDropdownStore(
    (state) => state.dropdownOpen === directory,
  );

  if (errorCode?.code === 'DIRECTORY_NOT_FOUND') {
    return (
      <Sidebar.MenuChip
        className={cn('hide-on-hover', dropdownOpen && 'hidden')}
      >
        <div className='text-danger'>
          <Icon data={CircleExclamation} size={12} />
        </div>
      </Sidebar.MenuChip>
    );
  }

  return null;
}
