import { Dropdown, IconButton, Tooltip, toast } from '@aero/ui';
import { ChevronDown, CircleDashed, Play, Stop } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import {
  runTerminalCommand,
  stopTerminalCommand,
} from '@/app/components/chat-aside/terminal/terminal-controllers';
import { useTerminalStore } from '@/app/components/chat-aside/terminal/terminal-store';
import { useDiscoverScript } from '@/app/hooks/api/discovery';
import { useSession } from '@/app/hooks/api/sessions';
import { useSessionId } from '@/app/providers/SessionIdProvider';
import { useSidePanelStore } from '@/app/stores/side-panel-store';

export function ProjectActions() {
  const sessionId = useSessionId();

  const { data: session } = useSession(undefined, sessionId);

  const workspace = session?.workspace;

  if (!sessionId || !workspace) return null;

  return <ProjectActionsContent projectPath={workspace} />;
}

export function ProjectActionsContent({
  projectPath,
}: {
  projectPath: string;
}) {
  const { mutateAsync: discoverScript, isPending: isDiscovering } =
    useDiscoverScript();

  const terminalSession = useTerminalStore((state) =>
    state.sessions.find((session) => session.cwd === projectPath),
  );

  const addSession = useTerminalStore((state) => state.actions.addSession);

  const requestCommand = useTerminalStore(
    (state) => state.actions.requestCommand,
  );

  const isRunning = Boolean(terminalSession?.commandRunning);

  const openTerminal = () => {
    useSidePanelStore.getState().openPanel();
    useSidePanelStore.getState().setActiveNavItem('terminal');
  };

  const handlePrimaryAction = async () => {
    if (isDiscovering) return;

    if (terminalSession && isRunning) {
      stopTerminalCommand(terminalSession.id);
      return;
    }

    try {
      const result = await discoverScript(projectPath);

      if (!result.command) {
        toast.warning('No dev script discovered');
        return;
      }

      if (terminalSession) {
        requestCommand(terminalSession.id, result.command);

        const sent = runTerminalCommand(terminalSession.id, result.command);

        if (!sent) {
          // TerminalInstance may not be mounted yet.
          // The command request is already stored in Zustand and
          // TerminalInstance will consume it when its WebSocket connects.
          openTerminal();
          return;
        }

        openTerminal();
        return;
      }

      addSession({
        title: 'Dev Server',
        cwd: projectPath,
        command: result.command,
      });

      openTerminal();
    } catch (error) {
      console.error('[ProjectActions] Failed to discover script', error);
      toast.warning('Failed to discover dev script');
    }
  };

  let primaryIcon = <Play />;
  let tooltipText = 'Auto discover dev script';

  if (isDiscovering) {
    primaryIcon = <CircleDashed className='animate-spin' />;
    tooltipText = 'Discovering dev script...';
  } else if (isRunning) {
    primaryIcon = <Stop className='text-accent' />;
    tooltipText = 'Stop running script';
  }

  return (
    <div className='border-separator bg-surface/60 dark:bg-surface inline-flex items-center rounded-lg border p-0.5'>
      <Tooltip>
        <IconButton
          aria-label={tooltipText}
          onPress={handlePrimaryAction}
          isDisabled={isDiscovering}
          className='text-foreground h-6 w-7 opacity-80 disabled:opacity-80'
        >
          {primaryIcon}
        </IconButton>

        <Tooltip.Content offset={6}>{tooltipText}</Tooltip.Content>
      </Tooltip>

      <Dropdown size='sm'>
        <IconButton aria-label='Open in options' className='h-6 w-7'>
          <Icon data={ChevronDown} />
        </IconButton>

        <Dropdown.Popover
          className='w-44 max-sm:min-w-44'
          placement='bottom right'
          crossOffset={4}
        >
          <Dropdown.Menu className='flex flex-col gap-0.5'>
            <Dropdown.Item>left empty for now</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}
