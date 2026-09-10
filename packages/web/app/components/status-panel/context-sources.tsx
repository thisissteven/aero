import { Layers } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { Typography } from '@aero/ui';

import { useSkillsCompact } from '@/app/hooks/api/capabilities';
import { useMCPs } from '@/app/hooks/api/mcp';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

function SkillsAmount() {
  const directory = useSessionDirectory();
  const { data: skills } = useSkillsCompact({ directory });
  const count = skills?.length ?? 0;

  return (
    <Typography type='body-xs' className='text-muted'>
      {count} {count === 1 ? 'skill' : 'skills'}
    </Typography>
  );
}

function SkillsSection() {
  const directory = useSessionDirectory();
  const { data: skills } = useSkillsCompact({ directory });
  const count = skills?.length ?? 0;

  return (
    <div className='flex items-center justify-between'>
      <Typography type='body-xs' color='muted'>
        Skills
      </Typography>
      <Typography type='body-xs' className='text-foreground font-mono'>
        {count}
      </Typography>
    </div>
  );
}

function McpSection() {
  const directory = useSessionDirectory();
  const { data: mcps } = useMCPs({ directory });
  const count = Object.entries(mcps ?? {}).length;

  return (
    <div className='flex items-center justify-between'>
      <Typography type='body-xs' color='muted'>
        MCP servers
      </Typography>
      <Typography type='body-xs' className='text-foreground font-mono'>
        {count}
      </Typography>
    </div>
  );
}

export function ContextSources() {
  const isVisible = useStatusPanelStore(
    (state) => state.visibleItems.contextSources,
  );

  if (!isVisible) return null;

  return (
    <div className='p-3'>
      <div className='mb-2.5 flex items-center justify-between'>
        <div className='flex items-center gap-1'>
          <Icon data={Layers} className='text-muted' size={14} />
          <Typography type='body-sm' className='text-foreground font-medium'>
            Context sources
          </Typography>
        </div>
        <SkillsAmount />
      </div>
      <div className='flex flex-col gap-1.5'>
        <SkillsSection />
        <McpSection />
      </div>
    </div>
  );
}
