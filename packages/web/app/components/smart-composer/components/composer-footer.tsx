import { cn } from '@aero/ui';

export function ComposerFooter({ handleSubmit }: { handleSubmit: () => void }) {
  return (
    <div className='mt-6 flex items-center justify-between gap-3'>
      <div className='text-muted text-[13px]'>
        Enter = submit · Shift+Enter = newline · ↑/↓ = palette
      </div>

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
        Send
      </button>
    </div>
  );
}
