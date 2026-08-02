import {
  ArrowsRotateLeft,
  Copy,
  Ellipsis,
  ThumbsDown,
  ThumbsUp,
} from '@gravity-ui/icons';

import { Button } from '@aero/ui';

interface MessageActionsProps {
  variant: 'full' | 'minimal';
}

export function MessageActions({ variant }: MessageActionsProps) {
  return (
    <div className='flex items-start'>
      <Button
        isIconOnly
        className='text-muted opacity-50'
        size='sm'
        variant='ghost'
        onPress={() => {}}
      >
        <Copy className='size-4' />
      </Button>
      {variant === 'full' ? (
        <>
          <Button
            isIconOnly
            className='text-muted opacity-50'
            size='sm'
            variant='ghost'
            onPress={() => {}}
          >
            <ThumbsUp className='size-4' />
          </Button>
          <Button
            isIconOnly
            className='text-muted opacity-50'
            size='sm'
            variant='ghost'
            onPress={() => {}}
          >
            <ThumbsDown className='size-4' />
          </Button>
          <Button
            isIconOnly
            className='text-muted opacity-50'
            size='sm'
            variant='ghost'
            onPress={() => {}}
          >
            <ArrowsRotateLeft className='size-4' />
          </Button>
        </>
      ) : null}
      <Button
        isIconOnly
        className='text-muted opacity-50'
        size='sm'
        variant='ghost'
        onPress={() => {}}
      >
        <Ellipsis className='size-4' />
      </Button>
    </div>
  );
}
