import { composerSelectors, useComposerStore } from '../smart-composer-store';

export const SMART_COMPOSER_PLACEHOLDER =
  '@ for files/agents; / for commands and skills; ! for shell; # for snippets';
const shellPlaceholder = 'Press Esc/Backspace to exit shell mode';

export function ComposerPlaceholder() {
  const isEmpty = useComposerStore(composerSelectors.isEmpty);
  const state = useComposerStore(composerSelectors.mode);

  if (!isEmpty) {
    return null;
  }

  if (state === 'shell') {
    return (
      <div className='text-muted pointer-events-none absolute inset-x-[1.1rem] top-5 left-5 font-mono text-sm'>
        {shellPlaceholder}
      </div>
    );
  }

  return (
    <div className='text-muted pointer-events-none absolute inset-x-[1.1rem] top-5 left-5 text-sm'>
      {SMART_COMPOSER_PLACEHOLDER}
    </div>
  );
}
