import { cn } from '@aero/ui';
import {
  createContext,
  type DragEvent as ReactDragEvent,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
} from 'react';

export type DropPosition = 'before' | 'after';

interface StatusSectionHandleContextValue {
  onDragStart: (event: ReactDragEvent) => void;
  onDragEnd: () => void;
}

const StatusSectionHandleContext =
  createContext<StatusSectionHandleContextValue | null>(null);

const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, [role="button"], [data-no-drag]';

export function StatusSectionHandle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const handle = useContext(StatusSectionHandleContext);

  return (
    <div
      className={cn(
        'select-none',
        handle && 'cursor-grab active:cursor-grabbing',
        className,
      )}
      draggable={Boolean(handle)}
      onDragEnd={() => handle?.onDragEnd()}
      onDragStart={(event) => {
        if (!handle) return;

        const target = event.target as HTMLElement;
        if (target.closest(INTERACTIVE_SELECTOR)) {
          event.preventDefault();
          return;
        }

        handle.onDragStart(event);
      }}
    >
      {children}
    </div>
  );
}

export function SortableStatusSection({
  id,
  showBorder = false,
  dragging = false,
  dropIndicator = null,
  onPresenceChange,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  children,
}: {
  id: string;
  showBorder?: boolean;
  dragging?: boolean;
  dropIndicator?: DropPosition | null;
  onPresenceChange?: (id: string, present: boolean) => void;
  onDragStart?: (id: string) => void;
  onDragOver?: (id: string, position: DropPosition) => void;
  onDrop?: (id: string, position: DropPosition) => void;
  onDragEnd?: () => void;
  children: ReactNode;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const presentRef = useRef(false);
  const dropPositionRef = useRef<DropPosition>('before');

  useLayoutEffect(() => {
    const element = bodyRef.current;
    if (!element) return;

    const update = () => {
      const present = element.childElementCount > 0;
      if (present !== presentRef.current) {
        presentRef.current = present;
        onPresenceChange?.(id, present);
      }
    };

    update();

    const observer = new MutationObserver(update);
    observer.observe(element, { childList: true });

    return () => observer.disconnect();
  }, [id, onPresenceChange]);

  return (
    <div
      className={cn(
        'relative',
        showBorder && 'border-separator border-b',
        dragging && 'opacity-40',
      )}
      onDragOver={(event) => {
        if (!onDragOver) return;

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        const rect = event.currentTarget.getBoundingClientRect();
        const position: DropPosition =
          event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';

        dropPositionRef.current = position;
        onDragOver(id, position);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop?.(id, dropPositionRef.current);
      }}
    >
      {dropIndicator === 'before' && (
        <div className='bg-accent pointer-events-none absolute inset-x-0 -top-px h-0.5' />
      )}
      {dropIndicator === 'after' && (
        <div className='bg-accent pointer-events-none absolute inset-x-0 -bottom-px h-0.5' />
      )}

      <StatusSectionHandleContext
        value={{
          onDragStart: (event) => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', id);
            onDragStart?.(id);
          },
          onDragEnd: () => onDragEnd?.(),
        }}
      >
        <div ref={bodyRef}>{children}</div>
      </StatusSectionHandleContext>
    </div>
  );
}
