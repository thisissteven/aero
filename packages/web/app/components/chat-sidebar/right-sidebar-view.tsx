import { Sidebar } from '@aero/ui';
import { ArrowUturnCcwLeft, Xmark } from '@gravity-ui/icons';

import { useWorkspacesSidebarStore } from '@/app/components/chat-sidebar/sidebar-store';
import { useWorkspaceStore } from '@/app/components/chat-sidebar/workspace/workspaces-store';
import { useI18n } from '@/app/hooks/i18n';

export function RightSidebarview({
  closeWorkspace,
}: {
  closeWorkspace: () => void;
}) {
  const { t } = useI18n();

  const toggleIsEditModeWorkspaces = useWorkspacesSidebarStore(
    (state) => state.toggleisEditMode,
  );

  const state = useWorkspaceStore((state) => state.state);
  const isolatedWorkspaceDirectory = useWorkspaceStore(
    (state) => state.isolatedWorkspaceDirectory,
  );

  const setState = useWorkspaceStore((state) => state.setState);
  const setIsolatedWorkspaceDirectory = useWorkspaceStore(
    (state) => state.setIsolatedWorkspaceDirectory,
  );

  if (state === 'isolated' && isolatedWorkspaceDirectory) {
    return (
      <Sidebar.Group className='px-3'>
        <Sidebar.Menu aria-label={t.session.chatActions}>
          <Sidebar.MenuItem
            textValue='Exit isolation mode'
            onPress={() => {
              if (useWorkspacesSidebarStore.getState().isEditMode) {
                toggleIsEditModeWorkspaces();
              }
              setState('all');
              setIsolatedWorkspaceDirectory(null);
            }}
            closeMobileOnAction={false}
          >
            <Sidebar.MenuIcon>
              <Xmark className='size-4' />
            </Sidebar.MenuIcon>
            <Sidebar.MenuLabel>
              {t.session.exitIsolatedWorkspace}
            </Sidebar.MenuLabel>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.Group>
    );
  }

  return (
    <Sidebar.Group className='px-3'>
      <Sidebar.Menu aria-label={t.session.chatActions}>
        <Sidebar.MenuItem
          textValue='Back'
          onPress={() => {
            if (useWorkspacesSidebarStore.getState().isEditMode) {
              toggleIsEditModeWorkspaces();
            }
            closeWorkspace();
          }}
          closeMobileOnAction={false}
        >
          <Sidebar.MenuIcon>
            <ArrowUturnCcwLeft className='size-4' />
          </Sidebar.MenuIcon>
          <Sidebar.MenuLabel>{t.common.back}</Sidebar.MenuLabel>
        </Sidebar.MenuItem>
      </Sidebar.Menu>
    </Sidebar.Group>
  );
}
