import type { Selection } from '@react-types/shared';
import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { ListLayout, Virtualizer } from 'react-aria-components/Virtualizer';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/data-display/avatar';
import { Description } from '@/components/forms/description';
import { Label } from '@/components/forms/label';
import { Separator } from '@/components/layout/separator';
import { Surface } from '@/components/layout/surface';
import { Header } from '@/components/typography/header';
import { Kbd } from '@/components/typography/kbd';

import { Icon } from '@/icon';

import { ListBox } from './index';

const meta: Meta<typeof ListBox> = {
  component: ListBox,
  parameters: {
    layout: 'centered',
  },
  title: 'Components/Collections/ListBox',
};

export default meta;
type Story = StoryObj<typeof ListBox>;

export const Default: Story = {
  render: () => (
    <ListBox aria-label='Users' className='w-55' selectionMode='single'>
      <ListBox.Item id='1' textValue='Bob'>
        <Avatar size='sm'>
          <AvatarImage src='/assets/avatars/blue.jpg' />
          <AvatarFallback>B</AvatarFallback>
        </Avatar>
        <div className='flex flex-col'>
          <Label>Bob</Label>
          <Description>bob@aero.ui</Description>
        </div>
        <ListBox.ItemIndicator />
      </ListBox.Item>
      <ListBox.Item id='2' textValue='Fred'>
        <Avatar size='sm'>
          <AvatarImage src='/assets/avatars/green.jpg' />
          <AvatarFallback>F</AvatarFallback>
        </Avatar>
        <div className='flex flex-col'>
          <Label>Fred</Label>
          <Description>fred@aero.ui</Description>
        </div>
        <ListBox.ItemIndicator />
      </ListBox.Item>
      <ListBox.Item id='3' textValue='Martha'>
        <Avatar size='sm'>
          <AvatarImage src='/assets/avatars/purple.jpg' />
          <AvatarFallback>M</AvatarFallback>
        </Avatar>
        <div className='flex flex-col'>
          <Label>Martha</Label>
          <Description>martha@aero.ui</Description>
        </div>
        <ListBox.ItemIndicator />
      </ListBox.Item>
    </ListBox>
  ),
};

export const WithSections: Story = {
  render: () => (
    <Surface className='shadow-surface w-[256px] rounded-3xl'>
      <ListBox
        aria-label='File actions'
        className='w-full p-2'
        selectionMode='none'
        onAction={(key) => alert(`Selected item: ${key}`)}
      >
        <ListBox.Section>
          <Header>Actions</Header>
          <ListBox.Item id='new-file' textValue='New file'>
            <div className='flex h-8 items-start justify-center pt-px'>
              <Icon
                className='text-muted size-4 shrink-0'
                icon='hugeicons:square-plus'
              />
            </div>
            <div className='flex flex-col'>
              <Label>New file</Label>
              <Description>Create a new file</Description>
            </div>
            <Kbd className='ms-auto' variant='light'>
              <Kbd.Abbr keyValue='command' />
              <Kbd.Content>N</Kbd.Content>
            </Kbd>
          </ListBox.Item>
          <ListBox.Item id='edit-file' textValue='Edit file'>
            <div className='flex h-8 items-start justify-center pt-px'>
              <Icon
                className='text-muted size-4 shrink-0'
                icon='hugeicons:pencil'
              />
            </div>
            <div className='flex flex-col'>
              <Label>Edit file</Label>
              <Description>Make changes</Description>
            </div>
            <Kbd className='ms-auto' variant='light'>
              <Kbd.Abbr keyValue='command' />
              <Kbd.Content>E</Kbd.Content>
            </Kbd>
          </ListBox.Item>
        </ListBox.Section>
        <Separator />
        <ListBox.Section>
          <Header>Danger zone</Header>
          <ListBox.Item
            id='delete-file'
            textValue='Delete file'
            variant='danger'
          >
            <div className='flex h-8 items-start justify-center pt-px'>
              <Icon
                className='text-danger size-4 shrink-0'
                icon='hugeicons:trash-bin'
              />
            </div>
            <div className='flex flex-col'>
              <Label>Delete file</Label>
              <Description>Move to trash</Description>
            </div>
            <Kbd className='ms-auto' variant='light'>
              <Kbd.Abbr keyValue='command' />
              <Kbd.Abbr keyValue='shift' />
              <Kbd.Content>D</Kbd.Content>
            </Kbd>
          </ListBox.Item>
        </ListBox.Section>
      </ListBox>
    </Surface>
  ),
};

export const WithDisabledItems: Story = {
  render: () => (
    <Surface className='shadow-surface w-[256px] rounded-3xl'>
      <ListBox
        aria-label='File actions'
        className='w-full p-2'
        disabledKeys={['delete-file']}
        selectionMode='none'
        onAction={(key) => alert(`Selected item: ${key}`)}
      >
        <ListBox.Section>
          <Header>Actions</Header>
          <ListBox.Item id='new-file' textValue='New file'>
            <div className='flex h-8 items-start justify-center pt-px'>
              <Icon
                className='text-muted size-4 shrink-0'
                icon='hugeicons:square-plus'
              />
            </div>
            <div className='flex flex-col'>
              <Label>New file</Label>
              <Description>Create a new file</Description>
            </div>
            <Kbd className='ms-auto' variant='light'>
              <Kbd.Abbr keyValue='command' />
              <Kbd.Content>N</Kbd.Content>
            </Kbd>
          </ListBox.Item>
          <ListBox.Item id='edit-file' textValue='Edit file'>
            <div className='flex h-8 items-start justify-center pt-px'>
              <Icon
                className='text-muted size-4 shrink-0'
                icon='hugeicons:pencil'
              />
            </div>
            <div className='flex flex-col'>
              <Label>Edit file</Label>
              <Description>Make changes</Description>
            </div>
            <Kbd className='ms-auto' variant='light'>
              <Kbd.Abbr keyValue='command' />
              <Kbd.Content>E</Kbd.Content>
            </Kbd>
          </ListBox.Item>
        </ListBox.Section>
        <Separator />
        <ListBox.Section>
          <Header>Danger zone</Header>
          <ListBox.Item
            id='delete-file'
            textValue='Delete file'
            variant='danger'
          >
            <div className='flex h-8 items-start justify-center pt-px'>
              <Icon
                className='text-danger size-4 shrink-0'
                icon='hugeicons:trash-bin'
              />
            </div>
            <div className='flex flex-col'>
              <Label>Delete file</Label>
              <Description>Move to trash</Description>
            </div>
            <Kbd className='ms-auto' variant='light'>
              <Kbd.Abbr keyValue='command' />
              <Kbd.Abbr keyValue='shift' />
              <Kbd.Content>D</Kbd.Content>
            </Kbd>
          </ListBox.Item>
        </ListBox.Section>
      </ListBox>
    </Surface>
  ),
};

export const MultiSelect: Story = {
  render: () => (
    <Surface className='shadow-surface w-[256px] rounded-3xl'>
      <ListBox aria-label='Users' selectionMode='multiple'>
        <ListBox.Item id='1' textValue='Bob'>
          <Avatar size='sm'>
            <AvatarImage src='/assets/avatars/blue.jpg' />
            <AvatarFallback>B</AvatarFallback>
          </Avatar>
          <div className='flex flex-col'>
            <Label>Bob</Label>
            <Description>bob@aero.ui</Description>
          </div>
          <ListBox.ItemIndicator />
        </ListBox.Item>
        <ListBox.Item id='2' textValue='Fred'>
          <Avatar size='sm'>
            <AvatarImage src='/assets/avatars/green.jpg' />
            <AvatarFallback>F</AvatarFallback>
          </Avatar>
          <div className='flex flex-col'>
            <Label>Fred</Label>
            <Description>fred@aero.ui</Description>
          </div>
          <ListBox.ItemIndicator />
        </ListBox.Item>
        <ListBox.Item id='3' textValue='Martha'>
          <Avatar size='sm'>
            <AvatarImage src='/assets/avatars/purple.jpg' />
            <AvatarFallback>M</AvatarFallback>
          </Avatar>
          <div className='flex flex-col'>
            <Label>Martha</Label>
            <Description>martha@aero.ui</Description>
          </div>
          <ListBox.ItemIndicator />
        </ListBox.Item>
      </ListBox>
    </Surface>
  ),
};

export const CustomCheckIcon: Story = {
  render: () => (
    <Surface className='shadow-surface w-[256px] rounded-3xl'>
      <ListBox aria-label='Users' selectionMode='multiple'>
        <ListBox.Item id='1' textValue='Bob'>
          <Avatar size='sm'>
            <AvatarImage src='/assets/avatars/blue.jpg' />
            <AvatarFallback>B</AvatarFallback>
          </Avatar>
          <div className='flex flex-col'>
            <Label>Bob</Label>
            <Description>bob@aero.ui</Description>
          </div>
          <ListBox.ItemIndicator>
            {({ isSelected }) =>
              isSelected ? (
                <Icon className='text-accent size-4' icon='hugeicons:check' />
              ) : null
            }
          </ListBox.ItemIndicator>
        </ListBox.Item>
        <ListBox.Item id='2' textValue='Fred'>
          <Avatar size='sm'>
            <AvatarImage src='/assets/avatars/green.jpg' />
            <AvatarFallback>F</AvatarFallback>
          </Avatar>
          <div className='flex flex-col'>
            <Label>Fred</Label>
            <Description>fred@aero.ui</Description>
          </div>
          <ListBox.ItemIndicator>
            {({ isSelected }) =>
              isSelected ? (
                <Icon className='text-accent size-4' icon='hugeicons:check' />
              ) : null
            }
          </ListBox.ItemIndicator>
        </ListBox.Item>
        <ListBox.Item id='3' textValue='Martha'>
          <Avatar size='sm'>
            <AvatarImage src='/assets/avatars/purple.jpg' />
            <AvatarFallback>M</AvatarFallback>
          </Avatar>
          <div className='flex flex-col'>
            <Label>Martha</Label>
            <Description>martha@aero.ui</Description>
          </div>
          <ListBox.ItemIndicator>
            {({ isSelected }) =>
              isSelected ? (
                <Icon className='text-accent size-4' icon='hugeicons:check' />
              ) : null
            }
          </ListBox.ItemIndicator>
        </ListBox.Item>
      </ListBox>
    </Surface>
  ),
};

export const Controlled: Story = {
  render: function Story() {
    const [selected, setSelected] = React.useState<Selection>(new Set(['1']));

    const selectedItems = Array.from(selected);

    return (
      <div className='space-y-4'>
        <Surface className='shadow-surface w-[256px] rounded-3xl'>
          <ListBox
            aria-label='Users'
            selectedKeys={selected}
            selectionMode='multiple'
            onSelectionChange={setSelected}
          >
            <ListBox.Item id='1' textValue='Bob'>
              <Avatar size='sm'>
                <AvatarImage src='/assets/avatars/blue.jpg' />
                <AvatarFallback>B</AvatarFallback>
              </Avatar>
              <div className='flex flex-col'>
                <Label>Bob</Label>
                <Description>bob@aero.ui</Description>
              </div>
              <ListBox.ItemIndicator>
                {({ isSelected }) =>
                  isSelected ? (
                    <Icon
                      className='text-accent size-4'
                      icon='hugeicons:check'
                    />
                  ) : null
                }
              </ListBox.ItemIndicator>
            </ListBox.Item>
            <ListBox.Item id='2' textValue='Fred'>
              <Avatar size='sm'>
                <AvatarImage src='/assets/avatars/green.jpg' />
                <AvatarFallback>F</AvatarFallback>
              </Avatar>
              <div className='flex flex-col'>
                <Label>Fred</Label>
                <Description>fred@aero.ui</Description>
              </div>
              <ListBox.ItemIndicator>
                {({ isSelected }) =>
                  isSelected ? (
                    <Icon
                      className='text-accent size-4'
                      icon='hugeicons:check'
                    />
                  ) : null
                }
              </ListBox.ItemIndicator>
            </ListBox.Item>
            <ListBox.Item id='3' textValue='Martha'>
              <Avatar size='sm'>
                <AvatarImage src='/assets/avatars/purple.jpg' />
                <AvatarFallback>M</AvatarFallback>
              </Avatar>
              <div className='flex flex-col'>
                <Label>Martha</Label>
                <Description>martha@aero.ui</Description>
              </div>
              <ListBox.ItemIndicator>
                {({ isSelected }) =>
                  isSelected ? (
                    <Icon
                      className='text-accent size-4'
                      icon='hugeicons:check'
                    />
                  ) : null
                }
              </ListBox.ItemIndicator>
            </ListBox.Item>
          </ListBox>
        </Surface>
        <p className='text-muted text-sm'>
          Selected:{' '}
          {selectedItems.length > 0 ? selectedItems.join(', ') : 'None'}
        </p>
      </div>
    );
  },
};

export const Virtualization: Story = {
  render: function Story() {
    const firstNames = [
      'Emma',
      'Liam',
      'Olivia',
      'Noah',
      'Ava',
      'James',
      'Sophia',
      'Oliver',
      'Isabella',
      'Lucas',
      'Mia',
      'Ethan',
      'Charlotte',
      'Mason',
      'Amelia',
      'Logan',
      'Harper',
      'Alexander',
      'Ella',
      'Benjamin',
    ];

    const lastNames = [
      'Smith',
      'Johnson',
      'Williams',
      'Brown',
      'Jones',
      'Garcia',
      'Miller',
      'Davis',
      'Rodriguez',
      'Martinez',
      'Anderson',
      'Taylor',
      'Thomas',
      'Jackson',
      'White',
      'Harris',
      'Clark',
      'Lewis',
      'Robinson',
      'Walker',
    ];

    interface User {
      id: number;
      name: string;
      email: string;
    }

    function generateUsers(n: number): User[] {
      const users: User[] = [];

      for (let i = 0; i < n; i++) {
        const firstName = firstNames[i % firstNames.length];
        const lastName =
          lastNames[Math.floor(i / firstNames.length) % lastNames.length];
        const name = `${firstName} ${lastName}`;

        users.push({
          id: i + 1,
          name,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@acme.com`,
        });
      }

      return users;
    }

    const users = generateUsers(1000);

    return (
      <Virtualizer layout={ListLayout} layoutOptions={{ rowHeight: 50 }}>
        <ListBox
          aria-label='Virtualized list with 1000 items'
          className='h-[400px] w-[300px] overflow-y-auto'
          items={users}
        >
          {(user) => (
            <ListBox.Item id={user.id} textValue={user.name}>
              <div className='flex flex-col'>
                <Label>{user.name}</Label>
                <Description>{user.email}</Description>
              </div>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )}
        </ListBox>
      </Virtualizer>
    );
  },
};
