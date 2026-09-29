'use client';

import { TextArea } from '@aero/ui';
import { useState } from 'react';

import { useSaveProjectNotes } from '@/app/hooks/api/project-context';
import { useI18n } from '@/app/hooks/i18n';

export function NotesTab({
  workspaceId,
  notes,
}: {
  workspaceId: string;
  notes: string;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState(notes);
  const save = useSaveProjectNotes(workspaceId);

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <TextArea
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          save.mutate(event.target.value);
        }}
        placeholder={t.notesPanel.notes.placeholder}
        aria-label={t.notesPanel.tabNotes}
        className='scrollbar-thin min-h-0 w-full flex-1 resize-none rounded-none border-0 bg-transparent px-3 py-3 text-sm'
      />

      <div className='border-separator flex shrink-0 items-center justify-end border-t px-3 py-1.5'>
        <span aria-live='polite' className='text-muted text-xs'>
          {save.isPending
            ? t.notesPanel.notes.saving
            : t.notesPanel.notes.saved}
        </span>
      </div>
    </div>
  );
}
