'use client';

import { Button, Modal } from '@aero/ui';

export interface DeletePathConfirmationModalProps {
  path: string;
  isDir: boolean;
  /** Called after the user confirms. Fires the delete. */
  onConfirm: () => void;
}

function getDisplayName(path: string): string {
  const trimmed = path.endsWith('/') ? path.slice(0, -1) : path;
  return trimmed.split('/').pop() || trimmed;
}

export function DeletePathConfirmationModal({
  path,
  isDir,
  onConfirm,
}: DeletePathConfirmationModalProps) {
  const name = getDisplayName(path);

  return (
    <Modal.Dialog className='sm:max-w-[360px]'>
      <Modal.CloseTrigger />
      <Modal.Header>
        <Modal.Heading>Delete {isDir ? 'folder' : 'file'}?</Modal.Heading>
      </Modal.Header>
      <Modal.Body>
        {isDir ? (
          <p>
            <span className='text-foreground font-medium'>{name}</span> and
            everything inside it will be permanently deleted.
          </p>
        ) : (
          <p>
            <span className='text-foreground font-medium'>{name}</span> will be
            permanently deleted.
          </p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button slot='close' variant='tertiary'>
          Cancel
        </Button>
        <Button
          slot='close'
          variant='danger'
          onPress={() => {
            onConfirm();
          }}
        >
          Delete
        </Button>
      </Modal.Footer>
    </Modal.Dialog>
  );
}
