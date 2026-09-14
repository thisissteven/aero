import { Folder } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import {
  ACCENT_COLORS_MAP,
  PROJECT_ICON_MAP,
} from '@/app/components/chat-sidebar/workspace/edit-workspace-modal/edit-workspace-constants';
import { AeroWorkspaceSummary } from '@/server/services/harness/types';

export function WorkspaceIcon({
  workspace,
}: {
  workspace: AeroWorkspaceSummary;
}) {
  const isCustomIcon =
    !PROJECT_ICON_MAP[workspace.selectedIcon as keyof typeof PROJECT_ICON_MAP];

  return !workspace.selectedIcon ? (
    <Icon
      data={Folder}
      size={14}
      style={{
        color:
          ACCENT_COLORS_MAP[
            workspace.selectedColor as keyof typeof ACCENT_COLORS_MAP
          ] ?? workspace.selectedColor,
      }}
    />
  ) : isCustomIcon ? (
    <img
      src={workspace.selectedIcon}
      alt={workspace.name}
      className='size-3.5'
    />
  ) : (
    <Icon
      data={
        PROJECT_ICON_MAP[
          workspace.selectedIcon as keyof typeof PROJECT_ICON_MAP
        ]
      }
      style={{
        color:
          ACCENT_COLORS_MAP[
            workspace.selectedColor as keyof typeof ACCENT_COLORS_MAP
          ] ?? workspace.selectedColor,
      }}
      size={14}
    />
  );
}
