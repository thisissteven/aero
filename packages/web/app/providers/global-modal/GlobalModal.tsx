import { Modal } from '@aero/ui';

import {
  useGlobalModalStore,
  useGlobalModalStoreOuter,
} from '@/app/providers/global-modal/global-modal-store';

export function GlobalModal() {
  const isOpen = useGlobalModalStore((state) => state.isOpen);
  const setOpen = useGlobalModalStore((state) => state.setOpen);
  const options = useGlobalModalStore((state) => state.options);

  return (
    <Modal isOpen={isOpen} onOpenChange={setOpen}>
      <Modal.Backdrop
        onWheelCapture={(event) => {
          event.stopPropagation();
        }}
      >
        <Modal.Container>{options.children}</Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export function GlobalModalOuter() {
  const isOpen = useGlobalModalStoreOuter((state) => state.isOpen);
  const setOpen = useGlobalModalStoreOuter((state) => state.setOpen);
  const options = useGlobalModalStoreOuter((state) => state.options);

  return (
    <Modal isOpen={isOpen} onOpenChange={setOpen}>
      <Modal.Backdrop
        onWheelCapture={(event) => {
          event.stopPropagation();
        }}
      >
        <Modal.Container>{options.children}</Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
