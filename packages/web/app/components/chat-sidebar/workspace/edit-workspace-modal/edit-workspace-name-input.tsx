import { Input, Label } from '@aero/ui';

import { useI18n } from '@/app/hooks/i18n';
import { useEditWorkspaceStore } from './edit-workspace-store';

export function EditWorkspaceNameInput() {
  const name = useEditWorkspaceStore((s) => s.name);
  const setName = useEditWorkspaceStore((s) => s.setName);

  const { t } = useI18n();

  return (
    <div className='flex flex-col gap-2'>
      <Label className='font-medium'>{t.editWorkspace.projectName}</Label>
      <Input
        variant='secondary'
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t.editWorkspace.projectNamePlaceholder}
      />
    </div>
  );
}
