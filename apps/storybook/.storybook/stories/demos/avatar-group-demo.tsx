import React from 'react';

import { Avatar } from '@aero/ui';

const avatars = [
  {
    image: '/assets/avatars/blue.jpg',
    name: 'Blue',
  },
  {
    image: '/assets/avatars/green.jpg',
    name: 'Green',
  },
  {
    image: '/assets/avatars/purple.jpg',
    name: 'Purple',
  },
  {
    image: '/assets/avatars/orange.jpg',
    name: 'Orange',
  },
  {
    image: '/assets/avatars/red.jpg',
    name: 'red',
  },
  {
    image: '/assets/avatars/blue.jpg',
    name: 'Blue',
  },
  {
    image: '/assets/avatars/black.jpg',
    name: 'Black',
  },
];

export function AvatarGroupDemo() {
  return (
    <div className='flex w-full justify-center'>
      <div className='flex -space-x-2'>
        {avatars.slice(0, 5).map((item) => (
          <Avatar key={item.image} className='ring-background ring-2'>
            <Avatar.Image alt={item.name} src={item.image} />
            <Avatar.Fallback>
              {item.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </Avatar.Fallback>
          </Avatar>
        ))}
        <Avatar className='ring-background ring-2'>
          <Avatar.Fallback className='bg-surface text-muted text-xs font-medium'>
            +{avatars.length - 2}
          </Avatar.Fallback>
        </Avatar>
      </div>
    </div>
  );
}
