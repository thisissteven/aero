import { Typography } from '@aero/ui';
import { Layers } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { useSkillsCompact } from '@/app/hooks/api/capabilities';
import { useMCPs } from '@/app/hooks/api/mcp';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

function SkillsAmount() {
  const directory = useSessionDirectory();
  const { data: skills } = useSkillsCompact({ directory });
  const count = skills?.length ?? 0;
  const { t } = useI18n();

  return (
    <Typography type='body-xs' className='text-muted'>
      {t.statusPanel.skillCount(count)}
    </Typography>
  );
}

function SkillsSection() {
  const directory = useSessionDirectory();
  const { data: skills } = useSkillsCompact({ directory });
  const count = skills?.length ?? 0;
  const { t } = useI18n();

  return (
    <div className='flex items-center justify-between'>
      <Typography type='body-xs' color='muted'>
        {t.statusPanel.skills}
      </Typography>
      <Typography type='body-xs' className='text-foreground'>
        {count}
      </Typography>
    </div>
  );
}

function McpSection() {
  const directory = useSessionDirectory();
  const { data: mcps } = useMCPs({ directory });
  const count = Object.entries(mcps ?? {}).length;
  const { t } = useI18n();

  return (
    <div className='flex items-center justify-between'>
      <Typography type='body-xs' color='muted'>
        {t.statusPanel.mcpServers}
      </Typography>
      <Typography type='body-xs' className='text-foreground'>
        {count}
      </Typography>
    </div>
  );
}

export function ContextSources() {
  const isVisible = useStatusPanelStore(
    (state) => state.visibleItems.contextSources,
  );
  const { t } = useI18n();

  if (!isVisible) return null;

  return (
    <div className='p-3'>
      <div className='mb-2.5 flex items-center justify-between'>
        <div className='flex items-center gap-1'>
          <Icon data={Layers} className='text-muted' size={14} />
          <Typography type='body-sm' className='text-foreground font-medium'>
            {t.statusPanel.contextSources}
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
