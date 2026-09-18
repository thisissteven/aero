import { useSessionId } from '@/app/providers/SessionIdProvider';
import { getComposerSession, useComposerStore } from '../smart-composer-store';

export const SMART_COMPOSER_PLACEHOLDER =
  '@ for files/agents; / for commands and skills; ! for shell; # for snippets';
const shellPlaceholder = 'Press Esc/Backspace to exit shell mode';

export function ComposerPlaceholder() {
  const sessionId = useSessionId();
  const isEmpty = useComposerStore(
    (state) => getComposerSession(state, sessionId).segments.length === 0,
  );
  const mode = useComposerStore(
    (state) => getComposerSession(state, sessionId).mode,
  );

  if (!isEmpty) {
    return null;
  }

  if (mode === 'shell') {
    return (
      <div className='text-muted pointer-events-none absolute inset-x-[1.1rem] top-5 left-5 pr-4 font-mono text-sm'>
        {shellPlaceholder}
      </div>
    );
  }

  return (
    <div className='text-muted pointer-events-none absolute inset-x-[1.1rem] top-5 left-5 pr-4 text-sm'>
      {SMART_COMPOSER_PLACEHOLDER}
    </div>
  );
}
