import { useCallback, useEffect, useMemo, useRef } from 'react';

export interface InfiniteQueryLike<TItem> {
  data: { pages: Array<{ items: TItem[] }> } | undefined;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean | undefined;
  fetchNextPage: () => void;
}

export interface UseInfiniteScrollOptions {
  limitWithoutSearch?: number;
  search?: string;
  threshold?: number;
  rootRef?: React.RefObject<HTMLElement | null>;
}

export function useInfiniteScroll<TItem extends { id: string }>(
  infiniteQuery: InfiniteQueryLike<TItem>,
  options: UseInfiniteScrollOptions = {},
) {
  const { limitWithoutSearch, search, threshold = 0.1, rootRef } = options;
  const { data, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } =
    infiniteQuery;

  const observerRef = useRef<IntersectionObserver | null>(null);
  const currentSentinelRef = useRef<HTMLElement | null>(null);

  const stateRef = useRef({
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    search,
    limitWithoutSearch,
    fetchNextPage,
  });

  stateRef.current = {
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    search,
    limitWithoutSearch,
    fetchNextPage,
  };

  const triggerFetchIfValid = useCallback((isIntersecting: boolean) => {
    const s = stateRef.current;
    if (s.limitWithoutSearch && !s.search) return;

    if (
      isIntersecting &&
      s.hasNextPage &&
      !s.isFetching &&
      !s.isFetchingNextPage
    ) {
      s.fetchNextPage();
    }
  }, []);

  // Callback Ref: Fires immediately when the DOM node is rendered by React Aria
  const loadMoreRef = useCallback(
    (node: HTMLElement | null) => {
      // Clean up previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      currentSentinelRef.current = node;

      if (!node) return;

      const root = rootRef?.current ?? null;

      const observer = new IntersectionObserver(
        ([entry]) => {
          triggerFetchIfValid(entry.isIntersecting);
        },
        { root, threshold },
      );

      observer.observe(node);
      observerRef.current = observer;
    },
    [rootRef, threshold, triggerFetchIfValid],
  );

  // Manual fallback check when fetch finishes
  useEffect(() => {
    if (isFetching || isFetchingNextPage) return;

    const target = currentSentinelRef.current;
    if (!target) return;

    const root = rootRef?.current;
    const targetRect = target.getBoundingClientRect();
    const rootRect = root
      ? root.getBoundingClientRect()
      : {
          top: 0,
          bottom: window.innerHeight,
          left: 0,
          right: window.innerWidth,
        };

    const isVisibleInContainer =
      targetRect.top < rootRect.bottom &&
      targetRect.bottom >= rootRect.top &&
      targetRect.left < rootRect.right &&
      targetRect.right >= rootRect.left;

    triggerFetchIfValid(isVisibleInContainer);
  }, [isFetching, isFetchingNextPage, data, rootRef, triggerFetchIfValid]);

  // Clean up observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const allItems = useMemo<TItem[]>(() => {
    const rawItems = data?.pages.flatMap((page) => page.items) ?? [];
    const itemMap = new Map<string, TItem>();

    for (const item of rawItems) {
      if (item && item.id) {
        itemMap.set(item.id, item);
      }
    }

    return Array.from(itemMap.values());
  }, [data]);

  const items = useMemo(() => {
    if (!search && limitWithoutSearch) {
      return allItems.slice(0, limitWithoutSearch);
    }
    return allItems;
  }, [allItems, search, limitWithoutSearch]);

  const shouldEnableInfiniteScroll =
    (!limitWithoutSearch || Boolean(search)) && Boolean(hasNextPage);

  return {
    items,
    loadMoreRef,
    hasNextPage: shouldEnableInfiniteScroll,
    isFetchingNextPage,
  };
}
