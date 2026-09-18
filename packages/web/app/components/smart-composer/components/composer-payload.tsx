import { cn } from '@aero/ui';

import {
  getComposerSession,
  useComposerStore,
} from '@/app/components/smart-composer/smart-composer-store';
import { useSessionId } from '@/app/providers/SessionIdProvider';

export function ComposerPayload() {
  const sessionId = useSessionId();
  const payload = useComposerStore(
    (state) => getComposerSession(state, sessionId).payload,
  );

  return (
    <div>
      <h2 className='text-muted mt-6 mb-1 text-[13px]'>Structured Payload</h2>

      <pre
        className={cn(
          'mt-6 max-h-80 overflow-auto',
          'border-separator rounded-md border',
          'bg-surface p-4',
          'font-mono text-[13px] leading-[1.5]',
          'break-words whitespace-pre-wrap',
          'text-muted',
          'shadow-[var(--surface-shadow)]',
        )}
      >
        {payload ? (
          JSON.stringify(payload, null, 2)
        ) : (
          <strong className='text-foreground'>Awaiting submit...</strong>
        )}
      </pre>
    </div>
  );
}
