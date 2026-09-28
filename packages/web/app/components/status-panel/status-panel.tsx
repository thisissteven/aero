import { cn } from '@aero/ui';
import { Dots9 } from '@gravity-ui/icons';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { SessionStatus } from '@/app/components/status-panel/session-status';
import {
  type DropPosition,
  SortableStatusSection,
} from '@/app/components/status-panel/sortable-status-section';
import {
  renderStatusSection,
  resolveStatusPanelOrder,
} from '@/app/components/status-panel/status-sections';
import { useStatusPanelOrder } from '@/app/hooks/api/settings';
import {
  type StatusItemKey,
  useStatusPanelStore,
} from '@/app/stores/status-panel-store';

const MIN_WIDTH = 260;
const MIN_HEIGHT = 200;

type ResizeDirection =
  | 'left'
  | 'right'
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right';

function moveStatusSection(
  order: StatusItemKey[],
  from: string,
  target: string,
  position: DropPosition,
): StatusItemKey[] {
  if (from === target) return order;

  const next = order.filter((key) => key !== from);
  const targetIndex = next.indexOf(target as StatusItemKey);
  if (targetIndex === -1) return order;

  const insertAt = position === 'before' ? targetIndex : targetIndex + 1;
  next.splice(insertAt, 0, from as StatusItemKey);

  return next;
}

function StatusPanelSections() {
  const { order, setOrder } = useStatusPanelOrder();
  const visibleItems = useStatusPanelStore((state) => state.visibleItems);
  const orderedKeys = useMemo(() => resolveStatusPanelOrder(order), [order]);

  const [localOrder, setLocalOrder] = useState<StatusItemKey[]>(orderedKeys);
  const [presentKeys, setPresentKeys] = useState<Set<string>>(() => new Set());
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    key: string;
    position: DropPosition;
  } | null>(null);

  const localOrderRef = useRef<StatusItemKey[]>(orderedKeys);
  const draggingKeyRef = useRef<string | null>(null);

  useEffect(() => {
    localOrderRef.current = orderedKeys;
    setLocalOrder(orderedKeys);
  }, [orderedKeys]);

  const visibleKeys = useMemo(
    () => localOrder.filter((key) => visibleItems[key] ?? true),
    [localOrder, visibleItems],
  );

  const handlePresenceChange = useCallback((id: string, present: boolean) => {
    setPresentKeys((current) => {
      if (current.has(id) === present) return current;

      const next = new Set(current);
      if (present) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const lastPresentKey = useMemo(() => {
    for (let index = visibleKeys.length - 1; index >= 0; index -= 1) {
      if (presentKeys.has(visibleKeys[index])) return visibleKeys[index];
    }

    return null;
  }, [visibleKeys, presentKeys]);

  const hasSections = useMemo(
    () => visibleKeys.some((key) => presentKeys.has(key)),
    [visibleKeys, presentKeys],
  );

  const handleRowDragStart = useCallback((key: string) => {
    draggingKeyRef.current = key;
    setDraggingKey(key);
  }, []);

  const handleRowDragOver = useCallback(
    (key: string, position: DropPosition) => {
      if (draggingKeyRef.current === key) {
        setDropTarget((current) => (current ? null : current));
        return;
      }

      setDropTarget((current) =>
        current?.key === key && current.position === position
          ? current
          : { key, position },
      );
    },
    [],
  );

  const handleRowDrop = useCallback(
    (key: string, position: DropPosition) => {
      const from = draggingKeyRef.current;
      draggingKeyRef.current = null;
      setDraggingKey(null);
      setDropTarget(null);

      if (!from) return;

      const next = moveStatusSection(
        localOrderRef.current,
        from,
        key,
        position,
      );
      if (next === localOrderRef.current) return;

      localOrderRef.current = next;
      setLocalOrder(next);
      setOrder(next);
    },
    [setOrder],
  );

  const handleRowDragEnd = useCallback(() => {
    draggingKeyRef.current = null;
    setDraggingKey(null);
    setDropTarget(null);
  }, []);

  return (
    <>
      <div className={cn('border-separator', hasSections && 'border-b')}>
        <SessionStatus />
      </div>

      <div className={cn(draggingKey && 'select-none')}>
        {visibleKeys.map((key) => (
          <SortableStatusSection
            key={key}
            id={key}
            dragging={draggingKey === key}
            dropIndicator={dropTarget?.key === key ? dropTarget.position : null}
            onDragEnd={handleRowDragEnd}
            onDragOver={handleRowDragOver}
            onDrop={handleRowDrop}
            onDragStart={handleRowDragStart}
            onPresenceChange={handlePresenceChange}
            showBorder={presentKeys.has(key) && key !== lastPresentKey}
          >
            {renderStatusSection(key)}
          </SortableStatusSection>
        ))}
      </div>
    </>
  );
}

export const StatusPanel = React.memo(function StatusPanel() {
  const isOpen = useStatusPanelStore((state) => state.isOpen);

  if (!isOpen) return null;

  return (
    <div className='border-separator bg-surface/30 backdrop-blur-sm h-full scrollbar-thin overflow-x-hidden overflow-y-auto border-l'>
      <StatusPanelSections />
    </div>
  );
});

export const StatusPanelFloating = React.memo(function StatusPanelFloating() {
  const isOpen = useStatusPanelStore((state) => state.isOpen);
  const position = useStatusPanelStore((state) => state.position);
  const setPosition = useStatusPanelStore((state) => state.setPosition);

  const size = useStatusPanelStore((state) => state.size) ?? {
    width: 280,
    height: 400,
  };
  const setSize = useStatusPanelStore((state) => state.setSize);

  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen || position !== null || !panelRef.current) return;

    const panelWidth = size.width;
    const panelHeight = size.height;

    const marginX = 48;
    const marginY = 56;

    const maxX = Math.max(0, window.innerWidth - panelWidth - marginX);
    const maxY = Math.max(0, window.innerHeight - panelHeight - marginY);

    setPosition({
      x: maxX,
      y: Math.min(marginY, maxY),
    });
  }, [isOpen, position, setPosition, size.width, size.height]);

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
        const panelWidth = size.width;
        const panelHeight = size.height;

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
    [position, setPosition, size.width, size.height],
  );

  const handleResizePointerDown = useCallback(
    (direction: ResizeDirection) => (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startY = e.clientY;

      const startWidth = size.width;
      const startHeight = size.height;

      const initialX = position?.x ?? 0;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;
        let newX = initialX;

        // Handle horizontal resizing
        if (direction === 'right' || direction === 'bottom-right') {
          const maxWidth = window.innerWidth - initialX;
          newWidth = Math.min(
            maxWidth,
            Math.max(MIN_WIDTH, startWidth + deltaX),
          );
        } else if (direction === 'left' || direction === 'bottom-left') {
          const maxDeltaX = startWidth - MIN_WIDTH;
          const clampedDeltaX = Math.max(
            -initialX,
            Math.min(maxDeltaX, deltaX),
          );

          newWidth = startWidth - clampedDeltaX;
          newX = initialX + clampedDeltaX;
        }

        // Handle vertical resizing
        if (
          direction === 'bottom' ||
          direction === 'bottom-right' ||
          direction === 'bottom-left'
        ) {
          const initialY = position?.y ?? 0;
          const maxHeight = window.innerHeight - initialY;
          newHeight = Math.min(
            maxHeight,
            Math.max(MIN_HEIGHT, startHeight + deltaY),
          );
        }

        setSize({ width: newWidth, height: newHeight });

        if (newX !== initialX) {
          setPosition((prev) => (prev ? { ...prev, x: newX } : prev));
        }
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [position?.x, position?.y, setPosition, setSize, size.height, size.width],
  );

  if (!isOpen) return null;

  const panel = (
    <div
      ref={panelRef}
      style={{
        transform: position
          ? `translate3d(${position.x}px, ${position.y}px, 0)`
          : undefined,
        width: `${size.width}px`,
        height: `${size.height}px`,
      }}
      className='fixed top-0 left-0 z-40 animate-[fade-in_150ms_ease-out] p-2 select-none'
    >
      <div className='bg-surface/80 border-separator shadow-surface flex h-full flex-col overflow-hidden rounded-xl border backdrop-blur-sm relative'>
        {/* Edge Resize Strips */}
        <div
          onPointerDown={handleResizePointerDown('left')}
          className='absolute top-0 bottom-0 left-0 z-20 w-1.5 cursor-ew-resize hover:bg-primary/20 transition-colors'
        />
        <div
          onPointerDown={handleResizePointerDown('right')}
          className='absolute top-0 bottom-0 right-0 z-20 w-1.5 cursor-ew-resize hover:bg-primary/20 transition-colors'
        />
        <div
          onPointerDown={handleResizePointerDown('bottom')}
          className='absolute bottom-0 left-0 right-0 z-20 h-1.5 cursor-ns-resize hover:bg-primary/20 transition-colors'
        />

        {/* Corner Resize Handles */}
        <div
          onPointerDown={handleResizePointerDown('bottom-left')}
          className='absolute bottom-0 left-0 z-30 size-3 cursor-nesw-resize'
        />
        <div
          onPointerDown={handleResizePointerDown('bottom-right')}
          className='absolute bottom-0 right-0 z-30 size-3 cursor-nwse-resize'
        />

        {/* Drag Handle */}
        <div
          onPointerDown={handlePointerDown}
          className='border-separator flex h-8 shrink-0 cursor-grab items-center justify-center border-b active:cursor-grabbing'
        >
          <div
            className='text-muted-foreground flex items-center gap-0.5 rounded px-2 py-1'
            aria-hidden='true'
          >
            <Dots9 />
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className='min-h-0 flex-1 cursor-default scrollbar-thin overflow-x-hidden overflow-y-auto'>
          <StatusPanelSections />
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
});
