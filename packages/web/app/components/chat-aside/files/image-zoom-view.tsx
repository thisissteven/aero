'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  IMAGE_ZOOM_MAX,
  IMAGE_ZOOM_MIN,
  useFileViewerStore,
} from '@/app/components/chat-aside/files/file-viewer-store';

export interface ImageZoomViewProps {
  src: string;
  alt: string;
}

/** Multiplier per wheel notch. 1.15 ≈ smooth without feeling twitchy. */
const WHEEL_STEP = 1.15;

export const ImageZoomView = memo(function ImageZoomView({
  src,
  alt,
}: ImageZoomViewProps) {
  const zoom = useFileViewerStore((s) => s.imageZoom);
  const setZoom = useFileViewerStore((s) => s.setImageZoom);
  const resetZoom = useFileViewerStore((s) => s.resetImageZoom);

  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{
    sx: number;
    sy: number;
    px: number;
    py: number;
  } | null>(null);

  // Latest zoom/pan in refs so the native wheel listener doesn't need to be
  // re-attached on every pan tick.
  const zoomRef = useRef(zoom);
  const panValueRef = useRef(pan);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    panValueRef.current = pan;
  }, [pan]);

  // Recenter on file change, and whenever zoom returns to 1.
  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [src]);
  useEffect(() => {
    if (zoom === 1) setPan({ x: 0, y: 0 });
  }, [zoom]);

  // Native wheel listener — React's synthetic onWheel is passive, so
  // preventDefault() there would NOT stop page scroll / browser pinch-zoom.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handler = (e: WheelEvent) => {
      e.preventDefault();

      const rect = el.getBoundingClientRect();
      // Cursor position relative to the container's center.
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;

      const current = zoomRef.current;
      const factor = e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP;
      const next = Math.min(
        IMAGE_ZOOM_MAX,
        Math.max(IMAGE_ZOOM_MIN, +(current * factor).toFixed(3)),
      );
      if (next === current) return;

      // Anchor the point under the cursor. The image pixel at cursor position
      // is `(cursor - pan) / zoom` in image-space. After zoom changes to
      // `next`, we want that same pixel to still be at `cursor`, so:
      //   pan' = cursor - (cursor - pan) * next / zoom
      const p = panValueRef.current;
      const ratio = next / current;
      setPan({
        x: cx - (cx - p.x) * ratio,
        y: cy - (cy - p.y) * ratio,
      });
      setZoom(next);
    };

    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [setZoom]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      e.preventDefault();
      panStartRef.current = {
        sx: e.clientX,
        sy: e.clientY,
        px: pan.x,
        py: pan.y,
      };
      setIsPanning(true);
    },
    [zoom, pan],
  );

  // Window-level move/up so panning continues when the cursor leaves the pane.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const p = panStartRef.current;
      if (!p) return;
      setPan({
        x: p.px + (e.clientX - p.sx),
        y: p.py + (e.clientY - p.sy),
      });
    };
    const onUp = () => {
      if (!panStartRef.current) return;
      panStartRef.current = null;
      setIsPanning(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const canPan = zoom > 1;
  const cursor = !canPan ? 'default' : isPanning ? 'grabbing' : 'grab';

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onDoubleClick={resetZoom}
      className='relative flex h-full w-full items-center justify-center overflow-hidden'
      style={{ cursor, userSelect: 'none' }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className='block max-h-full max-w-full select-none'
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 90ms ease-out',
          willChange: 'transform',
        }}
      />
    </div>
  );
});
