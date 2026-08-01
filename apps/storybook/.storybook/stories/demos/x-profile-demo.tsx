import React from 'react';

import { Avatar, Card } from '@aero/ui';

import { VerifiedBadgeIcon } from './components/icons';

export function XProfileDemo() {
  return (
    <Card className='w-[400px] items-start justify-center'>
      <Card.Header className='items-top w-full flex-row justify-between'>
        <div className='flex items-center gap-3'>
          <Avatar size='sm'>
            <Avatar.Image
              alt='Aero'
              src='https://pbs.twimg.com/profile_images/1987571645599346689/lmCqz52H_400x400.jpg'
            />
            <Avatar.Fallback>H</Avatar.Fallback>
          </Avatar>
          <div className='flex h-full flex-col items-start justify-center'>
            <div className='flex items-center gap-0.5'>
              <span className='text-sm leading-4 font-semibold'>Aero</span>
              <VerifiedBadgeIcon height={18} width={18} />
            </div>
            <span className='text-muted text-sm tracking-tight'>@aero/ui</span>
          </div>
        </div>
      </Card.Header>
      <Card.Content className='flex-row text-left'>
        <p className='pl-px text-sm font-medium'>
          Growing ENS through Partnerships, Integrations, and making Subname
          registrations easy for humans and agents.
          <br />
          <br />
          <span aria-label='confetti' role='img'>
            🥷
          </span>
        </p>
      </Card.Content>
      <Card.Footer className='gap-2'>
        <div className='flex gap-1'>
          <p className='text-sm font-semibold'>4</p>
          <p className='text-muted text-sm'>Following</p>
        </div>
        <div className='flex gap-1'>
          <p className='text-sm font-semibold'>97.1K</p>
          <p className='text-muted text-sm'>Followers</p>
        </div>
      </Card.Footer>
    </Card>
  );
}
