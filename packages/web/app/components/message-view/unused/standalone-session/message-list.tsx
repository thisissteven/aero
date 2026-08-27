import type {
  AeroMessage,
  AeroPart,
  AeroSessionStatus,
} from '@/server/services/harness/types';

import { formatElapsed, useElapsedTime } from './use-elapsed-time';

interface MessageListProps {
  messages: AeroMessage[];
  status: AeroSessionStatus;
  lastUserMessageAt: number | null;
}

export function MessageList({
  messages,
  status,
  lastUserMessageAt,
}: MessageListProps) {
  const isActive = status.type !== 'idle';

  return (
    <div className='mx-auto flex max-w-3xl flex-col gap-4'>
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {isActive && (
        <ThinkingIndicator startedAt={lastUserMessageAt} status={status} />
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: AeroMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={
          isUser
            ? 'bg-primary text-primary-foreground max-w-[80%] rounded-2xl px-4 py-2'
            : 'bg-content2 max-w-[80%] rounded-2xl px-4 py-2'
        }
      >
        {message.parts.map((part) => (
          <PartView key={part.id} part={part} />
        ))}
      </div>
    </div>
  );
}

function PartView({ part }: { part: AeroPart }) {
  switch (part.type) {
    case 'text':
      return part.text ? (
        <p className='text-sm whitespace-pre-wrap'>{part.text}</p>
      ) : null;

    case 'reasoning':
      return part.text ? (
        <p className='text-default-500 text-xs whitespace-pre-wrap italic'>
          {part.text}
        </p>
      ) : null;

    case 'tool':
      return <ToolPartView part={part} />;

    case 'file':
      return (
        <a
          href={part.url}
          target='_blank'
          rel='noreferrer'
          className='text-xs underline'
        >
          {part.filename ?? part.url}
        </a>
      );

    default:
      return null;
  }
}

function ToolPartView({ part }: { part: Extract<AeroPart, { type: 'tool' }> }) {
  return (
    <div className='border-divider bg-content1 my-1 rounded-lg border px-3 py-2 text-xs'>
      <div className='flex items-center gap-2'>
        <span className='font-medium'>{part.toolName}</span>

        <span className='text-default-400 capitalize'>{part.status}</span>

        {part.duration != null && (
          <span className='text-default-400'>
            · {formatElapsed(part.duration)}
          </span>
        )}
      </div>

      {part.output && (
        <pre className='text-default-500 mt-1 max-h-32 overflow-auto whitespace-pre-wrap'>
          {part.output}
        </pre>
      )}

      {part.error && <p className='text-danger mt-1'>{part.error}</p>}
    </div>
  );
}

function ThinkingIndicator({
  startedAt,
  status,
}: {
  startedAt: number | null;
  status: AeroSessionStatus;
}) {
  const elapsed = useElapsedTime(startedAt, true);

  const label =
    status.type === 'retry'
      ? `Retrying (attempt ${status.attempt})…`
      : 'Thinking…';

  return (
    <div className='text-default-500 flex items-center gap-2 text-xs'>
      <span className='bg-default-400 h-1.5 w-1.5 animate-pulse rounded-full' />
      <span>{label}</span>

      {startedAt && <span>· {formatElapsed(elapsed)}</span>}
    </div>
  );
}
