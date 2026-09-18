'use client';

// dev-console.tsx
//
// A dev-only console panel. Captures console.* output, renders expandable
// values, and provides a REPL with top-level await.
//
// Usage:
//   {import.meta.env.DEV && <DevConsole />}
//
// Toggle with ` (backtick). Only mounts in dev; production trees are
// unaffected because the mount site is guarded.

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { create } from 'zustand';

// ── Store ─────────────────────────────────────────────────────────────

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug' | 'result';

export interface ConsoleEntry {
  id: number;
  level: LogLevel;
  timestamp: number;
  args: unknown[];
}

interface DevConsoleState {
  entries: ConsoleEntry[];
  push: (level: LogLevel, args: unknown[]) => void;
  clear: () => void;
}

const MAX_ENTRIES = 2000;
let nextId = 1;

const useDevConsoleStore = create<DevConsoleState>((set) => ({
  entries: [],
  push: (level, args) =>
    set((s) => {
      const entry: ConsoleEntry = {
        id: nextId++,
        level,
        timestamp: Date.now(),
        args,
      };
      const next =
        s.entries.length >= MAX_ENTRIES
          ? [...s.entries.slice(s.entries.length - MAX_ENTRIES + 1), entry]
          : [...s.entries, entry];
      return { entries: next };
    }),
  clear: () => set({ entries: [] }),
}));

// ── Capture ───────────────────────────────────────────────────────────

let uninstallCapture: (() => void) | null = null;

function installConsoleCapture(): () => void {
  if (uninstallCapture) return uninstallCapture;
  if (typeof window === 'undefined')
    return () => {
      //
    };

  const original = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  const wrap =
    (level: LogLevel, orig: (...a: unknown[]) => void) =>
    (...args: unknown[]) => {
      orig(...args);
      useDevConsoleStore.getState().push(level, args);
    };

  console.log = wrap('log', original.log);
  console.info = wrap('info', original.info);
  console.warn = wrap('warn', original.warn);
  console.error = wrap('error', original.error);
  console.debug = wrap('debug', original.debug);

  uninstallCapture = () => {
    console.log = original.log;
    console.info = original.info;
    console.warn = original.warn;
    console.error = original.error;
    console.debug = original.debug;
    uninstallCapture = null;
  };

  return uninstallCapture;
}

// ── Value rendering ───────────────────────────────────────────────────

const MAX_DEPTH = 4;
const MAX_ITEMS = 100;

function isPrimitive(
  v: unknown,
): v is string | number | boolean | null | undefined | bigint | symbol {
  return (
    v === null ||
    v === undefined ||
    typeof v === 'string' ||
    typeof v === 'number' ||
    typeof v === 'boolean' ||
    typeof v === 'bigint' ||
    typeof v === 'symbol'
  );
}

function primitiveClass(v: unknown): string {
  if (v === null || v === undefined) return 'text-muted';
  if (typeof v === 'string') return 'text-emerald-400';
  if (typeof v === 'number' || typeof v === 'bigint') return 'text-amber-400';
  if (typeof v === 'boolean') return 'text-sky-400';
  return 'text-foreground';
}

function preview(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  if (typeof value === 'bigint') return `${value}n`;
  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'function') return `ƒ ${value.name || 'anonymous'}()`;
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof RegExp) return value.toString();
  if (value instanceof Map) return `Map(${value.size})`;
  if (value instanceof Set) return `Set(${value.size})`;
  if (typeof value === 'object') {
    const ctor = (value as { constructor?: { name?: string } }).constructor
      ?.name;
    return ctor && ctor !== 'Object' ? `${ctor} {…}` : '{…}';
  }
  return String(value);
}

interface ValueProps {
  value: unknown;
  depth?: number;
  path?: readonly object[];
}

const ConsoleValue = memo(function ConsoleValue({
  value,
  depth = 0,
  path = [],
}: ValueProps) {
  if (isPrimitive(value)) {
    return (
      <span className={`${primitiveClass(value)} font-mono`}>
        {preview(value)}
      </span>
    );
  }
  if (typeof value === 'function') {
    return (
      <span className='text-muted font-mono italic'>{preview(value)}</span>
    );
  }
  if (value instanceof Error) {
    return (
      <span className='text-danger font-mono whitespace-pre-wrap'>
        {value.stack ?? `${value.name}: ${value.message}`}
      </span>
    );
  }
  return <ExpandableValue value={value as object} depth={depth} path={path} />;
});

function ExpandableValue({
  value,
  depth,
  path,
}: {
  value: object;
  depth: number;
  path: readonly object[];
}) {
  const isCycle = path.includes(value);
  const [open, setOpen] = useState(depth === 0 && !isCycle);

  const { entries, omitted } = useMemo(() => {
    if (isCycle || depth > MAX_DEPTH) {
      return { entries: [] as [string, unknown][], omitted: 0 };
    }

    let all: [string, unknown][];
    if (Array.isArray(value)) {
      all = value.map((v, i) => [String(i), v]);
    } else if (value instanceof Map) {
      all = Array.from(value.entries()).map(([k, v]) => [String(k), v]);
    } else if (value instanceof Set) {
      all = Array.from(value.values()).map((v, i) => [String(i), v]);
    } else {
      try {
        all = Object.entries(value);
      } catch {
        all = [];
      }
    }

    return {
      entries: all.slice(0, MAX_ITEMS),
      omitted: Math.max(0, all.length - MAX_ITEMS),
    };
  }, [value, depth, isCycle]);

  if (isCycle) {
    return <span className='text-muted font-mono italic'>[Circular]</span>;
  }

  const label = preview(value);

  if (entries.length === 0) {
    return <span className='text-muted font-mono'>{label}</span>;
  }

  return (
    <span className='inline-flex flex-col font-mono align-top'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='text-muted hover:text-foreground inline-flex items-center gap-1 text-left'
      >
        <span className='inline-block w-2 shrink-0 text-[10px] leading-none'>
          {open ? '▾' : '▸'}
        </span>
        <span>{label}</span>
      </button>
      {open && (
        <div className='border-separator mt-0.5 ml-1 border-l pl-3'>
          {entries.map(([k, v]) => (
            <div key={k} className='flex gap-1.5 leading-relaxed'>
              <span className='text-muted shrink-0'>{k}:</span>
              <ConsoleValue
                value={v}
                depth={depth + 1}
                path={[...path, value]}
              />
            </div>
          ))}
          {omitted > 0 && (
            <div className='text-muted italic'>… {omitted} more</div>
          )}
        </div>
      )}
    </span>
  );
}

// ── Entry row ─────────────────────────────────────────────────────────

const LEVEL_STYLE: Record<LogLevel, string> = {
  log: 'text-muted',
  info: 'text-sky-400',
  warn: 'text-amber-400',
  error: 'text-red-400',
  debug: 'text-zinc-500',
  result: 'text-emerald-400',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

const EntryRow = memo(function EntryRow({ entry }: { entry: ConsoleEntry }) {
  const isResult = entry.level === 'result';

  return (
    <div className='border-separator/40 flex gap-2 border-b px-3 py-1 text-xs leading-relaxed'>
      <span className='text-muted shrink-0 font-mono tabular-nums'>
        {formatTime(entry.timestamp)}
      </span>
      <span
        className={`w-10 shrink-0 font-mono uppercase ${LEVEL_STYLE[entry.level]}`}
      >
        {isResult ? '›' : entry.level}
      </span>
      <div className='flex min-w-0 flex-1 flex-wrap items-start gap-x-1.5 gap-y-0.5'>
        {isResult ? (
          <>
            <span className='text-muted font-mono'>
              {String(entry.args[0] ?? '')}
            </span>
            <span className='text-muted font-mono'>=</span>
            <ConsoleValue value={entry.args[1]} />
          </>
        ) : (
          entry.args.map((arg, i) => <ConsoleValue key={i} value={arg} />)
        )}
      </div>
    </div>
  );
});

// ── REPL ──────────────────────────────────────────────────────────────

const AsyncFunction = Object.getPrototypeOf(async function () {
  /* noop */
}).constructor as new (
  ...args: string[]
) => (...args: unknown[]) => Promise<unknown>;

async function evaluate(code: string): Promise<unknown> {
  try {
    return await new AsyncFunction(`return (${code})`)();
  } catch (err) {
    if (err instanceof SyntaxError) {
      // Statement form: `let x = 1; x + 1`
      return await new AsyncFunction(code)();
    }
    throw err;
  }
}

function ReplInput() {
  const [value, setValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(async () => {
    const code = value.trim();
    if (!code) return;

    setHistory((h) => [...h, code]);
    setHistoryIndex(-1);
    setValue('');

    const { push } = useDevConsoleStore.getState();
    try {
      const result = await evaluate(code);
      push('result', [code, result]);
    } catch (err) {
      push('result', [code, err]);
    }
  }, [value]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void submit();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (history.length === 0) return;
        const next =
          historyIndex === -1
            ? history.length - 1
            : Math.max(0, historyIndex - 1);
        setHistoryIndex(next);
        setValue(history[next]);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex === -1) return;
        const next = historyIndex + 1;
        if (next >= history.length) {
          setHistoryIndex(-1);
          setValue('');
        } else {
          setHistoryIndex(next);
          setValue(history[next]);
        }
      }
    },
    [submit, history, historyIndex],
  );

  return (
    <div className='border-separator flex items-center gap-2 border-t px-3 py-1.5'>
      <span className='text-accent shrink-0 font-mono text-xs'>›</span>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        autoComplete='off'
        placeholder='Evaluate JavaScript… (↑ for history)'
        className='text-foreground placeholder:text-muted flex-1 bg-transparent font-mono text-xs outline-none'
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

export function DevConsole() {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<Set<LogLevel>>(
    () => new Set(['log', 'info', 'warn', 'error', 'result']),
  );
  const [query, setQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);

  const entries = useDevConsoleStore((s) => s.entries);
  const clear = useDevConsoleStore((s) => s.clear);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Install capture once on mount.
  useEffect(() => installConsoleCapture(), []);

  // Backtick toggles; Escape closes.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      const isEditable =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (e.key === '`' && !isEditable) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape' && open && !isEditable) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Auto-scroll on new entries, unless user has scrolled up.
  useEffect(() => {
    if (!open || !autoScroll) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [entries, open, autoScroll]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
    setAutoScroll(atBottom);
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (!filters.has(e.level)) return false;
      if (!q) return true;
      return e.args.some((a) => {
        try {
          return String(a).toLowerCase().includes(q);
        } catch {
          return false;
        }
      });
    });
  }, [entries, filters, query]);

  const toggleFilter = useCallback((level: LogLevel) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }, []);

  if (!open) {
    return (
      <button
        type='button'
        onClick={() => setOpen(true)}
        title='Open dev console (`)'
        className='bg-surface border-separator text-muted hover:text-foreground fixed right-4 bottom-4 z-[100] flex h-9 items-center gap-2 rounded-full border px-3 text-xs shadow-lg'
      >
        <span className='font-mono'>›_</span>
        {entries.length > 0 && (
          <span className='bg-accent text-accent-foreground rounded-full px-1.5 text-[10px]'>
            {entries.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className='bg-background border-separator fixed inset-x-0 bottom-0 z-[100] flex h-[40vh] min-h-[240px] flex-col border-t shadow-2xl'>
      {/* Header */}
      <div className='border-separator flex shrink-0 items-center gap-2 border-b px-3 py-1.5'>
        <span className='text-foreground text-xs font-medium'>Console</span>
        <span className='text-muted text-xs'>({visible.length})</span>

        <div className='ml-2 flex items-center gap-0.5'>
          {(['log', 'info', 'warn', 'error', 'debug'] as const).map((level) => (
            <button
              key={level}
              type='button'
              onClick={() => toggleFilter(level)}
              className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase transition ${
                filters.has(level)
                  ? `${LEVEL_STYLE[level]} bg-surface`
                  : 'text-muted/40 hover:text-muted'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Filter…'
          className='border-separator bg-surface text-foreground placeholder:text-muted ml-auto h-6 w-40 rounded border px-2 font-mono text-[11px] outline-none'
        />

        <button
          type='button'
          onClick={clear}
          title='Clear'
          className='text-muted hover:text-foreground rounded px-1.5 py-0.5 text-xs'
        >
          clear
        </button>
        <button
          type='button'
          onClick={() => setOpen(false)}
          title='Close (Esc)'
          className='text-muted hover:text-foreground rounded px-1.5 py-0.5 text-xs'
        >
          ✕
        </button>
      </div>

      {/* Entries */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className='scrollbar-thin min-h-0 flex-1 overflow-y-auto'
      >
        {visible.length === 0 ? (
          <div className='text-muted flex h-full items-center justify-center text-xs'>
            {entries.length === 0 ? 'No output yet.' : 'No matches.'}
          </div>
        ) : (
          visible.map((entry) => <EntryRow key={entry.id} entry={entry} />)
        )}
      </div>

      {/* REPL */}
      <ReplInput />
    </div>
  );
}
