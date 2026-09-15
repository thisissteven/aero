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

import { terminalControllers } from '@/app/components/chat-aside/terminal/terminal-controllers';
import { useTheme } from '@/app/providers';

import { useTerminalStore } from './terminal-store';
import { resolveGhosttyTheme } from './terminal-theme';

export interface TerminalInstanceHandle {
  getSelection: () => string;
  reconnect: () => void;
}

interface TerminalInstanceProps {
  sessionId: string;
  active: boolean;
  cwd?: string;
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
>(function TerminalInstance({ sessionId, active, cwd }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<GhosttyTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connectRef = useRef<(isReset?: boolean) => void>(() => {
    //
  });

  const historyRef = useRef('');
  const pendingCommandRef = useRef<string | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [rendererGeneration, setRendererGeneration] = useState(0);

  const activeRef = useRef(active);
  activeRef.current = active;

  const { resolvedTheme, colorTheme } = useTheme();

  const setSessionStatus = useTerminalStore(
    (state) => state.actions.setSessionStatus,
  );

  const setCommandRunning = useTerminalStore(
    (state) => state.actions.setCommandRunning,
  );

  const stopCommand = useTerminalStore((state) => state.actions.stopCommand);

  const consumeCommandRequest = useTerminalStore(
    (state) => state.actions.consumeCommandRequest,
  );

  const commandRequestId = useTerminalStore(
    (state) =>
      state.sessions.find((session) => session.id === sessionId)
        ?.commandRequestId ?? 0,
  );

  const commandConsumedRequestId = useTerminalStore(
    (state) =>
      state.sessions.find((session) => session.id === sessionId)
        ?.commandConsumedRequestId ?? 0,
  );

  const requestedCommand = useTerminalStore(
    (state) =>
      state.sessions.find((session) => session.id === sessionId)?.command ??
      null,
  );

  /**
   * Queue a new command request locally, but do not mark it as consumed yet.
   *
   * It is only consumed after the command has actually been written to the
   * WebSocket/PTY. This means a request cannot be lost if this component
   * mounts before the WebSocket is ready.
   */
  useEffect(() => {
    if (commandRequestId <= commandConsumedRequestId) {
      return;
    }

    if (!requestedCommand) {
      return;
    }

    pendingCommandRef.current = requestedCommand;
  }, [commandRequestId, commandConsumedRequestId, requestedCommand]);

  useEffect(() => {
    setIsReady(false);
    setRendererGeneration((generation) => generation + 1);
  }, [resolvedTheme, colorTheme, sessionId]);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const clearCommandTimer = useCallback(() => {
    if (commandTimerRef.current) {
      clearTimeout(commandTimerRef.current);
      commandTimerRef.current = null;
    }
  }, []);

  const sendCommand = useCallback(
    (command: string): boolean => {
      const ws = wsRef.current;

      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return false;
      }

      clearCommandTimer();

      ws.send(`${command}\r`);

      setCommandRunning(sessionId, true);

      return true;
    },
    [clearCommandTimer, sessionId, setCommandRunning],
  );

  const flushPendingCommand = useCallback(() => {
    const command = pendingCommandRef.current;

    if (!command) {
      return;
    }

    if (!sendCommand(command)) {
      return;
    }

    pendingCommandRef.current = null;

    const currentSession = useTerminalStore
      .getState()
      .sessions.find((session) => session.id === sessionId);

    if (currentSession) {
      consumeCommandRequest(sessionId, currentSession.commandRequestId);
    }
  }, [sendCommand, sessionId, consumeCommandRequest]);

  useEffect(() => {
    const controller = {
      runCommand: (command: string) => {
        pendingCommandRef.current = command;

        if (!sendCommand(command)) {
          return false;
        }

        pendingCommandRef.current = null;

        const currentSession = useTerminalStore
          .getState()
          .sessions.find((session) => session.id === sessionId);

        if (currentSession) {
          consumeCommandRequest(sessionId, currentSession.commandRequestId);
        }

        return true;
      },

      stopCommand: () => {
        const ws = wsRef.current;

        if (!ws || ws.readyState !== WebSocket.OPEN) {
          return false;
        }

        ws.send('\x03');

        setTimeout(() => {
          ws.send('\x03');
        }, 100);

        pendingCommandRef.current = null;
        clearCommandTimer();

        stopCommand(sessionId);

        return true;
      },
    };

    terminalControllers.set(sessionId, controller);

    return () => {
      if (terminalControllers.get(sessionId) === controller) {
        terminalControllers.delete(sessionId);
      }
    };
  }, [
    sessionId,
    sendCommand,
    clearCommandTimer,
    stopCommand,
    consumeCommandRequest,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      getSelection: () => terminalRef.current?.getSelection?.() ?? '',

      reconnect: () => {
        setIsReady(false);

        clearRetryTimer();
        clearCommandTimer();

        historyRef.current = '';

        const terminal = terminalRef.current;

        if (terminal) {
          terminal.reset?.();
          terminal.clear?.();
        }

        const oldWs = wsRef.current;
        wsRef.current = null;

        oldWs?.close();

        connectRef.current(true);
      },
    }),
    [clearRetryTimer, clearCommandTimer],
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
    if (!active) {
      return;
    }

    requestAnimationFrame(() => {
      fit();
      terminalRef.current?.focus?.();
    });
  }, [active, fit]);

  const connect = useCallback(
    async (currentTerminal: GhosttyTerminal, isReset = false) => {
      if (!currentTerminal) {
        return;
      }

      clearRetryTimer();
      clearCommandTimer();

      setSessionStatus(sessionId, 'connecting');

      try {
        const res = await fetch('/api/terminal/token', {
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error(`token request failed: ${res.status}`);
        }

        const { token } = await res.json();

        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';

        const params = new URLSearchParams({
          sessionId,
          cols: String(currentTerminal.cols || 80),
          rows: String(currentTerminal.rows || 24),
          token,
          reset: isReset ? 'true' : 'false',
        });

        if (cwd) {
          params.set('cwd', cwd);
        }

        const ws = new WebSocket(
          `${protocol}//${location.host}/ws/terminal?${params}`,
        );

        wsRef.current = ws;

        ws.onopen = () => {
          if (wsRef.current !== ws) {
            ws.close();
            return;
          }

          setSessionStatus(sessionId, 'connected');

          commandTimerRef.current = setTimeout(() => {
            commandTimerRef.current = null;

            if (wsRef.current !== ws) {
              return;
            }

            flushPendingCommand();
          }, 50);

          setTimeout(() => {
            if (wsRef.current === ws) {
              setIsReady(true);
            }
          }, 150);
        };

        ws.onmessage = (event) => {
          if (wsRef.current !== ws) {
            return;
          }

          const data = String(event.data);

          historyRef.current += data;
          terminalRef.current?.write(data);

          setIsReady(true);
        };

        ws.onclose = () => {
          if (wsRef.current !== ws) {
            return;
          }

          wsRef.current = null;
          clearCommandTimer();

          setSessionStatus(sessionId, 'disconnected');

          retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null;

            if (terminalRef.current) {
              void connect(terminalRef.current, false);
            }
          }, 2000);
        };

        ws.onerror = () => {
          if (wsRef.current === ws) {
            ws.close();
          }
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
    [
      clearRetryTimer,
      clearCommandTimer,
      cwd,
      flushPendingCommand,
      sessionId,
      setSessionStatus,
    ],
  );

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let disposed = false;
    let terminal: GhosttyTerminal | null = null;
    let fitAddon: FitAddon | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const boot = async () => {
      try {
        const ghostty = await loadGhostty();

        if (disposed) {
          return;
        }

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

        const dataDisposable = terminal.onData((data: string) => {
          const ws = wsRef.current;

          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        });

        const resizeDisposable = terminal.onResize(
          ({ cols, rows }: { cols: number; rows: number }) => {
            const ws = wsRef.current;

            if (cols > 0 && rows > 0 && ws?.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: 'resize',
                  cols,
                  rows,
                }),
              );
            }
          },
        );

        resizeObserver = new ResizeObserver(() => {
          if (resizeTimeout) {
            clearTimeout(resizeTimeout);
          }

          resizeTimeout = setTimeout(() => {
            if (!disposed && activeRef.current) {
              fit();
            }
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
          if (!disposed && activeRef.current) {
            fit();
          }
        });

        return () => {
          dataDisposable?.dispose?.();
          resizeDisposable?.dispose?.();
        };
      } catch (error) {
        if (disposed) {
          return;
        }

        console.error('[Terminal] Failed to initialize Ghostty', error);

        setSessionStatus(sessionId, 'disconnected');
      }
    };

    let cleanupListeners: (() => void) | undefined;

    void boot().then((cleanup) => {
      cleanupListeners = cleanup;

      if (disposed) {
        cleanupListeners?.();
      }
    });

    return () => {
      disposed = true;

      cleanupListeners?.();

      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }

      resizeObserver?.disconnect();

      terminal?.dispose?.();

      if (terminalRef.current === terminal) {
        terminalRef.current = null;
      }

      if (fitAddonRef.current === fitAddon) {
        fitAddonRef.current = null;
      }
    };
  }, [sessionId, rendererGeneration, fit, connect, setSessionStatus]);

  useEffect(() => {
    return () => {
      clearRetryTimer();
      clearCommandTimer();

      const ws = wsRef.current;
      wsRef.current = null;

      ws?.close();
    };
  }, [clearRetryTimer, clearCommandTimer]);

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
