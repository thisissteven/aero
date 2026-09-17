import { cn } from '@aero/ui';
import { memo, ReactElement, SVGProps } from 'react';

export const CopyIcon = memo(function CopyIcon(
  props: SVGProps<SVGSVGElement>,
): ReactElement {
  return (
    <svg
      fill='none'
      height='16'
      viewBox='0 0 16 16'
      width='16'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        clipRule='evenodd'
        d='M12 2.5H8A1.5 1.5 0 0 0 6.5 4v1H8a3 3 0 0 1 3 3v1.5h1A1.5 1.5 0 0 0 13.5 8V4A1.5 1.5 0 0 0 12 2.5M11 11h1a3 3 0 0 0 3-3V4a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3v1H4a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3zM4 6.5h4A1.5 1.5 0 0 1 9.5 8v4A1.5 1.5 0 0 1 8 13.5H4A1.5 1.5 0 0 1 2.5 12V8A1.5 1.5 0 0 1 4 6.5'
        fill='currentColor'
        fillRule='evenodd'
      />
    </svg>
  );
});

export const CheckIcon = memo(function CheckIcon(
  props: SVGProps<SVGSVGElement>,
): ReactElement {
  return (
    <svg
      fill='none'
      height='16'
      viewBox='0 0 16 16'
      width='16'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        clipRule='evenodd'
        d='M13.488 3.43a.75.75 0 0 1 .081 1.058l-6 7a.75.75 0 0 1-1.1.042l-3.5-3.5A.75.75 0 0 1 4.03 6.97l2.928 2.927 5.473-6.385a.75.75 0 0 1 1.057-.081'
        fill='currentColor'
        fillRule='evenodd'
      />
    </svg>
  );
});

export const CopyMotionIcon = memo(function CopyMotionIcon({
  copied,
}: {
  copied: boolean;
}): ReactElement {
  return (
    <span className='relative flex size-3.5 items-center justify-center'>
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center transition-all duration-200',
          copied ? 'blur-0 opacity-100' : 'opacity-0 blur-sm',
        )}
      >
        <CheckIcon className='size-3.5' />
      </span>
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center transition-all duration-200',
          !copied ? 'blur-0 opacity-100' : 'opacity-0 blur-sm',
        )}
      >
        <CopyIcon className='size-3.5' />
      </span>
    </span>
  );
});
