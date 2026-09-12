import { useScrollController } from '@/app/components/scroll-to-bottom/use-scroll-controller';

export function useScrollToBottom() {
  return useScrollController((state) => state.scrollToBottom);
}
