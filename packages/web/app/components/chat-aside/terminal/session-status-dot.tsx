import { useSessionStatus } from './terminal-store';

const STATUS_CLASSES: Record<string, string> = {
  connected: 'bg-success',
  connecting: 'animate-pulse bg-warning',
  disconnected: 'bg-danger',
};

export function SessionStatusDot({ sessionId }: { sessionId: string }) {
  const status = useSessionStatus(sessionId);
  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${STATUS_CLASSES[status]}`}
    />
  );
}
