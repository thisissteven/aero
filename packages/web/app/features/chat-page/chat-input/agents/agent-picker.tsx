import {
  Bulb,
  Check,
  FaceRobot,
  Magnifier,
  PersonWorker,
  PlanetEarth,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useMemo, useState } from 'react';

import { Command } from '@aero/ui';

import { useAgentsCompact } from '@/app/hooks/api/agents';
import { capitalizeFirstLetter } from '@/app/lib/file';

import { useChatSettingsStore } from '../chat-settings-store';

export function getAgentIconData(name?: string) {
  switch (name?.toLowerCase()) {
    case 'build':
      return PersonWorker;
    case 'plan':
      return Bulb;
    case 'explore':
      return Magnifier;
    case 'general':
      return PlanetEarth;
    default:
      return FaceRobot;
  }
}

interface AgentPickerProps {
  onAgentSelect?: () => void;
}

export function AgentPicker({ onAgentSelect }: AgentPickerProps) {
  const selectedAgent = useChatSettingsStore((state) => state.selectedAgent);

  const setSelectedAgent = useChatSettingsStore(
    (state) => state.setSelectedAgent,
  );

  const [searchQuery, setSearchQuery] = useState('');

  const { data: agentsData } = useAgentsCompact();

  const visibleAgents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!agentsData) {
      return [];
    }

    return agentsData
      .filter((agent) => agent.native === true)
      .filter((agent) => {
        if (!query) {
          return true;
        }

        return (
          agent.name.toLowerCase().includes(query) ||
          agent.description?.toLowerCase().includes(query)
        );
      });
  }, [agentsData, searchQuery]);

  return (
    <div className='flex min-h-0 flex-col'>
      <Command>
        <Command.Dialog
          filter={() => true}
          className='max-w-full rounded-none border-none bg-transparent shadow-none'
        >
          <Command.InputGroup>
            <Command.InputGroup.Prefix>
              <Icon data={Magnifier} className='size-3.5' />
            </Command.InputGroup.Prefix>

            <Command.InputGroup.Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className='py-2.5 text-sm'
              placeholder='Search agent modes...'
            />

            <Command.InputGroup.ClearButton />
          </Command.InputGroup>

          {visibleAgents.length === 0 ? (
            <div className='text-muted flex h-24 items-center justify-center text-sm'>
              No agents found.
            </div>
          ) : (
            <Command.List className='scroll-py-1 overflow-y-auto p-1 @md:max-h-72'>
              <Command.Group heading='Native Agents'>
                {visibleAgents.map((agent) => (
                  <Command.Item
                    key={agent.name}
                    textValue={agent.name}
                    onAction={() => {
                      setSelectedAgent({
                        name: agent.name,
                        description: agent.description,
                      });

                      onAgentSelect?.();
                    }}
                  >
                    <Icon
                      data={getAgentIconData(agent.name)}
                      className='size-4 shrink-0'
                    />

                    <div className='flex min-w-0 flex-1 flex-col'>
                      <span className='truncate'>
                        {capitalizeFirstLetter(agent.name)}
                      </span>

                      {agent.description && (
                        <span className='text-muted line-clamp-2 text-xs'>
                          {agent.description}
                        </span>
                      )}
                    </div>

                    {selectedAgent?.name === agent.name && (
                      <Icon data={Check} className='size-4 shrink-0' />
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          )}
        </Command.Dialog>
      </Command>
    </div>
  );
}
