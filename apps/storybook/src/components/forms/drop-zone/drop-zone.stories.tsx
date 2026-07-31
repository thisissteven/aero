import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState } from 'react';

import {
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Loading03Icon,
} from '@aero/ui/icons';
import { HugeiconsIcon } from '@aero/ui/icons';

import { Button } from '@/components/buttons/button';
import { Link } from '@/components/navigation/link';

import { Icon } from '@/icon';

import { DropZone, useDropZone } from './index';

const meta = {
  component: DropZone,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Forms/DropZone',
} satisfies Meta<typeof DropZone>;
export default meta;
type Story = StoryObj<typeof meta>;

type Upload = {
  id: string;
  name: string;
  progress: number;
  size: number;
  status: 'complete' | 'failed' | 'uploading';
};

const formatSize = (size: number) =>
  size < 1024
    ? `${size} B`
    : size < 1024 * 1024
      ? `${(size / 1024).toFixed(0)} KB`
      : `${(size / (1024 * 1024)).toFixed(1)} MB`;
const extension = (name: string) =>
  name.split('.').pop()?.toUpperCase() ?? 'FILE';
const colorFor = (format: string) =>
  ({
    PDF: 'red',
    PNG: 'green',
    JPG: 'blue',
    DOCX: 'blue',
    SVG: 'green',
    MP4: 'purple',
    ZIP: 'orange',
  })[format] ?? 'gray';

function FileList({
  files,
  onRemove,
  onRetry,
  showProgress = true,
  statusFormat = 'percent',
}: {
  files: Upload[];
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
  showProgress?: boolean;
  statusFormat?: 'label' | 'percent';
}) {
  return (
    <DropZone.FileList>
      {files.map((file) => {
        const format = extension(file.name);
        return (
          <DropZone.FileItem key={file.id} status={file.status}>
            <DropZone.FileFormatIcon
              color={
                colorFor(format) as
                  'blue' | 'gray' | 'green' | 'orange' | 'purple' | 'red'
              }
              format={format}
            />
            <DropZone.FileInfo>
              <DropZone.FileName>{file.name}</DropZone.FileName>
              <DropZone.FileMeta>
                {formatSize(file.size)}
                {statusFormat === 'label' ? (
                  file.status === 'uploading' ? (
                    ' | Uploading...'
                  ) : (
                    <div className='flex items-center gap-1'>
                      {' | '}
                      <HugeiconsIcon
                        aria-hidden
                        className={
                          file.status === 'complete'
                            ? 'text-success inline size-3'
                            : 'text-danger inline size-3'
                        }
                        icon={
                          file.status === 'complete'
                            ? CheckmarkCircle02Icon
                            : CancelCircleIcon
                        }
                        size={12}
                      />
                      {file.status === 'complete' ? (
                        ' Complete'
                      ) : (
                        <span className='text-danger'>Failed</span>
                      )}
                    </div>
                  )
                ) : file.status === 'failed' ? null : (
                  <>
                    {' | '}
                    <HugeiconsIcon
                      aria-hidden
                      className={
                        file.status === 'complete'
                          ? 'text-success inline size-3 align-[-1px]'
                          : 'inline size-3 animate-spin align-[-1px]'
                      }
                      icon={
                        file.status === 'complete'
                          ? CheckmarkCircle02Icon
                          : Loading03Icon
                      }
                      size={12}
                    />{' '}
                    {file.status === 'uploading' ? file.progress : 100}%
                  </>
                )}
              </DropZone.FileMeta>
              {showProgress && file.status !== 'failed' ? (
                <DropZone.FileProgress value={file.progress}>
                  <DropZone.FileProgressTrack>
                    <DropZone.FileProgressFill />
                  </DropZone.FileProgressTrack>
                </DropZone.FileProgress>
              ) : file.status === 'failed' && statusFormat === 'percent' ? (
                <>
                  <DropZone.FileMeta>
                    Something went wrong, please retry
                  </DropZone.FileMeta>
                  <Button
                    className='mt-2 -ml-1'
                    size='sm'
                    variant='danger-soft'
                    onPress={() => onRetry?.(file.id)}
                  >
                    Try again
                  </Button>
                </>
              ) : file.status === 'failed' ? (
                <Button
                  className='mt-2 -ml-1'
                  size='sm'
                  variant='danger-soft'
                  onPress={() => onRetry?.(file.id)}
                >
                  Try again
                </Button>
              ) : null}
            </DropZone.FileInfo>
            <DropZone.FileRemoveTrigger
              aria-label={`Remove ${file.name}`}
              onPress={() => onRemove(file.id)}
            />
          </DropZone.FileItem>
        );
      })}
    </DropZone.FileList>
  );
}

function UploadDemo({
  accept,
  label = 'Drag files here or click to browse',
  multiple = false,
}: {
  accept?: string;
  label?: string;
  multiple?: boolean;
}) {
  const [files, setFiles] = useState<Upload[]>([]);
  const add = (selected: FileList) =>
    setFiles((current) => [
      ...Array.from(selected).map((file, index) => ({
        id: `${Date.now()}-${index}`,
        name: file.name,
        progress: 100,
        size: file.size,
        status: 'complete' as const,
      })),
      ...current,
    ]);
  return (
    <DropZone className={multiple ? 'w-[480px]' : 'w-[420px]'}>
      <DropZone.Area>
        <DropZone.Icon />
        <DropZone.Label>{label}</DropZone.Label>
        <DropZone.Description>
          {multiple
            ? 'All formats welcome, 50 MB max per file.'
            : 'Supports JPEG, PNG, PDF, and MP4 up to 50 MB.'}
        </DropZone.Description>
        <DropZone.Trigger>
          {multiple ? 'Choose Files' : 'Select File'}
        </DropZone.Trigger>
      </DropZone.Area>
      <DropZone.Input accept={accept} multiple={multiple} onSelect={add} />
      {files.length ? (
        <FileList
          files={files}
          onRemove={(id) =>
            setFiles((all) => all.filter((file) => file.id !== id))
          }
          onRetry={(id) =>
            setFiles((all) =>
              all.map((file) =>
                file.id === id
                  ? { ...file, progress: 0, status: 'uploading' }
                  : file,
              ),
            )
          }
        />
      ) : null}
    </DropZone>
  );
}

export const Default: Story = { render: () => <UploadDemo /> };

const initialFiles: Upload[] = [
  {
    id: '1',
    name: 'Logo dark.svg',
    progress: 100,
    size: 24576,
    status: 'complete',
  },
  {
    id: '2',
    name: 'Meeting notes.docx',
    progress: 68,
    size: 358400,
    status: 'uploading',
  },
  {
    id: '3',
    name: 'Demo recording.mp4',
    progress: 18,
    size: 5242880,
    status: 'failed',
  },
];
const projectFiles: Upload[] = [
  {
    id: 'annual-report',
    name: 'Annual report 2025.pdf',
    progress: 100,
    size: 2.2 * 1024 * 1024,
    status: 'complete',
  },
  {
    id: 'hero-banner',
    name: 'Hero banner.png',
    progress: 42,
    size: 480 * 1024,
    status: 'uploading',
  },
  {
    id: 'onboarding-flow',
    name: 'Onboarding flow.mp4',
    progress: 0,
    size: 8 * 1024 * 1024,
    status: 'failed',
  },
];

export const WithFileList: Story = {
  render: function Demo() {
    const [files, setFiles] = useState(projectFiles);
    useEffect(() => {
      const timer = window.setInterval(() => {
        setFiles((current) =>
          current.map((file) => {
            if (file.status !== 'uploading') return file;
            const progress = Math.min(file.progress + 5, 100);
            return {
              ...file,
              progress,
              status: progress === 100 ? 'complete' : 'uploading',
            };
          }),
        );
      }, 200);
      return () => window.clearInterval(timer);
    }, []);
    return (
      <DropZone className='w-[480px]'>
        <DropZone.Area>
          <DropZone.Icon />
          <DropZone.Label>Upload project assets</DropZone.Label>
          <DropZone.Description>
            Documents, images, or videos up to 10 MB each.
          </DropZone.Description>
          <DropZone.Trigger>Add Files</DropZone.Trigger>
        </DropZone.Area>
        <DropZone.Input multiple />
        <FileList
          files={files}
          statusFormat='label'
          onRemove={(id) =>
            setFiles((all) => all.filter((file) => file.id !== id))
          }
          onRetry={(id) =>
            setFiles((all) =>
              all.map((file) =>
                file.id === id
                  ? { ...file, progress: 0, status: 'uploading' }
                  : file,
              ),
            )
          }
        />
      </DropZone>
    );
  },
};

export const ImageOnly: Story = {
  render: () => (
    <DropZone className='w-[420px]'>
      <DropZone.Area
        getDropOperation={(types) =>
          [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml',
          ].some((type) => types.has(type))
            ? 'copy'
            : 'cancel'
        }
      >
        <DropZone.Icon>
          <Icon icon='solar:gallery-outline' />
        </DropZone.Icon>
        <DropZone.Label>Drop your images here</DropZone.Label>
        <DropZone.Description>
          Accepts PNG, JPG, GIF, WebP, and SVG.
        </DropZone.Description>
        <DropZone.Trigger>Select Images</DropZone.Trigger>
      </DropZone.Area>
      <DropZone.Input accept='image/*' />
    </DropZone>
  ),
};

export const MaxSizeLimit: Story = {
  render: function Demo() {
    const [error, setError] = useState<string | null>(null);
    return (
      <DropZone className='w-[420px]'>
        <DropZone.Area>
          <DropZone.Icon />
          <DropZone.Label>Attach files (5 MB limit per file)</DropZone.Label>
          <DropZone.Description>
            Any file type accepted. Files over 5 MB will be rejected.
          </DropZone.Description>
          <DropZone.Trigger>Select Files</DropZone.Trigger>
        </DropZone.Area>
        <DropZone.Input
          multiple
          onSelect={(files) => {
            const rejected = Array.from(files).filter(
              (file) => file.size > 5 * 1024 * 1024,
            );
            setError(
              rejected.length
                ? `Rejected (over 5 MB): ${rejected.map((file) => file.name).join(', ')}`
                : null,
            );
          }}
        />
        {error ? <p className='text-danger m-0 text-[13px]'>{error}</p> : null}
      </DropZone>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <DropZone className='w-[420px]'>
      <DropZone.Area isDisabled>
        <DropZone.Icon />
        <DropZone.Label>File upload unavailable</DropZone.Label>
        <DropZone.Description>
          Uploads are temporarily disabled.
        </DropZone.Description>
        <DropZone.Trigger isDisabled>Select File</DropZone.Trigger>
      </DropZone.Area>
      <DropZone.Input />
    </DropZone>
  ),
};

export const MultipleFiles: Story = {
  render: () => <UploadDemo multiple label='Add multiple attachments' />,
};

export const CompactFileList: Story = {
  render: function Demo() {
    const [files, setFiles] = useState(initialFiles);
    return (
      <DropZone className='w-[480px]'>
        <FileList
          files={files}
          showProgress={false}
          onRemove={(id) =>
            setFiles((all) => all.filter((file) => file.id !== id))
          }
        />
      </DropZone>
    );
  },
};

export const CustomIcon: Story = {
  render: () => (
    <DropZone className='w-[420px]'>
      <DropZone.Area>
        <DropZone.Icon>
          <Icon icon='solar:gallery-outline' />
        </DropZone.Icon>
        <DropZone.Label>Set your profile photo</DropZone.Label>
        <DropZone.Description>
          PNG or JPG under 2 MB. Best at 400 x 400 px.
        </DropZone.Description>
        <DropZone.Trigger>Pick Image</DropZone.Trigger>
      </DropZone.Area>
      <DropZone.Input accept='image/png,image/jpeg' />
    </DropZone>
  ),
};

function CustomButtons({
  kind,
}: {
  kind: 'browse' | 'spreadsheet' | 'upload';
}) {
  const { openFilePicker } = useDropZone();
  if (kind === 'browse') {
    return (
      <Link className='mt-1 cursor-pointer text-sm' onPress={openFilePicker}>
        Browse from your device
      </Link>
    );
  }
  return (
    <Button
      className='mt-2'
      size={kind === 'spreadsheet' ? 'sm' : 'md'}
      variant={kind === 'spreadsheet' ? 'secondary' : 'primary'}
      onPress={openFilePicker}
    >
      {kind === 'spreadsheet' ? 'Choose Spreadsheet' : 'Upload Files'}
    </Button>
  );
}

export const CustomTriggers: Story = {
  render: () => (
    <div className='flex w-[480px] flex-col gap-8'>
      <DropZone>
        <DropZone.Area>
          <DropZone.Icon />
          <DropZone.Label>Drag files here to get started</DropZone.Label>
          <DropZone.Description>
            PDF, DOCX, or TXT up to 25 MB.
          </DropZone.Description>
          <CustomButtons kind='upload' />
        </DropZone.Area>
        <DropZone.Input multiple />
      </DropZone>
      <DropZone>
        <DropZone.Area>
          <DropZone.Icon />
          <DropZone.Label>Attach supporting documents</DropZone.Label>
          <DropZone.Description>Any format, 10 MB limit.</DropZone.Description>
          <CustomButtons kind='browse' />
        </DropZone.Area>
        <DropZone.Input multiple />
      </DropZone>
      <DropZone>
        <DropZone.Area>
          <DropZone.Icon />
          <DropZone.Label>Import spreadsheet data</DropZone.Label>
          <DropZone.Description>CSV or XLSX files only.</DropZone.Description>
          <CustomButtons kind='spreadsheet' />
        </DropZone.Area>
        <DropZone.Input accept='.csv,.xls,.xlsx' />
      </DropZone>
    </div>
  ),
};
