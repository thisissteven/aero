import { Button } from '@aero/ui';
import {
  ArrowsRotateLeft,
  Copy,
  Ellipsis,
  ThumbsDown,
  ThumbsUp,
} from '@gravity-ui/icons';

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
          >
            <ThumbsUp className='size-4' />
          </Button>
          <Button
            isIconOnly
            className='text-muted opacity-50'
            size='sm'
            variant='ghost'
          >
            <ThumbsDown className='size-4' />
          </Button>
          <Button
            isIconOnly
            className='text-muted opacity-50'
            size='sm'
            variant='ghost'
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
      >
        <Ellipsis className='size-4' />
      </Button>
    </div>
  );
}
