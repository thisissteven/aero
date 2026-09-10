import { Layers } from '@gravity-ui/icons';

import { Typography } from '@aero/ui';

import { useSkillsCompact } from '@/app/hooks/api/capabilities';
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
  return (
    <div className='flex items-center justify-between'>
      <Typography type='body-xs' color='muted'>
        MCP servers
      </Typography>
      <Typography type='body-xs' className='text-foreground font-mono'>
        0
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
          <Layers className='text-muted h-4 w-4' />
          <Typography type='body-sm' className='text-foreground font-semibold'>
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
