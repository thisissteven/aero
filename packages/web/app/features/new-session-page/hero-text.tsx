import { TextShimmer } from '@aero/ui';

import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';

export function HeroText() {
  const state = useNewSessionStore((state) => state.state);

  const selectedWorkspace = useNewSessionStore(
    (state) => state.selectedWorkspace?.name,
  );

  if (selectedWorkspace && state === 'work') {
    return (
      <div className='flex flex-col items-center gap-2 text-center'>
        <h2 className='text-foreground text-3xl font-normal tracking-tight'>
          What are we working on in{' '}
          <TextShimmer className='shimmer-accent font-medium tracking-normal'>
            {selectedWorkspace}?
          </TextShimmer>
        </h2>
      </div>
    );
  }

  return (
    <div className='flex flex-col items-center gap-2 text-center'>
      <h2 className='text-foreground text-3xl font-normal tracking-tight'>
        Build something fun with{' '}
        <TextShimmer className='shimmer-accent font-medium tracking-normal'>
          Aero
        </TextShimmer>
      </h2>
    </div>
  );
}
