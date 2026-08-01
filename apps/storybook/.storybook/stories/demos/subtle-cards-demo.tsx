import React from 'react';
import { tv } from 'tailwind-variants';

import { Avatar, Card } from '@aero/ui';

import { getRandomUserImage } from '@/seed';

const cardStyles = tv({
  slots: {
    avatar: 'size-[56px] rounded-xl',
    card: 'w-full',
    cardContent: 'items-start',
    footer: 'items-center gap-2',
    footerAvatar: 'size-4',
  },
});

export function SubtleCardsDemo() {
  const { avatar, card, cardContent, footer, footerAvatar } = cardStyles();
  const src = getRandomUserImage();

  return (
    <div className='flex w-full flex-row gap-4'>
      <Card className={card()}>
        <Card.Header>
          <Avatar className={avatar()}>
            <Avatar.Image alt='Demo 1' src={src} />
            <Avatar.Fallback>JK</Avatar.Fallback>
          </Avatar>
        </Card.Header>
        <Card.Content className={cardContent()}>
          <p className='text-sm font-medium'>Indie Hackers</p>
          <p className='text-muted text-sm'>148 members</p>
        </Card.Content>
        <Card.Footer className={footer()}>
          <Avatar className={footerAvatar()}>
            <Avatar.Image alt='John' src={src} />
            <Avatar.Fallback>JK</Avatar.Fallback>
          </Avatar>
          <p className='text-muted text-xs'>By John</p>
        </Card.Footer>
      </Card>
      <Card className={card()}>
        <Card.Header>
          <Avatar className={avatar()}>
            <Avatar.Image alt='AI Builders' src={src} />
            <Avatar.Fallback>J</Avatar.Fallback>
          </Avatar>
        </Card.Header>
        <Card.Content className={cardContent()}>
          <p className='text-sm font-medium'>AI Builders</p>
          <p className='text-muted text-sm'>362 members</p>
        </Card.Content>
        <Card.Footer className={footer()}>
          <Avatar className={footerAvatar()}>
            <Avatar.Image alt='Martha' src={src} />
            <Avatar.Fallback>M</Avatar.Fallback>
          </Avatar>
          <p className='text-muted text-xs'>By Martha</p>
        </Card.Footer>
      </Card>
    </div>
  );
}
