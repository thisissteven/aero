import { composerSelectors, useComposerStore } from '../smart-composer-store';

export const SMART_COMPOSER_PLACEHOLDER =
  'Type a message using @, /, # or ! ...';
const shellPlaceholder = 'You are now in shell mode';

export function ComposerPlaceholder() {
  const isEmpty = useComposerStore(composerSelectors.isEmpty);
  const state = useComposerStore(composerSelectors.mode);

  if (!isEmpty) {
    return null;
  }

  if (state === 'shell') {
    return (
      <div className='text-muted pointer-events-none absolute inset-x-[1.1rem] top-4 font-mono'>
        {shellPlaceholder}
      </div>
    );
  }

  return (
    <div className='text-muted pointer-events-none absolute inset-x-[1.1rem] top-4'>
      {SMART_COMPOSER_PLACEHOLDER}
    </div>
  );
}
