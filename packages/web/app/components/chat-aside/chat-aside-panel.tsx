import {
  ChevronsCollapseUpRight,
  ChevronsExpandUpRight,
  Plus,
  Xmark,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { FitAddon, init, Terminal as GhosttyTerminal } from 'ghostty-web';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { PanelImperativeHandle } from '@aero/ui';
import { Resizable } from '@aero/ui';

import { collapsibleNav } from '@/app/components/chat-aside/chat-aside';
import { TerminalPanel } from '@/app/components/chat-aside/terminal-panel';
import { useGeneralStore } from '@/app/providers/settings/general/general-store';
import { useChatPanelStore } from '@/app/stores/chat-panel-store';
import type { TerminalTab } from '@/app/stores/terminal-store';
import { useTerminalStore } from '@/app/stores/terminal-store';

type TerminalServerMessage =
  | { type: 'ready'; shell: string; cwd: string; cols: number; rows: number }
  | { type: 'output'; data: string }
  | { type: 'exit'; exitCode: number; signal?: number }
  | { type: 'error'; message: string };

function getTerminalWebSocketUrl(shell: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const params = new URLSearchParams({
    shell,
  });

  return `${protocol}//${window.location.host}/api/terminal/ws?${params}`;
}

function sendTerminalMessage(
  socket: WebSocket | null,
  message:
    | { type: 'input'; data: string }
    | { type: 'resize'; cols: number; rows: number },
) {
  if (socket?.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify(message));
}

// ---------------------------------------------------------------------------
// GhosttyTerminalInstance — a single terminal keyed by tab ID
// ---------------------------------------------------------------------------

function GhosttyTerminalInstance({
  tabId,
  isActive,
}: {
  tabId: string;
  isActive: boolean;
}) {
  const shell = useGeneralStore((s) => s.terminalShell);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const terminalRef = useRef<GhosttyTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [status, setStatus] = useState('Starting terminal...');

  // Refit when the tab becomes active (container may have resized while hidden)
  useEffect(() => {
    if (isActive && fitAddonRef.current) {
      fitAddonRef.current.fit();
      terminalRef.current?.focus();
    }
  }, [isActive]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    async function startTerminal() {
      try {
        setStatus('Loading terminal...');
        await init();

        if (disposed || !container) return;

        const terminal = new GhosttyTerminal({
          cursorBlink: true,
          fontFamily:
            '"Cascadia Code", "JetBrains Mono", "SFMono-Regular", Consolas, monospace',
          fontSize: 13,
          scrollback: 5000,
          theme: {
            background: '#101114',
            foreground: '#d7dce2',
            cursor: '#f2cc60',
            selectionBackground: '#334155',
            black: '#15171c',
            red: '#e06c75',
            green: '#98c379',
            yellow: '#e5c07b',
            blue: '#61afef',
            magenta: '#c678dd',
            cyan: '#56b6c2',
            white: '#d7dce2',
            brightBlack: '#6b7280',
            brightRed: '#ff7b86',
            brightGreen: '#b3e194',
            brightYellow: '#ffd98a',
            brightBlue: '#7cc7ff',
            brightMagenta: '#d79cff',
            brightCyan: '#72d8e8',
            brightWhite: '#ffffff',
          },
        });

        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.open(container);
        fitAddon.observeResize();
        fitAddon.fit();
        terminal.focus();

        terminalRef.current = terminal;
        fitAddonRef.current = fitAddon;

        const socket = new WebSocket(getTerminalWebSocketUrl(shell));
        socketRef.current = socket;

        terminal.onData((data) => {
          sendTerminalMessage(socketRef.current, { type: 'input', data });
        });

        terminal.onResize(({ cols, rows }) => {
          sendTerminalMessage(socketRef.current, {
            type: 'resize',
            cols,
            rows,
          });
        });

        socket.addEventListener('open', () => {
          setStatus('Connected');
          fitAddon.fit();
        });

        socket.addEventListener('message', (event) => {
          try {
            const message = JSON.parse(
              String(event.data),
            ) as TerminalServerMessage;

            if (message.type === 'output') {
              terminal.write(message.data);
              return;
            }

            if (message.type === 'ready') {
              setStatus(`${message.shell} - ${message.cwd}`);
              return;
            }

            if (message.type === 'exit') {
              terminal.writeln(
                `\r\n[process exited with code ${message.exitCode}]`,
              );
              setStatus('Exited');
              return;
            }

            terminal.writeln(`\r\n[terminal error] ${message.message}`);
            setStatus('Error');
          } catch {
            terminal.write(String(event.data));
          }
        });

        socket.addEventListener('close', () => {
          if (!disposed) setStatus('Disconnected');
        });

        socket.addEventListener('error', () => {
          setStatus('Connection error');
        });
      } catch (error) {
        setStatus(
          error instanceof Error ? error.message : 'Failed to load terminal',
        );
      }
    }

    startTerminal();

    return () => {
      disposed = true;
      socketRef.current?.close();
      socketRef.current = null;
      terminalRef.current?.dispose();
      terminalRef.current = null;
      fitAddonRef.current?.dispose();
      fitAddonRef.current = null;
    };
  }, [tabId, shell]);

  return (
    <div
      className='flex min-h-0 flex-1 flex-col bg-[#101114]'
      style={{ display: isActive ? 'flex' : 'none' }}
    >
      <div className='border-separator text-muted flex h-7 shrink-0 items-center justify-between border-b px-3 text-[11px]'>
        <span className='truncate'>{status}</span>
      </div>
      <div
        ref={containerRef}
        className='min-h-0 flex-1 overflow-hidden px-2 py-2'
        role='application'
        aria-label='Terminal'
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// TerminalTabBar — tab strip with + and × controls
// ---------------------------------------------------------------------------

function TerminalTabBar({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onAdd,
}: {
  tabs: TerminalTab[];
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className='flex h-8 shrink-0 items-center gap-0.5 overflow-x-auto bg-[#101114] px-1.5'>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;

        return (
          <button
            key={tab.id}
            type='button'
            onClick={() => onSelect(tab.id)}
            className={`group flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] transition ${
              isActive
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:bg-white/5 hover:text-white/70'
            }`}
            aria-selected={isActive}
            role='tab'
          >
            <span className='truncate'>{tab.title}</span>
            {tabs.length > 1 && (
              <span
                role='button'
                tabIndex={0}
                aria-label={`Close ${tab.title}`}
                className='ml-0.5 flex size-3.5 shrink-0 items-center justify-center rounded opacity-0 transition group-hover:opacity-100 hover:bg-white/10'
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    onClose(tab.id);
                  }
                }}
              >
                <Icon data={Xmark} size={10} />
              </span>
            )}
          </button>
        );
      })}

      <button
        type='button'
        onClick={onAdd}
        className='ml-0.5 flex size-5 shrink-0 items-center justify-center rounded text-white/40 transition hover:bg-white/5 hover:text-white/70'
        title='New terminal'
        aria-label='New terminal'
      >
        <Icon data={Plus} size={12} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TerminalContainer — combines the tab bar with terminal instances
// ---------------------------------------------------------------------------

function TerminalContainer() {
  const tabs = useTerminalStore((s) => s.tabs);
  const activeTabId = useTerminalStore((s) => s.activeTabId);
  const addTab = useTerminalStore((s) => s.addTab);
  const removeTab = useTerminalStore((s) => s.removeTab);
  const setActiveTab = useTerminalStore((s) => s.setActiveTab);

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <TerminalTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={setActiveTab}
        onClose={removeTab}
        onAdd={addTab}
      />
      {tabs.map((tab) => (
        <TerminalPanel key={tab.id} />
      ))}
    </div>
  );
}

export function ChatAsidePanel() {
  const isOpen = useChatPanelStore((s) => s.isOpen);
  const activeNavItem = useChatPanelStore((s) => s.activeNavItem);
  const isExpanded = useChatPanelStore((s) => s.isExpanded);
  const storeToggleExpanded = useChatPanelStore((s) => s.toggleExpanded);
  const closePanel = useChatPanelStore((s) => s.closePanel);

  const panelRef = useRef<PanelImperativeHandle | null>(null);
  const lastSizeRef = useRef<number | null>(null);

  const activeNavData = useMemo(
    () => collapsibleNav.find((item) => item.id === activeNavItem),
    [activeNavItem],
  );

  const handleToggleExpanded = () => {
    if (!isExpanded && panelRef.current) {
      // Store current pixel size before expanding
      lastSizeRef.current = panelRef.current.getSize().inPixels;
    }
    storeToggleExpanded();
  };

  useEffect(() => {
    if (!isExpanded && panelRef.current && lastSizeRef.current !== null) {
      const restoredSize = `${lastSizeRef.current}px`;

      // Wait for layout bounds (minSize/maxSize) to commit before resizing
      requestAnimationFrame(() => {
        panelRef.current?.resize(restoredSize);
      });
    }
  }, [isExpanded]);

  if (!isOpen || !activeNavItem) return null;

  return (
    <>
      {!isExpanded && (
        <Resizable.Handle type='line' variant='primary' className='w-[0.6px]' />
      )}
      <Resizable.Panel
        handleRef={panelRef}
        id='aside-panel'
        defaultSize={isExpanded ? '100%' : '320px'}
        minSize={isExpanded ? '100%' : '320px'}
        maxSize={isExpanded ? '100%' : '70%'}
        groupResizeBehavior='preserve-pixel-size'
      >
        <aside className='flex h-full flex-col'>
          <div className='border-separator flex h-12 shrink-0 items-center justify-between border-b px-3'>
            <div className='flex items-center gap-2'>
              <span className='flex size-4 place-items-center'>
                {activeNavData?.icon}
              </span>
              <span className='text-sm font-medium'>
                {activeNavData?.label}
              </span>
            </div>

            <div className='flex items-center gap-1.5'>
              <button
                type='button'
                onClick={handleToggleExpanded}
                className='p-1 opacity-80 transition hover:opacity-100'
                title={isExpanded ? 'Collapse panel' : 'Expand panel'}
                aria-label='Expand panel'
              >
                <Icon
                  data={
                    isExpanded ? ChevronsCollapseUpRight : ChevronsExpandUpRight
                  }
                  size={14}
                />
              </button>

              <button
                type='button'
                onClick={closePanel}
                className='p-1 opacity-80 transition hover:opacity-100'
                title='Close panel'
                aria-label='Close panel'
              >
                <Icon data={Xmark} size={15} />
              </button>
            </div>
          </div>

          {activeNavItem === 'terminal' ? (
            <TerminalContainer />
          ) : (
            <div className='text-muted flex flex-1 items-center justify-center p-6 text-center text-sm'>
              Content body: {activeNavData?.label}
            </div>
          )}
        </aside>
      </Resizable.Panel>
    </>
  );
}
