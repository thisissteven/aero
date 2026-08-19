/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';

type Status = 'connecting' | 'connected' | 'disconnected';

export function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>('connecting');

  useEffect(() => {
    let ws: WebSocket | null = null;
    let disposed = false;
    let term: any;
    let fitAddon: any;

    async function boot() {
      const { init, Terminal, FitAddon } = await import('ghostty-web');
      await init();

      term = new Terminal({
        cols: 80,
        rows: 24,
        fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
        fontSize: 14,
      });
      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      if (containerRef.current) {
        await term.open(containerRef.current);
        fitAddon.fit();
        fitAddon.observeResize();
      }

      term.onData((data: string) => {
        if (ws?.readyState === WebSocket.OPEN) ws.send(data);
      });
      term.onResize(({ cols, rows }: { cols: number; rows: number }) => {
        if (ws?.readyState === WebSocket.OPEN)
          ws.send(JSON.stringify({ type: 'resize', cols, rows }));
      });

      connect();
    }

    async function connect() {
      if (disposed) return;
      setStatus('connecting');
      try {
        const res = await fetch('/api/terminal/token', { cache: 'no-store' });
        if (!res.ok) throw new Error(`token request failed: ${res.status}`);
        const { token } = await res.json();

        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const params = new URLSearchParams({
          cols: String(term.cols),
          rows: String(term.rows),
          token,
        });
        ws = new WebSocket(
          `${protocol}//${location.host}/ws/terminal?${params}`,
        );

        ws.onopen = () => setStatus('connected');
        ws.onmessage = (event) => term.write(event.data);
        ws.onclose = () => {
          setStatus('disconnected');
          if (!disposed) setTimeout(connect, 2000);
        };
        ws.onerror = () => ws?.close();
      } catch (err) {
        console.error('Terminal connection failed', err);
        setStatus('disconnected');
        if (!disposed) setTimeout(connect, 2000);
      }
    }

    boot();

    return () => {
      disposed = true;
      ws?.close();
      term?.dispose?.();
    };
  }, []);

  return (
    <div className='flex h-full flex-col overflow-hidden rounded-lg bg-[#1e1e1e]'>
      <div className='flex items-center gap-2 border-b border-black/40 px-3 py-2 text-xs text-neutral-400'>
        <span
          className={
            status === 'connected'
              ? 'h-2 w-2 rounded-full bg-green-500'
              : status === 'connecting'
                ? 'h-2 w-2 animate-pulse rounded-full bg-yellow-500'
                : 'h-2 w-2 rounded-full bg-red-500'
          }
        />
        {status}
      </div>
      <div ref={containerRef} className='min-h-0 flex-1 p-2' />
    </div>
  );
}
