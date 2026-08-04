import type { Virtualizer } from '@tanstack/react-virtual';

import { Button, IconChevronDown, Tooltip } from '@aero/ui';

import { useIsAtBottom } from '@/hooks/useIsAtBottom'; // or inline the logic above

interface ScrollToBottomButtonProps {
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  totalCount: number;
  tooltip?: string;
  onClick?: () => void;
}

export function ScrollToBottomButton({
  virtualizer,
  totalCount,
  tooltip,
  onClick,
}: ScrollToBottomButtonProps) {
  const isAtBottom = useIsAtBottom(virtualizer, totalCount);

  // If the last item is visible on screen, hide the button
  if (isAtBottom) return null;

  const handleScrollToBottom = () => {
    if (onClick) {
      onClick();
    } else {
      virtualizer.scrollToIndex(totalCount - 1, {
        align: 'end',
        behavior: 'smooth',
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
}
