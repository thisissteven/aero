import type { Virtualizer } from '@tanstack/react-virtual';
import { memo } from 'react';

import { Button, IconChevronDown, Tooltip } from '@aero/ui';

import { useIsAtBottom } from '@/app/hooks/useIsAtBottom'; // or inline the logic above

interface ScrollToBottomButtonProps {
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  totalCount: number;
  tooltip?: string;
  onClick?: () => void;
}

export const ScrollToBottomButton = memo(function ScrollToBottomButton({
  virtualizer,
  totalCount,
  tooltip,
  onClick,
}: ScrollToBottomButtonProps) {
  const isAtBottom = useIsAtBottom(virtualizer, 0);

  // If the last item is visible on screen, hide the button
  if (isAtBottom) return null;

  const handleScrollToBottom = () => {
    if (onClick) {
      onClick();
    } else {
      const lastIndex = totalCount - 1;
      const visibleItems = virtualizer.getVirtualItems();

      // Get the index of the last visible element on screen (fallback to 0 if empty)
      const currentBottomIndex = visibleItems.at(-1)?.index ?? 0;

      // Check if distance is less than 5 items
      const isClose = lastIndex - currentBottomIndex < 5;

      virtualizer.scrollToIndex(lastIndex, {
        align: 'end',
        behavior: isClose ? 'smooth' : 'auto',
      });
    }
  };

  const buttonElement = (
    <Button
      isIconOnly
      size='sm'
      variant='secondary'
      aria-label='Scroll to bottom'
      className='shadow-md transition-all duration-200'
      onPress={handleScrollToBottom}
    >
      <IconChevronDown className='text-foreground size-4' />
    </Button>
  );

  return tooltip ? (
    <Tooltip delay={0}>
      <Tooltip.Trigger>{buttonElement}</Tooltip.Trigger>
      <Tooltip.Content>{tooltip}</Tooltip.Content>
    </Tooltip>
  ) : (
    buttonElement
  );
});
