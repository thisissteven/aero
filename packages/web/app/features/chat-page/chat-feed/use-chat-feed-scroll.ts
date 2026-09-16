import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type VirtualizerHandle } from 'virtua';

import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import type { AeroConversationTurn } from '@/server/services/harness/types';

const BOTTOM_THRESHOLD = 80;
const TOC_TOP_OFFSET = 60;
const INITIAL_SCROLL_MAX_TRIES = 30;
const INITIAL_SCROLL_SETTLE_TRIES = 3;

/** Programmatic-scroll guard durations. */
const PROGRAMMATIC_INSTANT_MS = 120;
const PROGRAMMATIC_SMOOTH_MS = 500;
const PROGRAMMATIC_TOC_MS = 200;

export interface UserAnchor {
  groupIndex: number;
  flatIndex: number;
}

interface UseChatFeedScrollOptions {
  sessionId: string;
  groups: AeroConversationTurn[];
  groupFlatIndex: number[];
  flatItemsLength: number;
  virtualizerRef: React.RefObject<VirtualizerHandle | null>;
  scrollRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLElement | null>;
  enabled?: boolean;
}

export function useChatFeedScroll({
  sessionId,
  groups,
  groupFlatIndex,
  flatItemsLength,
  virtualizerRef,
  scrollRef,
  contentRef,
  enabled = true,
}: UseChatFeedScrollOptions) {
  const patchScroll = useChatStore((s) => s.patchScroll);

  // ---- Reactive readiness state ----
  const [isReady, setIsReady] = useState(false);

  // ---- Non-reactive bookkeeping (does NOT trigger renders) ----
  const isProgrammaticRef = useRef(false);
  const isReadyRef = useRef(false);
  const lastActiveGroupRef = useRef(-1);
  const prevScrollTopRef = useRef(0);
  const unreadBaseRef = useRef(0);
  const scrollRafRef = useRef<number | null>(null);
  const resizeRafRef = useRef<number | null>(null);
  const programmaticTimerRef = useRef<number | null>(null);

  // `flatItemsLength` is a stable primitive, but we also want to read it from
  // inside callbacks that shouldn't be recreated on every stream tick.
  const flatItemsLengthRef = useRef(flatItemsLength);
  flatItemsLengthRef.current = flatItemsLength;

  // ---- TOC anchors ----
  // Ascending by flatIndex. Memoized so callbacks below can depend on stable
  // identity and the reference inside `userAnchorsRef` only updates when the
  // message list structure actually changes.
  const userAnchors = useMemo<UserAnchor[]>(() => {
    const out: UserAnchor[] = [];
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].role !== 'user') continue;
      const flatIndex = groupFlatIndex[i];
      if (flatIndex !== undefined) out.push({ groupIndex: i, flatIndex });
    }
    return out;
  }, [groups, groupFlatIndex]);

  const userAnchorsRef = useRef(userAnchors);
  userAnchorsRef.current = userAnchors;

  // ---- Helpers ----

  const resolveActiveGroup = useCallback((flatIndex: number) => {
    const anchors = userAnchorsRef.current;
    if (anchors.length === 0) return 0;

    let lo = 0;
    let hi = anchors.length - 1;
    let result = anchors[0].groupIndex;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const anchor = anchors[mid];
      if (anchor.flatIndex <= flatIndex) {
        result = anchor.groupIndex;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    return result;
  }, []);

  const beginProgrammatic = useCallback((durationMs: number) => {
    isProgrammaticRef.current = true;
    if (programmaticTimerRef.current !== null) {
      clearTimeout(programmaticTimerRef.current);
    }
    programmaticTimerRef.current = window.setTimeout(() => {
      isProgrammaticRef.current = false;
      programmaticTimerRef.current = null;
    }, durationMs);
  }, []);

  // ---- Initial jump to bottom (runs once per mount, per conversation) ----
  useLayoutEffect(() => {
    if (!enabled || flatItemsLength === 0 || isReadyRef.current) return;

    isProgrammaticRef.current = true;
    let cancelled = false;
    let tries = 0;

    const tick = () => {
      if (cancelled) return;

      const el = scrollRef.current;
      const v = virtualizerRef.current;

      if (!el || !v || flatItemsLengthRef.current === 0) {
        if (tries++ < INITIAL_SCROLL_MAX_TRIES) requestAnimationFrame(tick);
        return;
      }

      v.scrollToIndex(flatItemsLengthRef.current - 1, {
        align: 'end',
        smooth: false,
        offset: 48,
      });

      if (tries++ < INITIAL_SCROLL_SETTLE_TRIES) {
        requestAnimationFrame(tick);
      } else {
        isProgrammaticRef.current = false;
        isReadyRef.current = true;
        setIsReady(true);
        prevScrollTopRef.current = el.scrollTop;
        unreadBaseRef.current = flatItemsLengthRef.current;

        const startFlat = v.findItemIndex(el.scrollTop + TOC_TOP_OFFSET);
        const nextGroup =
          startFlat != null && startFlat >= 0
            ? resolveActiveGroup(startFlat)
            : undefined;

        if (nextGroup !== undefined) {
          lastActiveGroupRef.current = nextGroup;
        }

        patchScroll(sessionId, {
          pinned: true,
          isAtBottom: true,
          unreadCount: 0,
          ...(nextGroup !== undefined ? { activeGroupIndex: nextGroup } : {}),
        });
      }
    };

    requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      isProgrammaticRef.current = false;
    };
  }, [
    enabled,
    flatItemsLength,
    sessionId,
    scrollRef,
    resolveActiveGroup,
    patchScroll,
  ]);

  // ---- Single scroll handler (invoked by virtua's `onScroll` AND the DOM) ----
  // Both sources are deduped by the rAF guard, so it doesn't matter which
  // fires first or whether one is ever skipped.
  const handleScroll = useCallback(
    (_offset?: number) => {
      if (isProgrammaticRef.current) return;
      if (!isReadyRef.current) return;
      if (scrollRafRef.current !== null) return;

      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;

        const el = scrollRef.current;
        const v = virtualizerRef.current;
        if (!el || !v) return;

        const top = el.scrollTop;
        const direction = top - prevScrollTopRef.current;
        prevScrollTopRef.current = top;

        const atBottom =
          el.scrollHeight - top - el.clientHeight <= BOTTOM_THRESHOLD;

        const patch: Parameters<typeof patchScroll>[1] = {};

        if (atBottom) {
          patch.isAtBottom = true;
          patch.pinned = true;
          patch.unreadCount = 0;
          unreadBaseRef.current = flatItemsLengthRef.current;
        } else {
          patch.isAtBottom = false;
          if (direction < -2) {
            patch.pinned = false;
            unreadBaseRef.current = flatItemsLengthRef.current;
          }
        }

        // Active TOC item = topmost visible user message.
        // `findItemIndex` is a stable API on VirtualizerHandle.
        const startFlat = v.findItemIndex(top + TOC_TOP_OFFSET);
        if (startFlat != null && startFlat >= 0) {
          const nextGroup = resolveActiveGroup(startFlat);
          if (nextGroup !== lastActiveGroupRef.current) {
            lastActiveGroupRef.current = nextGroup;
            patch.activeGroupIndex = nextGroup;
          }
        }

        patchScroll(sessionId, patch);
      });
    },
    [sessionId, patchScroll, scrollRef, virtualizerRef, resolveActiveGroup],
  );

  // ---- DOM scroll listener (fallback + catches scrolls virtua doesn't see) ----
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !enabled) return;

    const onScroll = () => handleScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollRef, handleScroll, enabled]);

  // ---- Wheel intent ----
  // Catches the very first pixel of upward scroll, before any scroll event
  // has fired. This is the critical fix for "auto-scroll resumes when user
  // nudges up but the scroll event hasn't landed yet".
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !enabled) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY >= 0) return;

      const current = useChatStore.getState().scrollBySession[sessionId];
      if (current?.pinned === false) return;

      unreadBaseRef.current = flatItemsLengthRef.current;
      patchScroll(sessionId, { pinned: false });
    };

    el.addEventListener('wheel', onWheel, { passive: true });
    return () => el.removeEventListener('wheel', onWheel);
  }, [sessionId, patchScroll, scrollRef, enabled]);

  // ---- Unread count: derived from message-count delta, not per-chunk ticks ----
  useEffect(() => {
    const current = useChatStore.getState().scrollBySession[sessionId];
    if (!current || current.pinned) return;

    const unread = Math.max(0, flatItemsLength - unreadBaseRef.current);
    if (unread !== current.unreadCount) {
      patchScroll(sessionId, { unreadCount: unread });
    }
  }, [flatItemsLength, sessionId, patchScroll]);

  // ---- Follow content growth while pinned ----
  // ResizeObserver on the content wrapper catches:
  //   - streaming text growth
  //   - late-loading images / code blocks / fonts changing height
  // and re-anchors to bottom without waiting for a scroll event.
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content || !enabled) return;

    const observer = new ResizeObserver(() => {
      if (!isReadyRef.current) return;
      if (isProgrammaticRef.current) return;
      if (resizeRafRef.current !== null) return;

      resizeRafRef.current = requestAnimationFrame(() => {
        resizeRafRef.current = null;

        const el = scrollRef.current;
        if (!el) return;

        const current = useChatStore.getState().scrollBySession[sessionId];
        if (current?.pinned === false) return;

        el.scrollTop = el.scrollHeight;
        prevScrollTopRef.current = el.scrollTop;
      });
    });

    observer.observe(content);

    return () => {
      observer.disconnect();
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
    };
  }, [contentRef, scrollRef, enabled, sessionId]);

  // ---- Cleanup pending timers/rafs on unmount ----
  useEffect(
    () => () => {
      if (programmaticTimerRef.current !== null) {
        clearTimeout(programmaticTimerRef.current);
        programmaticTimerRef.current = null;
      }
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
    },
    [],
  );

  // ---- Public actions ----

  /** Jump to a user group's bubble (TOC click). */
  const scrollToGroup = useCallback(
    (groupIndex: number) => {
      const v = virtualizerRef.current;
      if (!v) return;

      const runtime = useChatStore.getState().sessions[sessionId];
      const flatIndex = runtime?.groupFlatIndex[groupIndex];
      if (flatIndex === undefined) return;

      beginProgrammatic(PROGRAMMATIC_TOC_MS);
      lastActiveGroupRef.current = groupIndex;

      const isLast = flatIndex >= flatItemsLengthRef.current - 1;

      patchScroll(sessionId, {
        activeGroupIndex: groupIndex,
        // If we're jumping to the last group, re-pin so future streaming
        // follows. Otherwise unpin — the user explicitly navigated away.
        pinned: isLast,
        isAtBottom: isLast,
      });

      v.scrollToIndex(flatIndex, {
        align: 'start',
        smooth: false,
        offset: -24,
      });
    },
    [sessionId, virtualizerRef, patchScroll, beginProgrammatic],
  );

  /** Scroll to bottom and re-pin. Called by the scroll-to-bottom button. */
  const scrollToBottom = useCallback(
    (smooth = false) => {
      const el = scrollRef.current;
      const v = virtualizerRef.current;
      if (!v || !el || flatItemsLengthRef.current === 0) return;

      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      const useSmooth = smooth && distance < 2000;

      beginProgrammatic(
        useSmooth ? PROGRAMMATIC_SMOOTH_MS : PROGRAMMATIC_INSTANT_MS,
      );
      unreadBaseRef.current = flatItemsLengthRef.current;

      const anchors = userAnchorsRef.current;
      const lastAnchor = anchors[anchors.length - 1];

      patchScroll(sessionId, {
        pinned: true,
        unreadCount: 0,
        isAtBottom: true,
        ...(lastAnchor ? { activeGroupIndex: lastAnchor.groupIndex } : {}),
      });

      if (lastAnchor) {
        lastActiveGroupRef.current = lastAnchor.groupIndex;
      }

      v.scrollToIndex(flatItemsLengthRef.current - 1, {
        align: 'end',
        smooth: useSmooth,
        offset: 48,
      });
    },
    [sessionId, virtualizerRef, scrollRef, patchScroll, beginProgrammatic],
  );

  return { handleScroll, scrollToGroup, scrollToBottom, isReady };
}
