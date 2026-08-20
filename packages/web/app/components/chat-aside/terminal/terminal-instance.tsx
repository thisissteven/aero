// app/features/terminal/terminal-instance.tsx

import type {
  FitAddon,
  Ghostty,
  Terminal as GhosttyTerminal,
} from 'ghostty-web';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { useTheme } from '@/app/providers';

import { useTerminalActions } from './terminal-store';
import { resolveGhosttyTheme } from './terminal-theme';

export interface TerminalInstanceHandle {
  getSelection: () => string;
  reconnect: () => void;
}

interface TerminalInstanceProps {
  sessionId: string;
  active: boolean;
}

let ghosttyPromise: Promise<Ghostty> | null = null;

function loadGhostty(): Promise<Ghostty> {
  if (!ghosttyPromise) {
    ghosttyPromise = import('ghostty-web').then(({ Ghostty }) =>
      Ghostty.load(),
    );
  }

  return ghosttyPromise;
}

export const TerminalInstance = forwardRef<
  TerminalInstanceHandle,
  TerminalInstanceProps
>(function TerminalInstance({ sessionId, active }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<GhosttyTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectRef = useRef<(isReset?: boolean) => void>(() => {});

  const historyRef = useRef<string>('');

  // Visibility mask state to hide terminal until frame 1 is ready
  const [isReady, setIsReady] = useState(false);

  const activeRef = useRef(active);
  activeRef.current = active;

  const { resolvedTheme, colorTheme } = useTheme();
  const { setSessionStatus } = useTerminalActions();

  const [rendererGeneration, setRendererGeneration] = useState(0);

  useEffect(() => {
    setIsReady(false);
    setRendererGeneration((gen) => gen + 1);
  }, [resolvedTheme, colorTheme, sessionId]);

  useImperativeHandle(
    ref,
    () => ({
      getSelection: () => terminalRef.current?.getSelection?.() ?? '',

      reconnect: () => {
        setIsReady(false);
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }

        historyRef.current = '';

        const terminal = terminalRef.current;
        if (terminal) {
          terminal.reset?.();
          terminal.clear?.();
        }

        const old = wsRef.current;
        wsRef.current = null;
        old?.close();

        connectRef.current(true);
      },
    }),
    [],
  );

  const fit = useCallback(() => {
    const container = containerRef.current;
    const terminal = terminalRef.current;

    if (!container || !terminal || !fitAddonRef.current || !activeRef.current) {
      return;
    }

    const bounds = container.getBoundingClientRect();
    if (bounds.width < 24 || bounds.height < 24) {
      return;
    }

    try {
      fitAddonRef.current.fit();
    } catch {
      /* ignore if hidden or detached */
    }
  }, []);

  useEffect(() => {
    if (active) {
      requestAnimationFrame(() => {
        fit();
        terminalRef.current?.focus?.();
      });
    }
  }, [active, fit]);

  const connect = useCallback(
    async (currentTerminal: GhosttyTerminal, isReset = false) => {
      if (!currentTerminal) return;

      setSessionStatus(sessionId, 'connecting');

      try {
        const res = await fetch('/api/terminal/token', { cache: 'no-store' });
        if (!res.ok) throw new Error(`token request failed: ${res.status}`);

        const { token } = await res.json();

        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const params = new URLSearchParams({
          sessionId,
          cols: String(currentTerminal.cols || 80),
          rows: String(currentTerminal.rows || 24),
          token,
          reset: isReset ? 'true' : 'false',
        });

        const ws = new WebSocket(
          `${protocol}//${location.host}/ws/terminal?${params}`,
        );

        wsRef.current = ws;

        ws.onopen = () => {
          setSessionStatus(sessionId, 'connected');
          // Fallback timer: reveal terminal after 150ms even if shell produces no output
          setTimeout(() => setIsReady(true), 150);
        };

        ws.onmessage = (event) => {
          const data = String(event.data);
          historyRef.current += data;
          terminalRef.current?.write(data);
          // Reveal terminal instantly as soon as first content arrives
          setIsReady(true);
        };

        ws.onclose = () => {
          if (wsRef.current !== ws) return;
          wsRef.current = null;
          setSessionStatus(sessionId, 'disconnected');

          retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null;
            if (terminalRef.current) {
              void connect(terminalRef.current, false);
            }
          }, 2000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (error) {
        console.error('[Terminal] Connection failed', error);
        setSessionStatus(sessionId, 'disconnected');

        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          if (terminalRef.current) {
            void connect(terminalRef.current, false);
          }
        }, 2000);
      }
    },
    [sessionId, setSessionStatus],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let terminal: GhosttyTerminal | null = null;
    let fitAddon: FitAddon | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const boot = async () => {
      try {
        const ghostty = await loadGhostty();
        if (disposed) return;

        const theme = resolveGhosttyTheme(container);

        const ghosttyWeb = await import('ghostty-web');
        terminal = new ghosttyWeb.Terminal({
          cols: 80,
          rows: 24,
          fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
          fontSize: 14,
          cursorBlink: true,
          cursorStyle: 'bar',
          allowTransparency: false,
          scrollback: 10_000,
          theme: {
            background: theme.background,
            foreground: theme.foreground,
            cursor: theme.cursor,
            cursorAccent: theme.cursorAccent,
            selectionBackground: theme.selectionBackground,
            selectionForeground: theme.selectionForeground,
            black: theme.black,
            red: theme.red,
            green: theme.green,
            yellow: theme.yellow,
            blue: theme.blue,
            magenta: theme.magenta,
            cyan: theme.cyan,
            white: theme.white,
            brightBlack: theme.brightBlack,
            brightRed: theme.brightRed,
            brightGreen: theme.brightGreen,
            brightYellow: theme.brightYellow,
            brightBlue: theme.brightBlue,
            brightMagenta: theme.brightMagenta,
            brightCyan: theme.brightCyan,
            brightWhite: theme.brightWhite,
          },
          ghostty,
        });

        if (disposed) {
          terminal.dispose?.();
          return;
        }

        fitAddon = new ghosttyWeb.FitAddon();
        terminal.loadAddon(fitAddon);

        terminalRef.current = terminal;
        fitAddonRef.current = fitAddon;

        await terminal.open(container);

        if (disposed) {
          terminal.dispose?.();
          return;
        }

        fit();

        if (historyRef.current) {
          terminal.write(historyRef.current);
          setIsReady(true);
        }

        terminal.onData((data: string) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(data);
          }
        });

        terminal.onResize(({ cols, rows }: { cols: number; rows: number }) => {
          if (
            cols > 0 &&
            rows > 0 &&
            wsRef.current?.readyState === WebSocket.OPEN
          ) {
            wsRef.current.send(
              JSON.stringify({
                type: 'resize',
                cols,
                rows,
              }),
            );
          }
        });

        resizeObserver = new ResizeObserver(() => {
          if (resizeTimeout) clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(() => {
            if (!disposed && activeRef.current) fit();
          }, 80);
        });

        resizeObserver.observe(container);

        connectRef.current = (isReset = false) => {
          void connect(terminal!, isReset);
        };

        if (
          !wsRef.current ||
          wsRef.current.readyState === WebSocket.CLOSED ||
          wsRef.current.readyState === WebSocket.CLOSING
        ) {
          void connect(terminal, false);
        }

        requestAnimationFrame(() => {
          if (!disposed && activeRef.current) fit();
        });
      } catch (error) {
        if (disposed) return;
        console.error('[Terminal] Failed to initialize Ghostty', error);
        setSessionStatus(sessionId, 'disconnected');
      }
    };

    void boot();

    return () => {
      disposed = true;

      if (resizeTimeout) clearTimeout(resizeTimeout);

      resizeObserver?.disconnect();

      terminal?.dispose?.();

      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId, rendererGeneration, fit, connect, setSessionStatus]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [sessionId]);

  const theme = resolveGhosttyTheme(containerRef.current);

  return (
    <div
      ref={containerRef}
      className='absolute inset-0 h-full w-full overflow-hidden p-2 transition-opacity duration-100'
      style={{
        backgroundColor: theme.background,
        visibility: active ? 'visible' : 'hidden',
        pointerEvents: active && isReady ? 'auto' : 'none',
        opacity: active && isReady ? 1 : 0,
      }}
    />
  );
});
