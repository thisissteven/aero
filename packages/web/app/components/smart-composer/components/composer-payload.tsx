import { cn } from '@aero/ui';

import { useComposerStore } from '@/app/components/smart-composer/smart-composer-store';

export function ComposerPayload() {
  const payload = useComposerStore((state) => state.payload);

  return (
    <div>
      <h2 className='text-muted mt-6 mb-1 text-[13px]'>Structured Payload</h2>

      <pre
        className={cn(
          'mt-6 max-h-80 overflow-auto',
          'border-separator dark:border-separator:40 rounded-md border',
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
