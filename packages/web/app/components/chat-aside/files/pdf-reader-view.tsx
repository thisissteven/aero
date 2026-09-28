'use client';

import { cn, Spinner } from '@aero/ui';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsExpandHorizontal,
  Minus,
  Plus,
} from '@gravity-ui/icons';
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask,
} from 'pdfjs-dist';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import styles from '@/app/components/chat-aside/files/pdf-reader-view.module.css';
import { ToolbarButton } from '@/app/components/chat-aside/files/toolbar-button';
import { useI18n } from '@/app/hooks/i18n';
import { useTheme } from '@/app/providers';

export interface PdfReaderViewProps {
  src: string;
  fileName: string;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 6;
const ZOOM_STEPS = [
  0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 6,
];

/** Horizontal chrome (page padding) subtracted when fitting to width. */
const FIT_PADDING = 40;
/** Pages this far outside the viewport are kept rendered. */
const RENDER_MARGIN = 1200;

type PageSize = { width: number; height: number };

interface PageEntry {
  idx: number;
  pageNum: number;
  wrap: HTMLDivElement | null;
  baseW: number;
  baseH: number;
  canvas: HTMLCanvasElement | null;
  task: RenderTask | null;
  rendered: boolean;
  rendering: boolean;
}

interface ReaderFns {
  renderVisible: () => void;
  resetPages: () => void;
  getAnchor: () => { idx: number; offset: number };
  setAnchor: (anchor: { idx: number; offset: number }) => void;
  fitWidth: () => void;
  zoomBy: (direction: number) => void;
  resetZoom: () => void;
  goToPage: (page: number) => void;
  currentPageIndex: () => number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * A self-contained PDF.js reader. Renders pages to canvases lazily as they
 * approach the viewport, so large documents stay light, and inverts the page
 * raster to match the app's dark theme. Falls back to nothing if PDF.js fails
 * to load — the parent keeps the native `<iframe>` view available.
 */
export const PdfReaderView = memo(function PdfReaderView({
  src,
  fileName,
}: PdfReaderViewProps) {
  const { t } = useI18n();
  const { resolvedTheme } = useTheme();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const wrapElsRef = useRef<(HTMLDivElement | null)[]>([]);
  const entriesRef = useRef<PageEntry[]>([]);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const genRef = useRef(0);
  const scaleRef = useRef(1);
  const fitRef = useRef(true);
  const rafRef = useRef(0);
  const fnsRef = useRef<ReaderFns | null>(null);
  const pendingAnchorRef = useRef<{ idx: number; offset: number } | null>(null);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [pageSizes, setPageSizes] = useState<PageSize[]>([]);
  const [scale, setScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const pageInputFocused = useRef(false);

  const numPages = pageSizes.length;
  const invert = resolvedTheme === 'dark';

  // ── Document loading ────────────────────────────────────────────────
  useEffect(() => {
    const gen = (genRef.current += 1);
    let cancelled = false;

    setStatus('loading');
    setPageSizes([]);
    setScale(1);
    scaleRef.current = 1;
    fitRef.current = true;
    setCurrentPage(1);
    setPageInput('1');

    (async () => {
      try {
        const [pdfjs, worker] = await Promise.all([
          import('pdfjs-dist'),
          import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
        ]);
        if (cancelled || gen !== genRef.current) return;

        if (pdfjs.GlobalWorkerOptions.workerSrc !== worker.default) {
          pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        }

        const task = pdfjs.getDocument({ url: src });
        loadingTaskRef.current = task;
        const doc = await task.promise;
        if (cancelled || gen !== genRef.current) {
          void task.destroy();
          return;
        }
        docRef.current = doc;

        const sizes: PageSize[] = [];
        for (let i = 1; i <= doc.numPages; i += 1) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          sizes.push({ width: viewport.width, height: viewport.height });
        }
        if (cancelled || gen !== genRef.current) return;
        setPageSizes(sizes);
        setStatus('ready');
      } catch {
        if (cancelled || gen !== genRef.current) return;
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      genRef.current += 1;
      const task = loadingTaskRef.current;
      loadingTaskRef.current = null;
      docRef.current = null;
      if (task) void task.destroy().catch(() => undefined);
    };
  }, [src]);

  // ── Page lifecycle (observer, listeners, imperative controls) ───────
  useEffect(() => {
    const scrollerEl = scrollRef.current;
    if (status !== 'ready' || pageSizes.length === 0 || !scrollerEl) return;
    const scroller = scrollerEl;

    const entries: PageEntry[] = pageSizes.map((size, i) => ({
      idx: i,
      pageNum: i + 1,
      wrap: wrapElsRef.current[i] ?? null,
      baseW: size.width,
      baseH: size.height,
      canvas: null,
      task: null,
      rendered: false,
      rendering: false,
    }));
    entriesRef.current = entries;

    function resetPages() {
      for (const entry of entries) {
        if (entry.task) {
          try {
            entry.task.cancel();
          } catch {
            /* already finished */
          }
          entry.task = null;
        }
        entry.rendered = false;
        entry.rendering = false;
        if (entry.canvas) {
          entry.canvas.remove();
          entry.canvas = null;
        }
      }
    }

    async function renderPage(idx: number) {
      const entry = entries[idx];
      const doc = docRef.current;
      if (!entry || !entry.wrap || !doc || entry.rendered || entry.rendering) {
        return;
      }

      entry.rendering = true;
      const gen = genRef.current;
      const renderScale = scaleRef.current;

      try {
        const page = await doc.getPage(entry.pageNum);
        if (gen !== genRef.current) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: renderScale });

        let canvas = entry.canvas;
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvas.className = styles.canvas;
          entry.wrap.replaceChildren(canvas);
          entry.canvas = canvas;
        }

        canvas.width = Math.max(1, Math.round(viewport.width * dpr));
        canvas.height = Math.max(1, Math.round(viewport.height * dpr));
        canvas.style.width = `${Math.round(viewport.width)}px`;
        canvas.style.height = `${Math.round(viewport.height)}px`;

        const params: Parameters<PDFPageProxy['render']>[0] = {
          canvas,
          viewport,
          background: '#ffffff',
        };
        if (dpr !== 1) params.transform = [dpr, 0, 0, dpr, 0, 0];

        const task = page.render(params);
        entry.task = task;
        await task.promise;
        entry.task = null;
        if (gen !== genRef.current) return;
        entry.rendered = true;
      } catch (err) {
        const name =
          err && typeof err === 'object' && 'name' in err
            ? (err as { name?: string }).name
            : undefined;
        if (name !== 'RenderingCancelledException') {
          console.error('[PdfReader] Page render failed', err);
        }
      } finally {
        entry.rendering = false;
      }
    }

    function renderVisible() {
      const top = scroller.scrollTop - RENDER_MARGIN;
      const bottom = scroller.scrollTop + scroller.clientHeight + RENDER_MARGIN;
      for (const entry of entries) {
        if (!entry.wrap) continue;
        const y = entry.wrap.offsetTop;
        const height = entry.wrap.offsetHeight;
        if (y > bottom) break;
        if (y + height < top) continue;
        void renderPage(entry.idx);
      }
    }

    function getAnchor() {
      const st = scroller.scrollTop;
      for (const entry of entries) {
        if (!entry.wrap) continue;
        const y = entry.wrap.offsetTop;
        if (y + entry.wrap.offsetHeight > st + 1) {
          return { idx: entry.idx, offset: y - st };
        }
      }
      return { idx: 0, offset: 0 };
    }

    function setAnchor(anchor: { idx: number; offset: number }) {
      const entry = entries[anchor.idx];
      if (!entry?.wrap) return;
      scroller.scrollTop = Math.max(0, entry.wrap.offsetTop - anchor.offset);
    }

    function applyScale(next: number, fit: boolean) {
      const target = clamp(next, MIN_SCALE, MAX_SCALE);
      fitRef.current = fit;
      if (Math.abs(target - scaleRef.current) < 0.001) {
        renderVisible();
        return;
      }
      pendingAnchorRef.current = getAnchor();
      scaleRef.current = target;
      setScale(target);
    }

    function fitWidth() {
      const first = entries[0];
      if (!first || first.baseW <= 0) return;
      const available = scroller.clientWidth - FIT_PADDING;
      if (available <= 0) return;
      applyScale(available / first.baseW, true);
    }

    function zoomBy(direction: number) {
      const current = scaleRef.current;
      let next: number;
      if (direction > 0) {
        next =
          ZOOM_STEPS.find((value) => value > current + 0.001) ??
          ZOOM_STEPS[ZOOM_STEPS.length - 1];
      } else {
        next =
          [...ZOOM_STEPS].reverse().find((value) => value < current - 0.001) ??
          ZOOM_STEPS[0];
      }
      applyScale(next, false);
    }

    function goToPage(page: number) {
      const total = docRef.current?.numPages ?? entries.length;
      const target = entries[clamp(Math.round(page), 1, total) - 1];
      if (!target?.wrap) return;
      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      scroller.scrollTo({
        top: Math.max(0, target.wrap.offsetTop - 24),
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    }

    function currentPageIndex() {
      const probe =
        scroller.scrollTop + Math.min(scroller.clientHeight * 0.4, 240);
      let best = 0;
      for (const entry of entries) {
        if (!entry.wrap) continue;
        if (entry.wrap.offsetTop <= probe) best = entry.idx;
        else break;
      }
      return best;
    }

    fnsRef.current = {
      renderVisible,
      resetPages,
      getAnchor,
      setAnchor,
      fitWidth,
      zoomBy,
      resetZoom: () => applyScale(1, false),
      goToPage,
      currentPageIndex,
    };

    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (!record.isIntersecting) continue;
          const idx = Number((record.target as HTMLElement).dataset.idx);
          if (!Number.isNaN(idx)) void renderPage(idx);
        }
      },
      { root: scroller, rootMargin: `${RENDER_MARGIN}px 0px`, threshold: 0 },
    );
    observerRef.current = observer;
    for (const entry of entries) {
      if (entry.wrap) observer.observe(entry.wrap);
    }

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        setCurrentPage(currentPageIndex() + 1);
      });
    };

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? 1 : -1);
    };

    const resizeObserver = new ResizeObserver(() => {
      if (fitRef.current) fitWidth();
      else renderVisible();
    });

    scroller.addEventListener('scroll', onScroll, { passive: true });
    scroller.addEventListener('wheel', onWheel, { passive: false });
    resizeObserver.observe(scroller);

    fitWidth();
    renderVisible();

    return () => {
      observer.disconnect();
      observerRef.current = null;
      scroller.removeEventListener('scroll', onScroll);
      scroller.removeEventListener('wheel', onWheel);
      resizeObserver.disconnect();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      resetPages();
      fnsRef.current = null;
    };
  }, [status, pageSizes]);

  // Re-render the currently visible pages whenever the zoom level changes.
  // Wrapper sizes come from React, so this must run after the DOM updates.
  useLayoutEffect(() => {
    if (status !== 'ready') return;
    const fns = fnsRef.current;
    if (!fns) return;
    fns.resetPages();
    const anchor = pendingAnchorRef.current;
    pendingAnchorRef.current = null;
    if (anchor) fns.setAnchor(anchor);
    fns.renderVisible();
  }, [scale, status]);

  useEffect(() => {
    if (!pageInputFocused.current) setPageInput(String(currentPage));
  }, [currentPage]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const fns = fnsRef.current;
      if (!fns) return;
      const total = pageSizes.length;

      switch (event.key) {
        case 'ArrowRight':
        case 'PageDown':
          event.preventDefault();
          fns.goToPage(fns.currentPageIndex() + 2);
          break;
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault();
          fns.goToPage(fns.currentPageIndex());
          break;
        case 'Home':
          event.preventDefault();
          fns.goToPage(1);
          break;
        case 'End':
          event.preventDefault();
          fns.goToPage(total);
          break;
        case '+':
        case '=':
          event.preventDefault();
          fns.zoomBy(1);
          break;
        case '-':
        case '_':
          event.preventDefault();
          fns.zoomBy(-1);
          break;
        case '0':
          event.preventDefault();
          fns.fitWidth();
          break;
      }
    },
    [pageSizes.length],
  );

  const ready = status === 'ready';

  return (
    <div className={cn('flex h-full min-h-0 w-full flex-col', styles.enter)}>
      <div className='border-separator flex h-9 shrink-0 items-center gap-1 border-b px-2'>
        <ToolbarButton
          label={t.common.previous}
          onClick={() => fnsRef.current?.goToPage(currentPage - 1)}
          disabled={!ready || currentPage <= 1}
        >
          <ChevronLeft className='size-3.5' />
        </ToolbarButton>

        <input
          type='text'
          inputMode='numeric'
          value={pageInput}
          onChange={(event) => setPageInput(event.target.value)}
          onFocus={() => {
            pageInputFocused.current = true;
          }}
          onBlur={() => {
            pageInputFocused.current = false;
            setPageInput(String(currentPage));
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              const parsed = Number.parseInt(pageInput, 10);
              if (Number.isNaN(parsed)) setPageInput(String(currentPage));
              else fnsRef.current?.goToPage(parsed);
              event.currentTarget.blur();
            } else if (event.key === 'Escape') {
              event.currentTarget.blur();
            }
          }}
          aria-label={t.fileExplorer.pageOf(
            String(currentPage),
            String(numPages),
          )}
          title={t.fileExplorer.pageOf(String(currentPage), String(numPages))}
          disabled={!ready}
          className='bg-field text-foreground focus:border-accent h-6 w-10 rounded-md border border-transparent text-center text-xs tabular-nums outline-none disabled:opacity-40'
        />

        <span className='text-muted min-w-[4ch] text-xs tabular-nums'>
          / {numPages || '–'}
        </span>

        <ToolbarButton
          label={t.common.next}
          onClick={() => fnsRef.current?.goToPage(currentPage + 1)}
          disabled={!ready || currentPage >= numPages}
        >
          <ChevronRight className='size-3.5' />
        </ToolbarButton>

        <div className='ml-auto flex items-center gap-1'>
          <ToolbarButton
            label={t.markdown.zoomOutAria}
            onClick={() => fnsRef.current?.zoomBy(-1)}
            disabled={!ready || scale <= MIN_SCALE}
          >
            <Minus className='size-3.5' />
          </ToolbarButton>

          <button
            type='button'
            onClick={() => fnsRef.current?.resetZoom()}
            title={t.fileExplorer.resetZoomTitle}
            disabled={!ready}
            className='text-muted hover:text-foreground min-w-[5ch] rounded px-1 text-center text-xs tabular-nums disabled:opacity-40'
          >
            {Math.round(scale * 100)}%
          </button>

          <ToolbarButton
            label={t.markdown.zoomInAria}
            onClick={() => fnsRef.current?.zoomBy(1)}
            disabled={!ready || scale >= MAX_SCALE}
          >
            <Plus className='size-3.5' />
          </ToolbarButton>

          <ToolbarButton
            label={t.fileExplorer.fitToWidth}
            onClick={() => fnsRef.current?.fitWidth()}
            disabled={!ready}
          >
            <ChevronsExpandHorizontal className='size-3.5' />
          </ToolbarButton>
        </div>
      </div>

      <div
        ref={scrollRef}
        data-file-scroll-root
        tabIndex={0}
        role='document'
        aria-label={fileName}
        onKeyDown={handleKeyDown}
        className={styles.viewer}
      >
        {status === 'error' ? (
          <div className='text-danger flex h-full items-center justify-center p-6 text-center text-sm'>
            {t.fileExplorer.pdfLoadFailed}
          </div>
        ) : (
          <div
            className={styles.pages}
            data-page-theme={invert ? 'dark' : 'normal'}
          >
            {pageSizes.map((size, i) => (
              <div
                key={i}
                data-idx={i}
                ref={(node) => {
                  wrapElsRef.current[i] = node;
                  const entry = entriesRef.current[i];
                  if (entry) entry.wrap = node;
                }}
                className={styles.page}
                style={{
                  width: `${Math.round(size.width * scale)}px`,
                  height: `${Math.round(size.height * scale)}px`,
                }}
              />
            ))}
          </div>
        )}

        {status === 'loading' && (
          <div className='bg-background/60 absolute inset-0 grid place-items-center backdrop-blur-sm'>
            <Spinner className='text-muted size-5' />
          </div>
        )}
      </div>
    </div>
  );
});
