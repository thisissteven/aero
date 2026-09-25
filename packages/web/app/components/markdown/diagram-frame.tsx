'use client';

import { Button, cn } from '@aero/ui';
import {
  memo,
  type ReactElement,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type SVGProps,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { useI18n } from '@/app/hooks/i18n';
import { CodeBlock } from '../code-block/code-block';

// ---- icons (inline-SVG, matching CodeBlock's pattern) --------------------

const EyeIcon = memo(function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill='none'
      height='16'
      viewBox='0 0 16 16'
      width='16'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        d='M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z'
        stroke='currentColor'
        strokeWidth='1.3'
      />
      <circle cx='8' cy='8' r='2' stroke='currentColor' strokeWidth='1.3' />
    </svg>
  );
});

const CodeIcon = memo(function CodeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill='none'
      height='16'
      viewBox='0 0 16 16'
      width='16'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        d='M5.5 4 2 8l3.5 4M10.5 4 14 8l-3.5 4'
        stroke='currentColor'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1.3'
      />
    </svg>
  );
});

const ZoomInIcon = memo(function ZoomInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill='none'
      height='16'
      viewBox='0 0 16 16'
      width='16'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <circle cx='7' cy='7' r='5' stroke='currentColor' strokeWidth='1.3' />
      <path
        d='M7 4.5v5M4.5 7h5M11 11l3.5 3.5'
        stroke='currentColor'
        strokeLinecap='round'
        strokeWidth='1.3'
      />
    </svg>
  );
});

const ZoomOutIcon = memo(function ZoomOutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill='none'
      height='16'
      viewBox='0 0 16 16'
      width='16'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <circle cx='7' cy='7' r='5' stroke='currentColor' strokeWidth='1.3' />
      <path
        d='M4.5 7h5M11 11l3.5 3.5'
        stroke='currentColor'
        strokeLinecap='round'
        strokeWidth='1.3'
      />
    </svg>
  );
});

const ResetIcon = memo(function ResetIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill='none'
      height='16'
      viewBox='0 0 16 16'
      width='16'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        d='M13.5 8A5.5 5.5 0 1 1 11.9 4.1M13.5 2v3.5H10'
        stroke='currentColor'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1.3'
      />
    </svg>
  );
});

const MaximizeIcon = memo(function MaximizeIcon(
  props: SVGProps<SVGSVGElement>,
) {
  return (
    <svg
      fill='none'
      height='16'
      viewBox='0 0 16 16'
      width='16'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        d='M6 2H2v4M10 2h4v4M14 10v4h-4M2 10h4v4'
        stroke='currentColor'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1.3'
      />
    </svg>
  );
});

const MinimizeIcon = memo(function MinimizeIcon(
  props: SVGProps<SVGSVGElement>,
) {
  return (
    <svg
      fill='none'
      height='16'
      viewBox='0 0 16 16'
      width='16'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        d='M2 6h4V2M14 6h-4V2M14 10h-4v4M2 10h4v4'
        stroke='currentColor'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1.3'
      />
    </svg>
  );
});

// ---- pan/zoom -------------------------------------------------------------

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.25;

// Match CodeBlockCode's own `maxHeight: '40vh'` so the preview and the code
// view occupy the same footprint and neither escapes the frame.
const NON_FULLSCREEN_BODY = 'h-[40vh] max-h-[40vh]';

interface PanZoomState {
  scale: number;
  x: number;
  y: number;
}

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, +scale.toFixed(2)));
}

function usePanZoom() {
  const [state, setState] = useState<PanZoomState>({ scale: 1, x: 0, y: 0 });
  const draggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const cleanupWheelRef = useRef<(() => void) | null>(null);

  const reset = useCallback(() => setState({ scale: 1, x: 0, y: 0 }), []);

  const zoomBy = useCallback((delta: number) => {
    setState((prev) => ({ ...prev, scale: clampScale(prev.scale + delta) }));
  }, []);

  // Callback ref (not useEffect): the stage element remounts whenever we
  // toggle between the inline card and the fullscreen portal, so we need to
  // (re)attach on every DOM node identity change.
  //
  // Native listener with `{ passive: false }` is required — React's `onWheel`
  // is passive, so `preventDefault()` there is a silent no-op and the outer
  // chat scroller ends up consuming the scroll.
  const stageRef = useCallback((el: HTMLDivElement | null) => {
    cleanupWheelRef.current?.();
    cleanupWheelRef.current = null;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setState((prev) => ({ ...prev, scale: clampScale(prev.scale + delta) }));
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    cleanupWheelRef.current = () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => () => cleanupWheelRef.current?.(), []);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    draggingRef.current = true;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    setState((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
  }, []);

  return {
    state,
    reset,
    zoomBy,
    stageRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}

// ---- frame ----------------------------------------------------------------

type ViewMode = 'preview' | 'code';

export interface DiagramFrameProps {
  preview: ReactNode;
  code: string;
  codeView: ReactNode;
  label: string;
  previewUnavailable?: boolean;
  className?: string;
}

const actionButtonClass = cn(
  'size-6 min-w-6 shrink-0 rounded-md text-muted',
  'data-[pressed]:text-foreground',
);

const tabClass = (active: boolean): ReturnType<typeof cn> =>
  cn(
    'flex h-6 items-center gap-1.5 rounded-md text-xs transition-colors',
    'hover:text-foreground disabled:pointer-events-none disabled:opacity-40',
    active ? 'text-foreground' : 'text-muted',
  );

export const DiagramFrame = memo(function DiagramFrame({
  preview,
  code,
  codeView,
  label,
  previewUnavailable = false,
  className,
}: DiagramFrameProps): ReactElement {
  const { t } = useI18n();
  const [mode, setMode] = useState<ViewMode>(
    previewUnavailable ? 'code' : 'preview',
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panZoom = usePanZoom();

  // `createPortal` needs a DOM target; don't touch it during SSR.
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (previewUnavailable) setMode('code');
  }, [previewUnavailable]);

  // Portal-based fullscreen overlay: lock body scroll + Escape to exit.
  useEffect(() => {
    if (!isFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isFullscreen]);

  useEffect(() => {
    // Going in OR out of fullscreen remounts the stage element; reset so a
    // stale offset/scale from the previous surface doesn't leak through.
    panZoom.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset is stable
  }, [isFullscreen]);

  const stage = (
    <div
      ref={panZoom.stageRef}
      className={cn(
        // Fill whatever height the body wrapper gives us — the wrapper is the
        // single source of truth for how tall a diagram/code panel is.
        'relative flex h-full w-full items-center justify-center overflow-hidden',
        // `touch-none` stops the browser claiming touch-drag as scroll;
        // `overscroll-contain` stops scroll-chaining to the chat scroller
        // even if something bypasses preventDefault.
        'touch-none overscroll-contain',
        mode === 'preview' && 'cursor-grab active:cursor-grabbing',
      )}
      data-slot='diagram-frame-stage'
      onPointerDown={mode === 'preview' ? panZoom.onPointerDown : undefined}
      onPointerMove={mode === 'preview' ? panZoom.onPointerMove : undefined}
      onPointerUp={mode === 'preview' ? panZoom.onPointerUp : undefined}
      onPointerLeave={mode === 'preview' ? panZoom.onPointerUp : undefined}
      onDoubleClick={mode === 'preview' ? panZoom.reset : undefined}
    >
      <div
        className='origin-center'
        style={{
          transform: `translate(${panZoom.state.x}px, ${panZoom.state.y}px) scale(${panZoom.state.scale})`,
        }}
      >
        {preview}
      </div>
    </div>
  );

  const header = (
    <div
      className={cn(
        'flex h-8 shrink-0 items-center justify-between gap-2',
        'border-b border-separator pl-3 pr-1',
        'text-muted',
      )}
      data-slot='diagram-frame-header'
    >
      <div
        className='flex items-center gap-2'
        role='tablist'
        aria-label={`${label} view`}
      >
        <button
          type='button'
          role='tab'
          aria-selected={mode === 'preview'}
          disabled={previewUnavailable}
          className={tabClass(mode === 'preview')}
          onClick={() => setMode('preview')}
        >
          <EyeIcon className='size-3.5' />
          {t.markdown.preview}
        </button>
        <button
          type='button'
          role='tab'
          aria-selected={mode === 'code'}
          className={tabClass(mode === 'code')}
          onClick={() => setMode('code')}
        >
          <CodeIcon className='size-3.5' />
          {t.markdown.code}
        </button>
      </div>

      <div className='flex items-center gap-0.5'>
        {mode === 'preview' && !previewUnavailable && (
          <>
            <Button
              isIconOnly
              aria-label={t.markdown.zoomOutAria}
              className={actionButtonClass}
              size='sm'
              variant='ghost'
              onPress={() => panZoom.zoomBy(-ZOOM_STEP)}
            >
              <ZoomOutIcon className='size-3.5' />
            </Button>
            <Button
              isIconOnly
              aria-label={t.markdown.resetZoomAria}
              className={actionButtonClass}
              size='sm'
              variant='ghost'
              onPress={panZoom.reset}
            >
              <ResetIcon className='size-3.5' />
            </Button>
            <Button
              isIconOnly
              aria-label={t.markdown.zoomInAria}
              className={actionButtonClass}
              size='sm'
              variant='ghost'
              onPress={() => panZoom.zoomBy(ZOOM_STEP)}
            >
              <ZoomInIcon className='size-3.5' />
            </Button>
          </>
        )}
        <CodeBlock.CopyButton code={code} aria-label={`Copy ${label} code`} />
        <Button
          isIconOnly
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          className={actionButtonClass}
          size='sm'
          variant='ghost'
          onPress={() => setIsFullscreen((v) => !v)}
        >
          {isFullscreen ? (
            <MinimizeIcon className='size-3.5' />
          ) : (
            <MaximizeIcon className='size-3.5' />
          )}
        </Button>
      </div>
    </div>
  );

  const frameClass = cn(
    'group/diagram-frame flex w-full min-w-0 flex-col overflow-hidden rounded-lg',
    'border border-separator',
    'text-[13px] text-foreground',
  );

  // Fullscreen: portal on `document.body` so it escapes every ancestor
  // `overflow`, `transform`, and stacking context (chat scroller, artifact
  // iframe wrapper, virtualized list container, etc.). Also sidesteps the
  // permissions-policy that blocks `requestFullscreen` inside those frames.
  if (isFullscreen && mounted) {
    return createPortal(
      <div
        className={cn(
          'fixed inset-0 z-[100] flex flex-col p-4 sm:p-6',
          'bg-background',
        )}
      >
        <div
          className={cn(frameClass, 'h-full')}
          data-slot='diagram-frame'
          role='dialog'
          aria-modal='true'
          aria-label={`${label} fullscreen view`}
        >
          {header}
          {/* `min-h-0` lets the flex child shrink so `h-full` on the stage
              actually means "fill the remaining space", not "grow past it". */}
          <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
            {mode === 'preview' ? stage : codeView}
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <div className={cn(frameClass, className)} data-slot='diagram-frame'>
      {header}
      {/* Explicit height (matching CodeBlockCode's own `40vh` cap) so the
          preview and code views are both contained by the frame instead of
          growing past it. `overflow-hidden` clips anything that still tries. */}
      <div
        className={cn(NON_FULLSCREEN_BODY, 'overflow-y-auto scrollbar-thin')}
      >
        {mode === 'preview' ? stage : codeView}
      </div>
    </div>
  );
});

DiagramFrame.displayName = 'DiagramFrame';
