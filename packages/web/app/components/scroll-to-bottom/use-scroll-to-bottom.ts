import {
  useMainScrollController,
  useSideScrollController,
} from '@/app/components/scroll-to-bottom/use-scroll-controller';

export function useScrollToBottom(type: 'main' | 'side') {
  if (type === 'main')
    return useMainScrollController((state) => state.scrollToBottom);
  return useSideScrollController((state) => state.scrollToBottom);
}
