import { ChevronDown, Sparkles } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { type ComponentProps, useMemo, useState } from 'react';

import {
  buildVirtualDropdownEntries,
  VirtualizedDropdown,
} from '@/app/components/virtualized-dropdown';
import { getAgentIconData } from '@/app/features/chat-page/chat-input/agents/get-agent-icon-data';
import { useI18n } from '@/app/hooks/i18n';
import type { AeroAgentCompact } from '@/server/services/harness/types';
import { capitalizeFirstLetter } from '@/server/shared';

// Match the surrounding form fields (Input/Select/WorkspaceModelDropdown)
// instead of the shared component's compact ghost trigger. `!` overrides keep
// the shared default intact for other VirtualizedDropdown consumers.
const TRIGGER_CLASS =
  'text-foreground bg-default/60! hover:bg-default-hover/60! w-full! justify-between rounded-lg! px-3! py-2! text-sm! font-normal!';

function TriggerLabel({
  icon,
  label,
}: {
  icon: ComponentProps<typeof Icon>['data'];
  label: string;
}) {
  return (
    <>
      <span className='flex min-w-0 items-center gap-1.5'>
        <Icon data={icon} className='size-3.5 shrink-0' />
        <span className='truncate'>{label}</span>
      </span>
      <Icon data={ChevronDown} className='size-3.5 shrink-0 opacity-60' />
    </>
  );
}

export function VariantPicker({
  variants,
  value,
  onChange,
}: {
  variants: string[];
  value: string;
  onChange: (variant: string) => void;
}) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? variants.filter((variant) => variant.toLowerCase().includes(normalized))
      : variants;
  }, [variants, query]);

  const entries = useMemo(
    () =>
      buildVirtualDropdownEntries({
        groups: [
          {
            id: 'variants',
            label: t.chatInput.thinkingVariants,
            items: filtered,
          },
        ],
        getKey: (variant) => variant,
      }),
    [filtered, t],
  );

  return (
    <VirtualizedDropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      entries={entries}
      selectedKey={value || null}
      getKey={(variant) => variant}
      onSelect={(variant) => {
        onChange(variant);
        setIsOpen(false);
      }}
      trigger={
        <TriggerLabel
          icon={Sparkles}
          label={
            value ? capitalizeFirstLetter(value) : t.chatInput.defaultVariant
          }
        />
      }
      triggerClassName={TRIGGER_CLASS}
      contentClassName='w-72'
      searchValue={query}
      onSearchValueChange={setQuery}
      searchPlaceholder={t.chatInput.searchVariants}
      emptyState={t.chatInput.noVariantsFound}
      renderRow={(variant) => (
        <div className='flex min-w-0 flex-1 flex-col'>
          <span className='truncate'>{capitalizeFirstLetter(variant)}</span>
        </div>
      )}
    />
  );
}

export function AgentPicker({
  agents,
  value,
  onChange,
}: {
  agents: AeroAgentCompact[];
  value: string;
  onChange: (agent: string) => void;
}) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return agents;
    return agents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(normalized) ||
        agent.description?.toLowerCase().includes(normalized),
    );
  }, [agents, query]);

  const entries = useMemo(
    () =>
      buildVirtualDropdownEntries({
        groups: [
          { id: 'agents', label: t.chatInput.nativeAgents, items: filtered },
        ],
        getKey: (agent) => agent.name,
      }),
    [filtered, t],
  );

  return (
    <VirtualizedDropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      entries={entries}
      selectedKey={value || null}
      getKey={(agent) => agent.name}
      onSelect={(agent) => {
        onChange(agent.name);
        setIsOpen(false);
      }}
      trigger={
        <TriggerLabel
          icon={getAgentIconData(value)}
          label={value ? capitalizeFirstLetter(value) : t.chatInput.selectAgent}
        />
      }
      triggerClassName={TRIGGER_CLASS}
      contentClassName='w-72'
      searchValue={query}
      onSearchValueChange={setQuery}
      searchPlaceholder={t.chatInput.searchAgentModes}
      emptyState={t.chatInput.noAgentsFound}
      renderRow={(agent) => (
        <div className='flex min-w-0 flex-1 flex-col'>
          <span className='truncate'>{capitalizeFirstLetter(agent.name)}</span>
          {agent.description && (
            <span className='text-muted line-clamp-2 text-xs'>
              {agent.description}
            </span>
          )}
        </div>
      )}
    />
  );
}
