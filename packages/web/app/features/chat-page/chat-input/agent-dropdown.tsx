import { Check, ChevronDown, FaceRobot, Magnifier } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useMemo, useState } from 'react';

import { Button, Command, Popover } from '@aero/ui';

import { useAgentsCompact } from '@/app/hooks/api/agents';
import { capitalizeFirstLetter } from '@/app/lib/file';

import { useChatSettingsStore } from './chat-settings-store';

export function AgentDropdown() {
  const selectedAgent = useChatSettingsStore((state) => state.selectedAgent);
  const setSelectedAgent = useChatSettingsStore(
    (state) => state.setSelectedAgent,
  );

  const [isOpen, setIsOpen] = useState(false);
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
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button variant='tertiary' size='sm' className='gap-1.5 text-xs'>
        <Icon data={FaceRobot} className='size-3.5' />

        {selectedAgent?.name
          ? capitalizeFirstLetter(selectedAgent.name)
          : 'Select Agent'}

        <Icon data={ChevronDown} className='size-3' />
      </Button>

      <Popover.Content className='w-72 rounded-xl p-0' placement='top right'>
        <Command>
          <Command.Dialog
            filter={() => true}
            className='rounded-none border-none bg-transparent shadow-none'
          >
            <Command.InputGroup>
              <Command.InputGroup.Prefix>
                <Icon data={Magnifier} />
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
              <Command.List className='max-h-60 scroll-py-1 overflow-y-auto'>
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

                        setIsOpen(false);
                      }}
                    >
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
                        <Icon
                          data={Check}
                          className='text-accent size-4 shrink-0'
                        />
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            )}
          </Command.Dialog>
        </Command>
      </Popover.Content>
    </Popover>
  );
}
