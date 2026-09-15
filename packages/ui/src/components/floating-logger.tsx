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

// ---- Probes run inside the page, no devtools needed ----

function probeSpans(): string {
  const segments = document.querySelectorAll('.stream-reveal__segment');
  if (segments.length === 0) {
    return 'span count: 0';
  }

  const sample = segments[segments.length - 1] as HTMLElement;
  const cs = getComputedStyle(sample);
  const rect = sample.getBoundingClientRect();

  return [
    `span count: ${segments.length}`,
    `transition: ${cs.transition || '(none)'}`,
    `opacity: ${cs.opacity}`,
    `transform: ${cs.transform}`,
    `rect: ${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`,
  ].join(' | ');
}

function probeStartingStyle(): string {
  // @starting-style support check
  const supportsStartingStyle =
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    (CSS.supports('@starting-style', 'opacity: 0') ||
      // some engines don't expose the at-rule via supports; fall back to
      // checking whether any parsed stylesheet mentions it
      Array.from(document.styleSheets).some((sheet) => {
        try {
          return Array.from(sheet.cssRules).some((rule) =>
            rule.cssText.includes('@starting-style'),
          );
        } catch {
          return false;
        }
      }));

  return `@starting-style supported/used: ${supportsStartingStyle}`;
}

function probeMarkdown(): string {
  const containers = document.querySelectorAll(
    '.markdown, [data-slot="markdown"]',
  );
  if (containers.length === 0) return 'no .markdown containers';

  const last = containers[containers.length - 1] as HTMLElement;
  const blocks = last.querySelectorAll('[data-slot="markdown-block"]');
  const segments = last.querySelectorAll('.stream-reveal__segment');

  return `containers: ${containers.length} | last has ${blocks.length} blocks, ${segments.length} spans`;
}

function probeClassPresence(): string {
  // Check whether our stylesheet actually shipped the class
  let found = false;
  let rule = '';
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const r of Array.from(sheet.cssRules)) {
        const text = (r as CSSRule).cssText || '';
        if (text.includes('.stream-reveal__segment')) {
          found = true;
          rule = text.slice(0, 200);
          break;
        }
      }
    } catch {
      // CORS-restricted sheet, skip
    }
    if (found) break;
  }
  return found
    ? `CSS rule found: ${rule}`
    : 'CSS rule NOT found in stylesheets';
}

export const logger = {
  log: (...args: unknown[]) => push('log', args),
  info: (...args: unknown[]) => push('info', args),
  warn: (...args: unknown[]) => push('warn', args),
  error: (...args: unknown[]) => push('error', args),
  probe: {
    spans: () => push('probe', [probeSpans()]),
    startingStyle: () => push('probe', [probeStartingStyle()]),
    markdown: () => push('probe', [probeMarkdown()]),
    cssRule: () => push('probe', [probeClassPresence()]),
    all: () => {
      push('probe', ['--- probe start ---']);
      push('probe', [probeMarkdown()]);
      push('probe', [probeSpans()]);
      push('probe', [probeStartingStyle()]);
      push('probe', [probeClassPresence()]);
      push('probe', ['--- probe end ---']);
    },
  },
  clear: () => {
    entries = [];
    emit();
  },
};

export function FloatingLogger() {
  const [open, setOpen] = useState(true);
  const [snapshot, setSnapshot] = useState<LogEntry[]>(entries);
  const [filter, setFilter] = useState('');
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
        <button
          type='button'
          onClick={() => logger.probe.all()}
          style={btnStyle}
        >
          probe
        </button>
        <button
          type='button'
          onClick={() => logger.probe.spans()}
          style={btnStyle}
        >
          spans
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
