// floating-logger.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

export type LogEntry = {
  id: number;
  time: number;
  level: 'log' | 'warn' | 'error' | 'info' | 'probe';
  message: string;
};

type Listener = (entries: LogEntry[]) => void;

const MAX_ENTRIES = 300;

let entries: LogEntry[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(entries);
}

function push(level: LogEntry['level'], args: unknown[]) {
  const entry: LogEntry = {
    id: nextId++,
    time: performance.now(),
    level,
    message: args
      .map((a) => {
        if (typeof a === 'string') return a;
        if (a instanceof Error) return `${a.name}: ${a.message}`;
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      })
      .join(' '),
  };
  entries =
    entries.length >= MAX_ENTRIES
      ? [...entries.slice(-MAX_ENTRIES + 1), entry]
      : [...entries, entry];
  emit();
}

export const logger = {
  log: (...args: unknown[]) => push('log', args),
  info: (...args: unknown[]) => push('info', args),
  warn: (...args: unknown[]) => push('warn', args),
  error: (...args: unknown[]) => push('error', args),
  clear: () => {
    entries = [];
    emit();
  },
};

export function FloatingLogger() {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<LogEntry[]>(entries);
  const [filter, setFilter] = useState('');
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);

  useEffect(() => {
    const listener: Listener = (next) => setSnapshot(next);
    listeners.add(listener);
    setSnapshot(entries);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!pinnedRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [snapshot]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedRef.current = distance < 30;
  };

  const filtered = filter
    ? snapshot.filter((e) =>
        e.message.toLowerCase().includes(filter.toLowerCase()),
      )
    : snapshot;

  const handleCopy = async () => {
    if (filtered.length === 0) return;
    const logText = filtered
      .map(
        (e) =>
          `[${e.time.toFixed(0)}ms] [${e.level.toUpperCase()}] ${e.message}`,
      )
      .join('\n');

    try {
      await navigator.clipboard.writeText(logText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy logs to clipboard:', err);
    }
  };

  if (!open) {
    return (
      <button
        type='button'
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 99999,
          padding: '6px 10px',
          borderRadius: 6,
          border: '1px solid #444',
          background: '#111',
          color: '#eee',
          fontSize: 12,
          cursor: 'pointer',
          fontFamily: 'monospace',
        }}
      >
        logs ({snapshot.length})
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 99999,
        width: 480,
        maxHeight: 460,
        display: 'flex',
        flexDirection: 'column',
        background: '#0b0b0b',
        color: '#e5e5e5',
        border: '1px solid #333',
        borderRadius: 8,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: 11,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 8px',
          borderBottom: '1px solid #222',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontWeight: 600 }}>logs</span>
        <span style={{ color: '#888' }}>{filtered.length}</span>
        <input
          placeholder='filter…'
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            flex: 1,
            minWidth: 80,
            marginLeft: 8,
            background: '#161616',
            color: '#eee',
            border: '1px solid #2a2a2a',
            borderRadius: 4,
            padding: '2px 6px',
            fontSize: 11,
            fontFamily: 'inherit',
          }}
        />
        <button type='button' onClick={handleCopy} style={btnStyle}>
          {copied ? 'copied!' : 'copy'}
        </button>
        <button type='button' onClick={() => logger.clear()} style={btnStyle}>
          clear
        </button>
        <button type='button' onClick={() => setOpen(false)} style={btnStyle}>
          hide
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{
          overflowY: 'auto',
          padding: '4px 8px',
          lineHeight: 1.4,
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ color: '#555', padding: 6 }}>no logs yet</div>
        ) : (
          filtered.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                gap: 6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color:
                  entry.level === 'error'
                    ? '#f88'
                    : entry.level === 'warn'
                      ? '#fc8'
                      : entry.level === 'probe'
                        ? '#8cf'
                        : '#ccc',
              }}
            >
              <span style={{ color: '#555', flexShrink: 0 }}>
                {entry.time.toFixed(0)}ms
              </span>
              <span>{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: '#161616',
  color: '#ccc',
  border: '1px solid #2a2a2a',
  borderRadius: 4,
  padding: '2px 6px',
  fontSize: 11,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
