import { Dots9 } from '@gravity-ui/icons';
import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { ContextSources } from '@/app/components/status-panel/context-sources';
import { McpStatus } from '@/app/components/status-panel/mcp-status';
import { PinnedMessageStatus } from '@/app/components/status-panel/pinned-message-status';
import { ProjectStatus } from '@/app/components/status-panel/project-status';
import { SessionStatus } from '@/app/components/status-panel/session-status';
import { SubagentStatus } from '@/app/components/status-panel/subagent-status';
import { TaskStatus } from '@/app/components/status-panel/task-status';
import { UsageStatus } from '@/app/components/status-panel/usage-status';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

export const StatusPanel = React.memo(function StatusPanel() {
  const isOpen = useStatusPanelStore((state) => state.isOpen);

  if (!isOpen) return null;

  return (
    <div className='border-separator dark:border-separator/70 h-full scrollbar-thin overflow-x-hidden overflow-y-auto border-l'>
      <SessionStatus />
      <ProjectStatus />
      <UsageStatus />
      <SubagentStatus />
      <TaskStatus />
      <McpStatus />
      <PinnedMessageStatus />
      <ContextSources />
    </div>
  );
});

export const StatusPanelFloating = React.memo(function StatusPanel() {
  const isOpen = useStatusPanelStore((state) => state.isOpen);
  const position = useStatusPanelStore((state) => state.position);
  const setPosition = useStatusPanelStore((state) => state.setPosition);

  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen || position !== null || !panelRef.current) return;

    const panel = panelRef.current;
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;

    const marginX = 48;
    const marginY = 56;

    const maxX = Math.max(0, window.innerWidth - panelWidth - marginX);

    const maxY = Math.max(0, window.innerHeight - panelHeight - marginY);

    setPosition({
      x: maxX,
      y: Math.min(marginY, maxY),
    });
  }, [isOpen, position, setPosition]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;

      if (
        target.closest(
          'button, input, textarea, select, a, [role="button"], [data-no-drag]',
        )
      ) {
        return;
      }

      const panel = panelRef.current;
      if (!panel || position === null) return;

      e.preventDefault();

      const startX = e.clientX;
      const startY = e.clientY;

      const initialX = position.x;
      const initialY = position.y;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const panelWidth = panel.offsetWidth;
        const panelHeight = panel.offsetHeight;

        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        const maxX = Math.max(0, window.innerWidth - panelWidth);
        const maxY = Math.max(0, window.innerHeight - panelHeight);

        const newX = Math.max(0, Math.min(initialX + deltaX, maxX));

        const newY = Math.max(0, Math.min(initialY + deltaY, maxY));

        setPosition({
          x: newX,
          y: newY,
        });
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [position, setPosition],
  );

  const panel = (
    <div
      ref={panelRef}
      style={
        position
          ? {
              transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
            }
          : undefined
      }
      className='fixed top-0 left-0 z-40 animate-[fade-in_150ms_ease-out] cursor-grab p-2 select-none active:cursor-grabbing'
    >
      <div className='bg-background/70 border-separator dark:border-separator/70 shadow-surface w-[280px] overflow-hidden rounded-xl border backdrop-blur-sm'>
        <div
          onPointerDown={handlePointerDown}
          className='flex h-8 items-center justify-center border-b'
        >
          <div
            className='text-muted-foreground flex items-center gap-0.5 rounded px-2 py-1'
            aria-hidden='true'
          >
            <Dots9 />
          </div>
        </div>

        <div className='max-h-[40svh] min-h-[min(320px,calc(100svh-48px))] cursor-default scrollbar-thin overflow-x-hidden overflow-y-auto'>
          <SessionStatus />
          <ProjectStatus />
          <UsageStatus />
          <SubagentStatus />
          <TaskStatus />
          <McpStatus />
          <PinnedMessageStatus />
          <ContextSources />
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
});
