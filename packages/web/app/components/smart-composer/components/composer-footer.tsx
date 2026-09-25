import { cn } from '@aero/ui';
import { useI18n } from '@/app/hooks/i18n';

export function ComposerFooter({ handleSubmit }: { handleSubmit: () => void }) {
  const { t } = useI18n();

  return (
    <div className='mt-6 flex items-center justify-between gap-3'>
      <div className='text-muted text-[13px]'>{t.composer.footerHint}</div>

      <button
        type='button'
        className={cn(
          'cursor-pointer rounded-md',
          'bg-accent text-accent-foreground',
          'px-4 py-2',
          'text-[13px] font-medium',
          'shadow-[var(--surface-shadow)]',
          'transition-colors',
          'hover:bg-accent-hover',
          'active:bg-accent-hover',
        )}
        onClick={handleSubmit}
      >
        {t.composer.send}
      </button>
    </div>
  );
}
