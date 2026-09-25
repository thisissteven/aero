import { useI18n } from '@/app/hooks/i18n';
import { useSessionId } from '@/app/providers/SessionIdProvider';
import { getComposerSession, useComposerStore } from '../smart-composer-store';

/** `data-placeholder` attribute consumed by the CSS `:empty` placeholder. */
export const SMART_COMPOSER_PLACEHOLDER =
  '@ for files/agents; / for commands and skills; ! for shell; # for snippets';

export function ComposerPlaceholder() {
  const sessionId = useSessionId();
  const { t } = useI18n();
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
        {t.composer.exitShellMode}
      </div>
    );
  }

  return (
    <div className='text-muted pointer-events-none absolute inset-x-[1.1rem] top-5 left-5 pr-4 text-sm'>
      {t.composer.placeholderHint}
    </div>
  );
}
