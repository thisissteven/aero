import { Command, Spinner } from '@aero/ui';

export function CommandPaletteLoader({
  id,
  loadMoreRef,
}: {
  id: string;
  loadMoreRef: (node: HTMLElement | null) => void;
}) {
  return (
    <Command.Item
      id={id}
      textValue='__sentinel__'
      ref={loadMoreRef}
      isDisabled
      className='flex h-[36px] items-center justify-center py-2 text-sm aria-selected:bg-transparent'
    >
      <div className='flex items-center justify-center'>
        <Spinner className='text-muted size-4' />
      </div>
    </Command.Item>
  );
}
