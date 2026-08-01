import React from 'react';

import { Avatar } from '@aero/ui';

import { getRandomUserImage } from '@/seed';

const src = getRandomUserImage();

const avatars = [
  {
    image: src,
    name: 'Blue',
  },
  {
    image: src,
    name: 'Green',
  },
  {
    image: src,
    name: 'Purple',
  },
  {
    image: src,
    name: 'Orange',
  },
  {
    image: src,
    name: 'red',
  },
  {
    image: src,
    name: 'Blue',
  },
  {
    image: src,
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
