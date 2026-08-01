import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '@/components/buttons/button';
import { Avatar } from '@/components/data-display/avatar';
import { Badge } from '@/components/data-display/badge';

import { Icon } from '@/icon';

import { EmptyState } from './index';

const meta = {
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Feedback/EmptyState',
} satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<any>;

function DefaultDemo() {
  return (
    <div className='w-[420px]'>
      <EmptyState>
        <EmptyState.Header>
          <EmptyState.Media variant='icon'>
            <Icon icon='lucide:folder-open' />
          </EmptyState.Media>
          <EmptyState.Title>No Projects Yet</EmptyState.Title>
          <EmptyState.Description>
            You haven&apos;t created any projects yet. Get started by creating
            your first project.
          </EmptyState.Description>
        </EmptyState.Header>
        <EmptyState.Content className='flex-row gap-2'>
          <Button>Create Project</Button>
          <Button variant='outline'>Import Project</Button>
        </EmptyState.Content>
      </EmptyState>
    </div>
  );
}

function OutlineDemo() {
  return (
    <div className='w-[420px]'>
      <EmptyState className='border-border rounded-2xl border border-dashed'>
        <EmptyState.Header>
          <EmptyState.Media variant='icon'>
            <Icon icon='lucide:cloud' />
          </EmptyState.Media>
          <EmptyState.Title>Cloud Storage Empty</EmptyState.Title>
          <EmptyState.Description>
            Upload files to your cloud storage to access them anywhere.
          </EmptyState.Description>
        </EmptyState.Header>
        <EmptyState.Content>
          <Button size='sm' variant='outline'>
            Upload Files
          </Button>
        </EmptyState.Content>
      </EmptyState>
    </div>
  );
}

function WithBackgroundDemo() {
  return (
    <div className='w-[420px]'>
      <EmptyState className='bg-surface-secondary rounded-2xl'>
        <EmptyState.Header>
          <EmptyState.Media
            className='bg-surface-tertiary border'
            variant='icon'
          >
            <Icon icon='lucide:bell' />
          </EmptyState.Media>
          <EmptyState.Title>No Notifications</EmptyState.Title>
          <EmptyState.Description className='max-w-xs text-pretty'>
            You&apos;re all caught up. New notifications will appear here.
          </EmptyState.Description>
        </EmptyState.Header>
        <EmptyState.Content>
          <Button variant='outline'>Refresh</Button>
        </EmptyState.Content>
      </EmptyState>
    </div>
  );
}

function UserAvatar({ alt, src }: { alt: string; src: string }) {
  return (
    <Avatar className='ring-background ring-2'>
      <Avatar.Image alt={alt} src={src} />
      <Avatar.Fallback>
        {alt
          .split(' ')
          .map((part) => part[0])
          .join('')}
      </Avatar.Fallback>
    </Avatar>
  );
}

function WithAvatarDemo() {
  return (
    <div className='w-[420px]'>
      <EmptyState>
        <EmptyState.Header>
          <EmptyState.Media>
            <Badge.Anchor>
              <Avatar className='size-12'>
                <Avatar.Image
                  alt='John Doe'
                  src='https://api.dicebear.com/10.x/adventurer-neutral/svg'
                />
                <Avatar.Fallback>JD</Avatar.Fallback>
              </Avatar>
              <Badge
                className='right-1 bottom-0.5 size-3 min-h-3 min-w-3'
                color='danger'
                placement='bottom-right'
                size='sm'
              />
            </Badge.Anchor>
          </EmptyState.Media>
          <EmptyState.Title>User Offline</EmptyState.Title>
          <EmptyState.Description>
            This user is currently offline. You can leave a message to notify
            them or try again later.
          </EmptyState.Description>
        </EmptyState.Header>
        <EmptyState.Content>
          <Button size='md' variant='secondary'>
            Leave Message
          </Button>
        </EmptyState.Content>
      </EmptyState>
    </div>
  );
}

function WithAvatarGroupDemo() {
  return (
    <div className='w-[420px]'>
      <EmptyState>
        <EmptyState.Header>
          <EmptyState.Media>
            <div className='flex -space-x-2'>
              <UserAvatar
                alt='John Doe'
                src='https://api.dicebear.com/10.x/adventurer-neutral/svg'
              />
              <UserAvatar
                alt='Kate Wilson'
                src='https://api.dicebear.com/10.x/adventurer-neutral/svg'
              />
              <UserAvatar
                alt='Emily Chen'
                src='https://api.dicebear.com/10.x/adventurer-neutral/svg'
              />
            </div>
          </EmptyState.Media>
          <EmptyState.Title>No Team Members</EmptyState.Title>
          <EmptyState.Description>
            Invite your team to collaborate on this project.
          </EmptyState.Description>
        </EmptyState.Header>
        <EmptyState.Content>
          <Button size='sm'>
            <Icon icon='lucide:plus' />
            Invite Members
          </Button>
        </EmptyState.Content>
      </EmptyState>
    </div>
  );
}

function SizesDemo() {
  return (
    <div className='flex flex-wrap items-start gap-6'>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div className='flex flex-col gap-2' key={size}>
          <span className='text-muted text-center text-xs'>{size}</span>
          <div className='border-border w-[300px] rounded-2xl border border-dashed'>
            <EmptyState size={size}>
              <EmptyState.Header>
                <EmptyState.Media variant='icon'>
                  <Icon icon='lucide:folder-open' />
                </EmptyState.Media>
                <EmptyState.Title>No Projects Yet</EmptyState.Title>
                <EmptyState.Description>
                  You haven&apos;t created any projects yet. Get started by
                  creating your first project.
                </EmptyState.Description>
              </EmptyState.Header>
              <EmptyState.Content className='flex-row gap-2'>
                <Button size={size}>Create Project</Button>
                <Button size={size} variant='outline'>
                  Import Project
                </Button>
              </EmptyState.Content>
            </EmptyState>
          </div>
        </div>
      ))}
    </div>
  );
}

function MinimalDemo() {
  return (
    <div className='w-[420px]'>
      <EmptyState>
        <EmptyState.Header>
          <EmptyState.Title>Nothing here yet</EmptyState.Title>
          <EmptyState.Description>
            Content will appear here once it becomes available.
          </EmptyState.Description>
        </EmptyState.Header>
      </EmptyState>
    </div>
  );
}

function FullHeightDemo() {
  return (
    <div className='border-border flex h-[400px] w-[500px] items-center justify-center rounded-2xl border border-dashed'>
      <EmptyState>
        <EmptyState.Header>
          <EmptyState.Media variant='icon'>
            <Icon icon='lucide:user' />
          </EmptyState.Media>
          <EmptyState.Title>No Results Found</EmptyState.Title>
          <EmptyState.Description className='max-w-xs text-pretty'>
            We couldn&apos;t find anything matching your search. Try adjusting
            your filters.
          </EmptyState.Description>
        </EmptyState.Header>
        <EmptyState.Content>
          <Button size='sm' variant='outline'>
            Clear Filters
          </Button>
        </EmptyState.Content>
      </EmptyState>
    </div>
  );
}

export const Default: Story = { render: () => <DefaultDemo /> };
export const Outline: Story = { render: () => <OutlineDemo /> };
export const WithBackground: Story = { render: () => <WithBackgroundDemo /> };
export const WithAvatar: Story = { render: () => <WithAvatarDemo /> };
export const WithAvatarGroup: Story = { render: () => <WithAvatarGroupDemo /> };
export const Sizes: Story = { render: () => <SizesDemo /> };
export const Minimal: Story = { render: () => <MinimalDemo /> };
export const FullHeight: Story = { render: () => <FullHeightDemo /> };
