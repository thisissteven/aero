import { Input, Label } from '@aero/ui';

import { useEditWorkspaceStore } from './edit-workspace-store';

export function EditWorkspaceNameInput() {
  const name = useEditWorkspaceStore((s) => s.name);
  const setName = useEditWorkspaceStore((s) => s.setName);

  return (
    <div className='flex flex-col gap-2'>
      <Label className='font-medium'>Project Name</Label>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder='Enter project name'
      />
    </div>
  );
}
