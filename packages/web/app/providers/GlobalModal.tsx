import { Gear } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { ReactNode } from 'react';
import { create } from 'zustand';

import { Button, Modal } from '@aero/ui';

const defaultChildren = (
  <Modal.Dialog className='sm:max-w-[360px]'>
    <Modal.CloseTrigger />
    <Modal.Header>
      <Modal.Icon className='bg-accent-soft text-accent-soft-foreground'>
        <Icon className='size-5' data={Gear} />
      </Modal.Icon>
      <Modal.Heading>Settings</Modal.Heading>
    </Modal.Header>
    <Modal.Body>
      <p>
        Use <code>Modal.Trigger</code> to create custom trigger elements beyond
        standard buttons. This example shows a card-style trigger with icons and
        descriptive text.
      </p>
    </Modal.Body>
    <Modal.Footer>
      <Button slot='close' variant='secondary'>
        Cancel
      </Button>
      <Button slot='close'>Save</Button>
    </Modal.Footer>
  </Modal.Dialog>
);

interface ConfirmationStore {
  isOpen: boolean;
  options: {
    children?: ReactNode;
  };
  openModal: (options: { children?: ReactNode }) => void;
  closeModal: () => void;
  toggleOpen: (isOpen: boolean) => void;
}

export const useGlobalModalStore = create<ConfirmationStore>((set) => ({
  isOpen: false,
  options: {
    children: defaultChildren,
  },

  openModal: (options) =>
    set({
      isOpen: true,
      options: {
        children: options.children ?? defaultChildren,
        ...options,
      },
    }),

  closeModal: () =>
    set({
      isOpen: false,
    }),

  toggleOpen: (isOpen) =>
    set({
      isOpen,
    }),
}));

export function GlobalModal() {
  const { isOpen, toggleOpen, options } = useGlobalModalStore();

  return (
    <Modal isOpen={isOpen} onOpenChange={toggleOpen}>
      <Modal.Backdrop>
        <Modal.Container>{options.children}</Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
