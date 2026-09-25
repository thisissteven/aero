import { useLocalhostPorts } from '@/app/hooks/api/system';
import { useI18n } from '@/app/hooks/i18n';

export function LocalhostPorts({
  onSelect,
}: {
  onSelect: (url: string) => void;
}) {
  const { data, isLoading } = useLocalhostPorts();
  const { t } = useI18n();

  if (isLoading || !data) {
    return (
      <div className='text-muted flex h-full flex-col items-center justify-center gap-2 text-sm'>
        <span>{t.browser.enterUrlToBrowse}</span>
      </div>
    );
  }

  if (data.ports.length === 0) {
    return (
      <div className='text-muted flex h-full items-center justify-center text-sm'>
        {t.browser.noActiveLocalhostPorts}
      </div>
    );
  }

  return (
    <div className='mx-auto flex w-full max-w-md flex-col items-center gap-3 p-6'>
      <div className='flex flex-col items-center gap-1 text-center'>
        <h3 className='text-foreground text-sm font-medium'>
          {t.browser.activeLocalhostPorts}
        </h3>
        <p className='text-muted text-xs'>{t.browser.selectRunningService}</p>
      </div>

      <ul className='w-full space-y-1.5'>
        {data.ports.map((port) => (
          <li key={port}>
            <button
              type='button'
              onClick={() => onSelect(port)}
              className='border-separator bg-surface hover:bg-field-hover text-foreground group focus-visible:ring-accent flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm transition-all duration-150 focus-visible:ring-2 focus-visible:outline-none'
            >
              <span className='truncate font-mono text-xs font-medium'>
                {port.startsWith('http') ? port : `http://${port}`}
              </span>

              <span className='text-muted group-hover:text-accent text-xs font-medium opacity-0 group-hover:opacity-100'>
                {t.browser.connect}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
