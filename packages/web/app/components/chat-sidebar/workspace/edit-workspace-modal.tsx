import {
  ArrowRotateLeft,
  Book,
  Briefcase,
  Camera,
  CircleQuestion,
  Code,
  Database,
  FaceSmile,
  Flask,
  Folder,
  Globe,
  Heart,
  House,
  LayoutCells,
  Plus,
  Rocket,
  Shield,
  Smartphone,
  Terminal,
  Xmark,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import React, { useRef, useState } from 'react';

import {
  Button,
  cn,
  Input,
  Label,
  Modal,
  Separator,
  toast,
  Tooltip,
} from '@aero/ui';

import { WorkspaceModelDropdown } from '@/app/components/chat-sidebar/workspace/workspace-model-dropdown';
import { FolderPicker } from '@/app/components/folder-picker';
import { IconButton } from '@/app/components/ui/icon-button';
import { useDiscoverFavicon } from '@/app/hooks/api/discovery';
import { useUpdateWorkspace } from '@/app/hooks/api/workspaces';
import { useGlobalModalStore, useGlobalModalStoreOuter } from '@/app/providers';
import { AeroWorkspaceSummary } from '@/server/services/harness/types';

export const ACCENT_COLORS_MAP = {
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  foreground: 'var(--foreground)',
  accent: 'var(--accent)',
  'accent-soft-foreground': 'var(--accent-soft-foreground)',
  custom: '#555000',
};

export const ACCENT_COLORS = [
  { id: 'success', bgClass: 'bg-success' },
  { id: 'warning', bgClass: 'bg-warning' },
  { id: 'danger', bgClass: 'bg-danger' },
  { id: 'foreground', bgClass: 'bg-foreground' },
  { id: 'accent', bgClass: 'bg-accent' },
  { id: 'accent-soft-foreground', bgClass: 'bg-accent-soft-foreground' },
] as const;

export const PROJECT_ICON_MAP = {
  code: Code,
  terminal: Terminal,
  rocket: Rocket,
  flask: Flask,
  smile: FaceSmile,
  briefcase: Briefcase,
  house: House,
  globe: Globe,
  shield: Shield,
  layout: LayoutCells,
  smartphone: Smartphone,
  database: Database,
  camera: Camera,
  book: Book,
  heart: Heart,
};

export const PROJECT_ICONS = [
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

// Helper to determine if a string is a custom URI path/data URL
const isCustomUri = (uri: string | null): uri is string => {
  if (!uri) return false;
  return (
    uri.startsWith('data:') ||
    uri.startsWith('http://') ||
    uri.startsWith('https://') ||
    uri.startsWith('/')
  );
};

// Maximum allowed image size for manual upload (256 KB)
const MAX_UPLOAD_SIZE_BYTES = 256 * 1024;

export function EditWorkspaceModal({
  workspace,
  directoryNotFound,
}: {
  workspace: AeroWorkspaceSummary;
  directoryNotFound: boolean;
}) {
  const [name, setName] = useState(workspace.name);
  const [directory, setDirectory] = useState(workspace.directory);
  const [selectedColor, setSelectedColor] = useState<string | null>(
    workspace.selectedColor ?? null,
  );
  const [selectedIcon, setSelectedIcon] = useState<string | null>(
    workspace.selectedIcon ?? null,
  );

  // Dedicated state to hold the uploaded/discovered image URI across selection toggles
  const [customIconUri, setCustomIconUri] = useState<string | null>(
    (isCustomUri(workspace.selectedIcon ?? null) ?? null)
      ? (workspace.selectedIcon ?? null)
      : null,
  );

  const [defaultModel, setDefaultModel] = useState<string | null>(
    workspace.defaultModel ?? null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom hook for discovery query
  const { refetch: discoverFavicon, isFetching: isDiscovering } =
    useDiscoverFavicon(directory, false);

  const { mutateAsync: updateWorkspace, isPending } = useUpdateWorkspace(
    workspace.id,
  );

  // Discover Favicon Handler
  const handleDiscoverFavicon = async () => {
    if (!directory) {
      toast.danger('Directory is required to discover a favicon');
      return;
    }

    try {
      const { data, isError, error } = await discoverFavicon();

      if (isError || !data?.found || !data?.dataUri) {
        toast.danger(error?.message || 'No favicon found in directory');
        return;
      }

      setCustomIconUri(data.dataUri);
      setSelectedIcon(data.dataUri);
      toast.success(`Favicon discovered (${data.fileName})`);
    } catch {
      toast.danger('Failed to discover favicon');
    }
  };

  // Custom Icon File Upload Handler with Size Limit
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.danger('Please upload a valid image file (.png, .svg, .ico, etc.)');
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      toast.danger('Icon file size must be less than 256 KB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result as string;
      if (dataUri) {
        setCustomIconUri(dataUri);
        setSelectedIcon(dataUri);
        toast.success('Custom icon uploaded');
      }
    };
    reader.onerror = () => {
      toast.danger('Failed to read image file');
    };
    reader.readAsDataURL(file);

    // Reset input so re-selecting the same file works if needed
    e.target.value = '';
  };

  const handleSave = () => {
    toast.promise(
      updateWorkspace({
        name,
        selectedColor,
        selectedIcon,
        defaultModel,
        directory,
      }),
      {
        error: 'Failed to save changes',
        loading: 'Saving changes...',
        success: 'Changes saved successfully',
      },
    );
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
          <Label className='font-medium'>Project Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Enter project name'
          />
        </div>

        <div className='flex flex-col gap-2'>
          <Label className='font-medium'>Project Directory</Label>
          <div className='relative flex w-full items-center gap-2'>
            <Input
              value={directory}
              placeholder='Enter project directory'
              className='pointer-events-none w-full opacity-50'
              readOnly
            />
            <IconButton
              onPress={() =>
                useGlobalModalStoreOuter.getState().openModal({
                  children: (
                    <FolderPicker
                      onSelect={(path) => {
                        setDirectory(path);
                      }}
                      onClose={() => {
                        useGlobalModalStoreOuter.getState().closeModal();
                      }}
                    />
                  ),
                })
              }
              isDisabled
              variant='ghost'
              className='text-foreground shrink-0'
            >
              <Icon data={Folder} className='text-foreground' />
            </IconButton>
          </div>
          <span
            className={cn(
              'ml-3.5 text-xs',
              directoryNotFound ? 'text-danger' : 'text-success',
              directory !== workspace.directory && 'text-warning',
            )}
          >
            {directory !== workspace.directory &&
              'Warning: all worktrees associated to the previous directory will be ignored.'}
            {directory === workspace.directory &&
              `Directory status: ${directoryNotFound ? 'not found' : 'valid'}`}
          </span>
        </div>

        <Separator />

        <div className='flex flex-col gap-4'>
          {/* Defaults for new chats */}
          <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-1.5 font-medium'>
              <Label>Defaults for new chats</Label>
              <Tooltip>
                <Tooltip.Trigger className='inline-flex cursor-pointer'>
                  <Icon data={CircleQuestion} size={16} />
                </Tooltip.Trigger>
                <Tooltip.Content className='break-normal'>
                  Default AI settings for new conversations in this workspace
                </Tooltip.Content>
              </Tooltip>
            </div>
            <div className='flex flex-col gap-2'>
              <Label>Project Model</Label>

              <div className='relative flex w-full items-center gap-2'>
                <WorkspaceModelDropdown
                  value={defaultModel}
                  onChange={(model) => setDefaultModel(model)}
                />
                <IconButton
                  onPress={() => setDefaultModel(null)}
                  variant='ghost'
                  className='text-foreground shrink-0'
                >
                  <Icon data={ArrowRotateLeft} className='text-foreground' />
                </IconButton>
              </div>
            </div>
          </div>

          {/* Accent Color */}
          <div className='flex flex-col gap-3'>
            <Label className='font-medium'>Accent Color</Label>
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
                  className={cn(
                    'rounded-full',
                    bgClass,
                    selectedColor === id &&
                      'ring-accent ring-offset-surface ring ring-2 ring-offset-2',
                  )}
                  onPress={() => setSelectedColor(id)}
                />
              ))}
            </div>
          </div>

          {/* Project Icon */}
          <div className='flex flex-col gap-3'>
            <Label className='font-medium'>Project Icon</Label>
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
                <button
                  key={id}
                  type='button'
                  onClick={() => setSelectedIcon(id)}
                  className={cn(
                    'rounded-full p-2 transition-colors',
                    selectedIcon === id
                      ? 'bg-accent text-background'
                      : 'text-foreground hover:bg-muted/50 bg-transparent',
                  )}
                >
                  <Icon data={icon} size={16} />
                </button>
              ))}

              {/* Custom Icon Button - Persists once uploaded/discovered */}
              {customIconUri && (
                <button
                  type='button'
                  onClick={() => setSelectedIcon(customIconUri)}
                  className={cn(
                    'flex items-center justify-center rounded-full p-2 transition-all',
                    selectedIcon === customIconUri
                      ? 'ring-accent ring-2'
                      : 'hover:bg-muted/50 text-foreground bg-transparent',
                  )}
                >
                  <img
                    src={customIconUri}
                    alt='Custom workspace icon'
                    className='h-4 w-4 object-contain'
                  />
                </button>
              )}
            </div>

            {/* Hidden File Input for Icon Upload */}
            <input
              type='file'
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept='image/*'
              className='hidden'
            />

            <div className='mt-1 flex items-center gap-2'>
              <Button
                size='sm'
                variant='secondary'
                onPress={() => fileInputRef.current?.click()}
              >
                Upload icon
              </Button>
              <Button
                size='sm'
                variant='secondary'
                isPending={isDiscovering}
                onPress={handleDiscoverFavicon}
              >
                Discover favicon
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className='flex flex-col gap-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-1.5 font-medium'>
              <Label>Actions</Label>
              <Tooltip>
                <Tooltip.Trigger>
                  <Icon data={CircleQuestion} size={16} />
                </Tooltip.Trigger>
                <Tooltip.Content>
                  Custom automated workflows for this workspace
                </Tooltip.Content>
              </Tooltip>
            </div>
            <Button size='sm' variant='secondary'>
              <Icon data={Plus} size={16} />
              <span>Add action</span>
            </Button>
          </div>
          <p>No actions configured yet.</p>
        </div>
      </Modal.Body>

      <Modal.Footer className='px-6 sm:px-7'>
        <Button
          variant='ghost'
          size='sm'
          onPress={() => useGlobalModalStore.getState().closeModal()}
        >
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
