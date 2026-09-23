import { cn } from '@aero/ui';

interface ChatQuoteProps {
  /** Already-parsed quote body, without the leading "> " markers. */
  text: string;
  className?: string;
}

export function ChatQuote({ text, className }: ChatQuoteProps) {
  if (text.length === 0) return null;

  return (
    <div
      className={cn(
        'group/quote relative max-w-4/5 line-clamp-3',
        'py-1 pr-3.5 text-right text-sm leading-relaxed text-muted',
        'whitespace-pre-wrap break-words',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute right-0 w-px rounded-full',
          'top-1.5 bottom-1.5',
          'bg-gradient-to-b from-transparent via-border to-transparent',
          'transition-[top,bottom,background] duration-300 ease-out',
          'group-hover/quote:top-0 group-hover/quote:bottom-0',
          'group-hover/quote:via-foreground/25',
        )}
      />
      {text}
    </div>
  );
}
