'use client';

import { Button, Modal } from '@aero/ui';
import { useI18n } from '@/app/hooks/i18n';

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
  const { t } = useI18n();

  return (
    <Modal.Dialog className='sm:max-w-[360px]'>
      <Modal.CloseTrigger />
      <Modal.Header>
        <Modal.Heading>
          {isDir
            ? t.fileExplorer.deleteFolderTitle
            : t.fileExplorer.deleteFileTitle}
        </Modal.Heading>
      </Modal.Header>
      <Modal.Body>
        {isDir ? (
          <p>{t.fileExplorer.deleteFolderDescription(name)}</p>
        ) : (
          <p>{t.fileExplorer.deleteFileDescription(name)}</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button slot='close' variant='tertiary'>
          {t.common.cancel}
        </Button>
        <Button
          slot='close'
          variant='danger'
          onPress={() => {
            onConfirm();
          }}
        >
          {t.common.delete}
        </Button>
      </Modal.Footer>
    </Modal.Dialog>
  );
}
