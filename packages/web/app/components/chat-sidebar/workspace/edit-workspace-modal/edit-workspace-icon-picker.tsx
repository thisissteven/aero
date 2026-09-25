import { Button, cn, Label, toast } from '@aero/ui';
import { Xmark } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useRef } from 'react';

import { useDiscoverFavicon } from '@/app/hooks/api/discovery';
import { useI18n } from '@/app/hooks/i18n';

import { PROJECT_ICONS } from './edit-workspace-constants';
import { useEditWorkspaceStore } from './edit-workspace-store';

const MAX_UPLOAD_SIZE_BYTES = 256 * 1024;

export function EditWorkspaceIconPicker() {
  const directory = useEditWorkspaceStore((s) => s.directory);
  const selectedIcon = useEditWorkspaceStore((s) => s.selectedIcon);
  const customIconUri = useEditWorkspaceStore((s) => s.customIconUri);
  const setSelectedIcon = useEditWorkspaceStore((s) => s.setSelectedIcon);
  const setCustomIconUri = useEditWorkspaceStore((s) => s.setCustomIconUri);

  const { t } = useI18n();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { refetch: discoverFavicon, isFetching: isDiscovering } =
    useDiscoverFavicon(directory, false);

  const handleDiscoverFavicon = async () => {
    if (!directory) {
      toast.danger(t.editWorkspace.directoryRequiredForFavicon);
      return;
    }

    try {
      const { data, isError, error } = await discoverFavicon();

      if (isError || !data?.found || !data?.dataUri) {
        toast.danger(error?.message || t.editWorkspace.noFaviconFound);
        return;
      }

      setCustomIconUri(data.dataUri);
      setSelectedIcon(data.dataUri);
      toast.success(t.editWorkspace.faviconDiscovered(data.fileName));
    } catch {
      toast.danger(t.editWorkspace.failedToDiscoverFavicon);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.danger(t.editWorkspace.uploadValidImage);
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      toast.danger(t.editWorkspace.iconTooLarge);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result as string;
      if (dataUri) {
        setCustomIconUri(dataUri);
        setSelectedIcon(dataUri);
        toast.success(t.editWorkspace.customIconUploaded);
      }
    };
    reader.onerror = () => {
      toast.danger(t.editWorkspace.failedToReadImage);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className='flex flex-col gap-3'>
      <Label className='font-medium'>{t.editWorkspace.projectIcon}</Label>
      <div className='flex flex-wrap items-center gap-1.5'>
        <Button
          isIconOnly
          size='sm'
          variant={selectedIcon === null ? 'primary' : 'outline'}
          onPress={() => setSelectedIcon(null)}
          className='rounded-lg'
        >
          <Icon data={Xmark} size={16} />
        </Button>

        {PROJECT_ICONS.map(({ id, icon }) => (
          <button
            key={id}
            type='button'
            onClick={() => setSelectedIcon(id)}
            className={cn(
              'rounded-lg p-2 transition-colors',
              selectedIcon === id
                ? 'bg-accent text-background'
                : 'text-foreground hover:bg-muted/50 bg-transparent',
            )}
          >
            <Icon data={icon} size={16} />
          </button>
        ))}

        {customIconUri && (
          <button
            type='button'
            onClick={() => setSelectedIcon(customIconUri)}
            className={cn(
              'flex items-center justify-center rounded-lg p-2 transition-all',
              selectedIcon === customIconUri
                ? 'ring-accent ring-2'
                : 'hover:bg-muted/50 text-foreground bg-transparent',
            )}
          >
            <img
              src={customIconUri}
              alt={t.editWorkspace.customWorkspaceIcon}
              className='h-4 w-4 object-contain'
            />
          </button>
        )}
      </div>

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
          className='rounded-lg'
        >
          {t.editWorkspace.uploadIcon}
        </Button>
        <Button
          size='sm'
          variant='secondary'
          isPending={isDiscovering}
          onPress={handleDiscoverFavicon}
          className='rounded-lg'
        >
          {t.editWorkspace.discoverFavicon}
        </Button>
      </div>
    </div>
  );
}
