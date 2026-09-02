import {
  Book,
  Briefcase,
  Camera,
  CircleQuestion,
  Code,
  Database,
  FaceSmile,
  Flask,
  Globe,
  Heart,
  House,
  LayoutCells,
  Plus,
  Rocket,
  Shield,
  Smartphone,
  Sparkles,
  Terminal,
  Xmark,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import React, { useState } from 'react';

import {
  Button,
  Input,
  ListBox,
  Modal,
  Select,
  Separator,
  Tooltip,
} from '@aero/ui';

import { useUpdateWorkspace } from '@/app/hooks/api/workspaces';
import { AeroWorkspaceSummary } from '@/server/services/harness/types';

const ACCENT_COLORS = [
  { id: 'success', bgClass: 'bg-success' },
  { id: 'warning', bgClass: 'bg-warning' },
  { id: 'danger', bgClass: 'bg-danger' },
  { id: 'foreground', bgClass: 'bg-foreground' },
  { id: 'accent', bgClass: 'bg-accent' },
  { id: 'accent-soft-foreground', bgClass: 'bg-accent-soft-foreground' },
] as const;

const PROJECT_ICONS = [
  { id: 'code', icon: Code },
  { id: 'terminal', icon: Terminal },
  { id: 'rocket', icon: Rocket },
  { id: 'flask', icon: Flask },
  { id: 'smile', icon: FaceSmile },
  { id: 'briefcase', icon: Briefcase },
  { id: 'house', icon: House },
  { id: 'globe', icon: Globe },
  { id: 'shield', icon: Shield },
  { id: 'layout', icon: LayoutCells },
  { id: 'smartphone', icon: Smartphone },
  { id: 'database', icon: Database },
  { id: 'camera', icon: Camera },
  { id: 'book', icon: Book },
  { id: 'heart', icon: Heart },
];

export function EditWorkspaceModal({
  workspace,
}: {
  workspace: AeroWorkspaceSummary;
}) {
  const [name, setName] = useState(workspace.name);
  const [selectedColor, setSelectedColor] = useState<string | null>(
    workspace.selectedColor ?? null,
  );
  const [selectedIcon, setSelectedIcon] = useState<string | null>(
    workspace.selectedIcon ?? null,
  );
  const [defaultModel, setDefaultModel] = useState<string | null>(
    workspace.defaultModel ?? null,
  );

  const { mutateAsync: updateWorkspace, isPending } = useUpdateWorkspace(
    workspace.id,
  );

  const handleSave = async () => {
    await updateWorkspace({
      name,
      selectedColor,
      selectedIcon,
      defaultModel,
    });
  };

  return (
    <Modal.Dialog className='px-0 sm:max-w-[480px] lg:max-w-[560px]'>
      <Modal.CloseTrigger />
      <Modal.Header className='px-4 sm:px-5'>
        <Modal.Heading>Edit Workspace</Modal.Heading>
      </Modal.Header>

      <Modal.Body className='flex flex-col gap-5 px-5 sm:px-6'>
        {/* Project Name */}
        <div className='flex flex-col gap-2'>
          <label className='text-small font-medium'>Project Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Enter project name'
          />
        </div>

        <Separator />

        {/* Defaults for new chats */}
        <div className='flex flex-col gap-3'>
          <div className='text-small flex items-center gap-1.5 font-medium'>
            <span>Defaults for new chats</span>
            <Tooltip>
              <Tooltip.Trigger>
                <button
                  type='button'
                  className='text-default-400 inline-flex cursor-pointer'
                >
                  <Icon data={CircleQuestion} size={16} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <Tooltip.Arrow />
                Default AI settings for new conversations in this workspace
              </Tooltip.Content>
            </Tooltip>
          </div>
          <div className='flex flex-col gap-2'>
            <label className='text-tiny text-default-500'>Project Model</label>
            <Select
              value={defaultModel}
              onChange={(val) => setDefaultModel((val as string) || null)}
              placeholder='Not selected'
            >
              <Select.Trigger className='w-full'>
                <div className='flex items-center gap-2'>
                  <Icon
                    data={Sparkles}
                    size={16}
                    className='text-default-400'
                  />
                  <Select.Value />
                </div>
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id='gpt-4o'>GPT-4o</ListBox.Item>
                  <ListBox.Item id='claude-3-5'>Claude 3.5 Sonnet</ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Accent Color */}
        <div className='flex flex-col gap-3'>
          <label className='text-small font-medium'>Accent Color</label>
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              isIconOnly
              size='sm'
              variant={selectedColor === null ? 'primary' : 'outline'}
              onPress={() => setSelectedColor(null)}
            >
              <Icon data={Xmark} size={16} />
            </Button>
            {ACCENT_COLORS.map(({ id, bgClass }) => (
              <Button
                key={id}
                isIconOnly
                size='sm'
                variant={selectedColor === id ? 'primary' : 'ghost'}
                className={`rounded-full ${bgClass}`}
                onPress={() => setSelectedColor(id)}
              />
            ))}
          </div>
        </div>

        <Separator />

        {/* Project Icon */}
        <div className='flex flex-col gap-3'>
          <label className='text-small font-medium'>Project Icon</label>
          <div className='flex flex-wrap items-center gap-1.5'>
            <Button
              isIconOnly
              size='sm'
              variant={selectedIcon === null ? 'primary' : 'outline'}
              onPress={() => setSelectedIcon(null)}
            >
              <Icon data={Xmark} size={16} />
            </Button>
            {PROJECT_ICONS.map(({ id, icon }) => (
              <Button
                key={id}
                isIconOnly
                size='sm'
                variant={selectedIcon === id ? 'primary' : 'ghost'}
                onPress={() => setSelectedIcon(id)}
              >
                <Icon data={icon} size={16} />
              </Button>
            ))}
          </div>

          <div className='mt-1 flex items-center gap-2'>
            <Button size='sm' variant='secondary'>
              Upload icon
            </Button>
            <Button size='sm' variant='secondary'>
              Discover favicon
            </Button>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className='flex flex-col gap-3'>
          <div className='flex items-center justify-between'>
            <div className='text-small flex items-center gap-1.5 font-medium'>
              <span>Actions</span>
              <Tooltip>
                <Tooltip.Trigger>
                  <button
                    type='button'
                    className='text-default-400 inline-flex cursor-pointer'
                  >
                    <Icon data={CircleQuestion} size={16} />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <Tooltip.Arrow />
                  Custom automated workflows for this workspace
                </Tooltip.Content>
              </Tooltip>
            </div>
            <Button size='sm' variant='secondary'>
              <Icon data={Plus} size={16} />
              <span>Add action</span>
            </Button>
          </div>
          <p className='text-tiny text-default-400'>
            No actions configured yet.
          </p>
        </div>
      </Modal.Body>

      <Modal.Footer className='px-6 sm:px-7'>
        <Button variant='ghost' size='sm'>
          Cancel
        </Button>
        <Button
          variant='primary'
          size='sm'
          isPending={isPending}
          onPress={handleSave}
        >
          Save Changes
        </Button>
      </Modal.Footer>
    </Modal.Dialog>
  );
}
