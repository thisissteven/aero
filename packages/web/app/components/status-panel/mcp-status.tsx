import { Check, LogoMcp, Power } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { Switch } from '@heroui/react';

import { Typography } from '@aero/ui';

import { useConnectMCP, useDisconnectMCP, useMCPs } from '@/app/hooks/api/mcp';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';
import { AeroMCPStatus } from '@/server/services/harness/types';

function McpAmount() {
  const directory = useSessionDirectory();
  const { data: mcps } = useMCPs({ directory });

  const entries = Object.values(mcps ?? {}) as AeroMCPStatus[];
  const total = entries.length;
  const connectedCount = entries.filter(
    (item) => item.status === 'connected',
  ).length;

  return (
    <Typography type='body-xs' className='text-muted'>
      {connectedCount}/{total}
    </Typography>
  );
}

interface McpServerItemProps {
  name: string;
  status: AeroMCPStatus;
  directory?: string;
}

function McpServerItem({ name, status, directory }: McpServerItemProps) {
  const { mutate: connect, isPending: isConnecting } = useConnectMCP();
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnectMCP();

  const isConnected = status.status === 'connected';
  const isPending = isConnecting || isDisconnecting;

  const handleToggle = () => {
    if (isConnected) {
      disconnect({ name, directory });
    } else {
      connect({ name, directory });
    }
  };

  return (
    <div
      className={`flex items-center justify-between ${
        isPending ? 'opacity-50' : ''
      }`}
      inert={isPending}
    >
      <Typography type='body-xs' className='text-foreground font-medium'>
        {name}
      </Typography>
      <Switch
        size='sm'
        isSelected={isConnected}
        onChange={handleToggle}
        aria-label={`Toggle ${name} server`}
      >
        {({ isSelected }) => (
          <Switch.Content>
            <Switch.Control className={isSelected ? 'bg-success/80' : ''}>
              <Switch.Thumb>
                <Switch.Icon>
                  {isSelected ? (
                    <Check className='size-2 text-inherit opacity-100' />
                  ) : (
                    <Power className='size-2 text-inherit opacity-70' />
                  )}
                </Switch.Icon>
              </Switch.Thumb>
            </Switch.Control>
          </Switch.Content>
        )}
      </Switch>
    </div>
  );
}

function McpServerList() {
  const directory = useSessionDirectory();
  const { data: mcps } = useMCPs({ directory });

  const entries = Object.entries(mcps ?? {});

  if (entries.length === 0) {
    return (
      <Typography type='body-xs' color='muted'>
        No MCP servers found
      </Typography>
    );
  }

  return (
    <div className='flex flex-col gap-2'>
      {entries.map(([name, item]) => (
        <McpServerItem
          key={name}
          name={name}
          status={item as AeroMCPStatus}
          directory={directory}
        />
      ))}
    </div>
  );
}

export function McpStatus() {
  const isVisible = useStatusPanelStore((state) => state.visibleItems.mcp);

  if (!isVisible) return null;

  return (
    <div className='border-separator border-b p-3'>
      <div className='mb-2.5 flex items-center justify-between'>
        <div className='flex items-center gap-1'>
          <Icon data={LogoMcp} className='text-muted' size={14} />
          <Typography type='body-sm' className='text-foreground font-medium'>
            MCP Status
          </Typography>
        </div>
        <McpAmount />
      </div>
      <McpServerList />
    </div>
  );
}
