import { Button, Modal } from '@aero/ui';
import { Gear } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { ReactNode } from 'react';
import { create, StateCreator } from 'zustand';

import { useI18n } from '@/app/hooks/i18n';

interface GlobalModalState {
  isOpen: boolean;
  options: {
    children?: ReactNode;
  };
  openModal: (options: { children?: ReactNode }) => void;
  closeModal: () => void;
  setOpen: (isOpen: boolean) => void;
  toggleOpen: (options: { children?: ReactNode }) => void;
}

function DefaultModalContent() {
  const { t } = useI18n();

  return (
    <Modal.Dialog className='sm:max-w-[360px]'>
      <Modal.CloseTrigger />
      <Modal.Header>
        <Modal.Icon className='bg-accent-soft text-accent-soft-foreground'>
          <Icon className='size-5' data={Gear} />
        </Modal.Icon>
        <Modal.Heading>{t.common.settings}</Modal.Heading>
      </Modal.Header>
      <Modal.Body>
        <p>{t.devMisc.customTriggerDescription('Modal.Trigger')}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button slot='close' variant='secondary'>
          {t.common.cancel}
        </Button>
        <Button slot='close'>{t.common.save}</Button>
      </Modal.Footer>
    </Modal.Dialog>
  );
}

const defaultChildren = <DefaultModalContent />;

const globalModalSlice: StateCreator<GlobalModalState> = (set) => ({
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

  toggleOpen: (options) =>
    set((state) => ({
      isOpen: !state.isOpen,
      options: {
        children: options.children ?? defaultChildren,
        ...options,
      },
    })),

  closeModal: () =>
    set({
      isOpen: false,
    }),

  setOpen: (isOpen) =>
    set({
      isOpen,
    }),
});

export const useGlobalModalStore = create<GlobalModalState>(globalModalSlice);
export const useGlobalModalStoreOuter =
  create<GlobalModalState>(globalModalSlice);
