import { ReactNode } from 'react';

import { Command } from '@aero/ui';

import { useCommandPaletteStore } from '@/app/components/command-palette/command-palette-store';

export function CommandPaletteContainer({ children }: { children: ReactNode }) {
  const isOpen = useCommandPaletteStore((state) => state.isOpen);
  const setIsOpen = useCommandPaletteStore((state) => state.setIsOpen);

  return (
    <Command.Backdrop isOpen={isOpen} onOpenChange={setIsOpen}>
      <Command.Container size='lg'>{children}</Command.Container>
    </Command.Backdrop>
  );
}
