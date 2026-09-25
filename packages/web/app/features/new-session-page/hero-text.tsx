import { TextShimmer } from '@aero/ui';

import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';
import { useChatInputExpanded } from '@/app/hooks/api/settings';
import { useI18n } from '@/app/hooks/i18n';

export function HeroText() {
  const state = useNewSessionStore((state) => state.state);

  const selectedWorkspace = useNewSessionStore(
    (state) => state.selectedWorkspace?.name,
  );

  const enabled = useChatInputExpanded();

  const { t } = useI18n();

  if (enabled) return null;

  if (selectedWorkspace && state === 'work') {
    return (
      <div className='flex max-w-[720px] flex-col items-center gap-2 text-center'>
        <h2 className='text-foreground text-3xl font-normal tracking-tight'>
          {t.newSession.heroQuestionPrefix}
          <TextShimmer className='shimmer-accent font-medium tracking-normal'>
            {selectedWorkspace}
            {t.newSession.heroQuestionSuffix}
          </TextShimmer>
        </h2>
      </div>
    );
  }

  return (
    <div className='flex flex-col items-center gap-2 text-center'>
      <h2 className='text-foreground text-3xl font-normal tracking-tight'>
        {t.newSession.buildSomethingFunPrefix}
        <TextShimmer className='shimmer-accent font-medium tracking-normal'>
          Aero
        </TextShimmer>
        {t.newSession.buildSomethingFunSuffix}
      </h2>
    </div>
  );
}
