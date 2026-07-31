'use client';

import { cn, ProgressBar } from '@heroui/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { AnimatePresence, motion } from 'motion/react';
import type {
  ComponentProps,
  ComponentPropsWithRef,
  ReactElement,
  ReactNode,
} from 'react';
import { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import {
  Button as ButtonPrimitive,
  composeRenderProps,
  DropZone as DropZonePrimitive,
  Text as TextPrimitive,
} from 'react-aria-components';

interface DropZoneContextValue {
  inputRef: React.RefObject<HTMLInputElement | null>;
  openFilePicker: () => void;
}

const DropZoneContext = createContext<DropZoneContextValue>({
  inputRef: { current: null },
  openFilePicker: () => {},
});

export interface DropZoneRootProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}

function DropZoneRoot({
  children,
  className,
  ...props
}: DropZoneRootProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const openFilePicker = useCallback(() => inputRef.current?.click(), []);
  const contextValue = useMemo(
    () => ({ inputRef, openFilePicker }),
    [openFilePicker],
  );

  return (
    <DropZoneContext value={contextValue}>
      <div
        {...props}
        className={cn('drop-zone', className)}
        data-slot='drop-zone'
      >
        {children}
      </div>
    </DropZoneContext>
  );
}

export type DropZoneAreaProps = ComponentProps<typeof DropZonePrimitive>;

function DropZoneArea({
  children,
  className,
  ...props
}: DropZoneAreaProps): ReactElement {
  return (
    <DropZonePrimitive
      {...props}
      className={(renderProps) =>
        cn(
          'drop-zone__area',
          typeof className === 'function' ? className(renderProps) : className,
        ) ?? 'drop-zone__area'
      }
      data-slot='drop-zone-area'
    >
      {children}
    </DropZonePrimitive>
  );
}

export type DropZoneIconProps = ComponentPropsWithRef<'span'>;

function UploadIcon(): ReactElement {
  return (
    <svg aria-hidden='true' fill='none' viewBox='0 0 16 16'>
      <path
        clipRule='evenodd'
        d='M4.5 5.25a3.25 3.25 0 0 1 6.398-.811.75.75 0 0 0 .702.563A3 3 0 0 1 11.5 11h-.75a.75.75 0 0 0 0 1.5h.75a4.5 4.5 0 0 0 .687-8.948 4.751 4.751 0 0 0-9.184 1.522A3.751 3.751 0 0 0 3.75 12.5h1.5a.75.75 0 0 0 0-1.5H3.751a2.25 2.25 0 0 1-.003-4.5h.03a.75.75 0 0 0 .747-.843A3 3 0 0 1 4.5 5.25m4.25 3.31.72.72a.75.75 0 1 0 1.06-1.06l-2-2a.75.75 0 0 0-1.06 0l-2 2a.75.75 0 0 0 1.06 1.06l.72-.72v6.69a.75.75 0 0 0 1.5 0z'
        fill='currentColor'
        fillRule='evenodd'
      />
    </svg>
  );
}

function DropZoneIcon({
  children,
  className,
  ...props
}: DropZoneIconProps): ReactElement {
  return (
    <span
      {...props}
      className={cn('drop-zone__icon', className)}
      data-slot='drop-zone-icon'
    >
      {children ?? <UploadIcon />}
    </span>
  );
}

export type DropZoneLabelProps = ComponentPropsWithRef<typeof TextPrimitive>;

function DropZoneLabel({
  children,
  className,
  ...props
}: DropZoneLabelProps): ReactElement {
  return (
    <TextPrimitive
      {...props}
      className={cn('drop-zone__label', className)}
      data-slot='drop-zone-label'
      slot='label'
    >
      {children}
    </TextPrimitive>
  );
}

export type DropZoneDescriptionProps = ComponentPropsWithRef<'span'>;

function DropZoneDescription({
  children,
  className,
  ...props
}: DropZoneDescriptionProps): ReactElement {
  return (
    <span
      {...props}
      className={cn('drop-zone__description', className)}
      data-slot='drop-zone-description'
    >
      {children}
    </span>
  );
}

export interface DropZoneInputProps extends Omit<
  ComponentPropsWithRef<'input'>,
  'onSelect' | 'type'
> {
  onSelect?: (files: FileList) => void;
}

function DropZoneInput({
  className,
  onSelect,
  ...props
}: DropZoneInputProps): ReactElement {
  const { inputRef } = useContext(DropZoneContext);
  return (
    <input
      {...props}
      ref={inputRef}
      className={cn('drop-zone__input', className)}
      data-slot='drop-zone-input'
      tabIndex={-1}
      type='file'
      onChange={(event) => {
        const files = event.currentTarget.files;
        if (files?.length) onSelect?.(files);
        event.currentTarget.value = '';
      }}
    />
  );
}

export type DropZoneTriggerProps = ComponentProps<typeof ButtonPrimitive>;

function DropZoneTrigger({
  children = 'Select files',
  className,
  ...props
}: DropZoneTriggerProps): ReactElement {
  const { openFilePicker } = useContext(DropZoneContext);
  return (
    <ButtonPrimitive
      {...props}
      className={composeRenderProps(
        className,
        (resolvedClassName) =>
          cn('drop-zone__trigger', resolvedClassName) ?? 'drop-zone__trigger',
      )}
      data-slot='drop-zone-trigger'
      onPress={(event) => {
        openFilePicker();
        props.onPress?.(event);
      }}
    >
      {children}
    </ButtonPrimitive>
  );
}

export type DropZoneFileListProps = ComponentPropsWithRef<'div'>;
function DropZoneFileList({
  children,
  className,
  ...props
}: DropZoneFileListProps): ReactElement {
  return (
    <div
      {...props}
      className={cn('drop-zone__file-list', className)}
      data-slot='drop-zone-file-list'
    >
      <AnimatePresence initial={false}>{children}</AnimatePresence>
    </div>
  );
}

export interface DropZoneFileItemProps extends ComponentProps<
  typeof motion.div
> {
  status?: 'complete' | 'failed' | 'uploading';
}
function DropZoneFileItem({
  children,
  className,
  status,
  ...props
}: DropZoneFileItemProps): ReactElement {
  return (
    <motion.div
      {...props}
      animate={{ opacity: 1, y: 0 }}
      className={cn('drop-zone__file-item', className)}
      data-slot='drop-zone-file-item'
      data-status={status}
      exit={{ opacity: 0, y: -8 }}
      initial={{ opacity: 0, y: -8 }}
      layout
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

export interface DropZoneFileFormatIconProps extends Omit<
  ComponentPropsWithRef<'svg'>,
  'color'
> {
  color?: 'blue' | 'gray' | 'green' | 'orange' | 'purple' | 'red';
  format?: string;
}
function DropZoneFileFormatIcon({
  className,
  color = 'gray',
  format,
  ...props
}: DropZoneFileFormatIconProps): ReactElement {
  return (
    <svg
      {...props}
      aria-hidden='true'
      className={cn('drop-zone__file-format-icon', className)}
      data-slot='drop-zone-file-format-icon'
      fill='none'
      height='40'
      viewBox='0 0 32 40'
      width='32'
    >
      <path
        d='M24 39.25H8A5.25 5.25 0 0 1 2.75 34V6A5.25 5.25 0 0 1 8 .75h9.515c1.392 0 2.727.553 3.712 1.538l8.485 8.485a5.25 5.25 0 0 1 1.538 3.712V34A5.25 5.25 0 0 1 26 39.25Z'
        fill='var(--color-surface)'
        stroke='var(--color-border)'
        strokeWidth='1.5'
      />
      <path
        d='M19 1v7a4 4 0 0 0 4 4h8'
        stroke='var(--color-border)'
        strokeWidth='1.5'
      />
      {format ? (
        <foreignObject height='40' width='32'>
          <div
            className='drop-zone__file-format-icon-badge'
            data-color={color}
            data-slot='drop-zone-file-format-icon-badge'
          >
            {format}
          </div>
        </foreignObject>
      ) : null}
    </svg>
  );
}

function DropZoneFileInfo({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  return (
    <div
      {...props}
      className={cn('drop-zone__file-info', className)}
      data-slot='drop-zone-file-info'
    >
      {children}
    </div>
  );
}
function DropZoneFileName({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'span'>): ReactElement {
  return (
    <span
      {...props}
      className={cn('drop-zone__file-name', className)}
      data-slot='drop-zone-file-name'
    >
      {children}
    </span>
  );
}
function DropZoneFileMeta({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'span'>): ReactElement {
  return (
    <span
      {...props}
      className={cn('drop-zone__file-meta', className)}
      data-slot='drop-zone-file-meta'
    >
      {children}
    </span>
  );
}

export type DropZoneFileProgressProps = ComponentProps<typeof ProgressBar>;
function DropZoneFileProgress({
  children,
  className,
  size = 'sm',
  ...props
}: DropZoneFileProgressProps): ReactElement {
  return (
    <ProgressBar
      {...props}
      aria-label={props['aria-label'] ?? 'Upload progress'}
      className={composeRenderProps(
        className,
        (resolvedClassName) =>
          cn('drop-zone__file-progress', resolvedClassName) ?? '',
      )}
      color='accent'
      data-slot='drop-zone-file-progress'
      size={size}
    >
      {children}
    </ProgressBar>
  );
}
function DropZoneFileProgressTrack(
  props: ComponentProps<typeof ProgressBar.Track>,
): ReactElement {
  return (
    <ProgressBar.Track {...props} data-slot='drop-zone-file-progress-track' />
  );
}
function DropZoneFileProgressFill(
  props: ComponentProps<typeof ProgressBar.Fill>,
): ReactElement {
  return (
    <ProgressBar.Fill {...props} data-slot='drop-zone-file-progress-fill' />
  );
}

export type DropZoneFileRemoveTriggerProps = ComponentProps<
  typeof ButtonPrimitive
>;
function DropZoneFileRemoveTrigger({
  children,
  className,
  ...props
}: DropZoneFileRemoveTriggerProps): ReactElement {
  return (
    <ButtonPrimitive
      {...props}
      className={composeRenderProps(
        className,
        (resolvedClassName) =>
          cn('drop-zone__file-remove-trigger', resolvedClassName) ??
          'drop-zone__file-remove-trigger',
      )}
      data-slot='drop-zone-file-remove-trigger'
    >
      {children ?? <HugeiconsIcon aria-hidden icon={Cancel01Icon} size={16} />}
    </ButtonPrimitive>
  );
}
function DropZoneFileRetryTrigger({
  children = 'Try again',
  className,
  ...props
}: DropZoneFileRemoveTriggerProps): ReactElement {
  return (
    <ButtonPrimitive
      {...props}
      className={composeRenderProps(
        className,
        (resolvedClassName) =>
          cn('drop-zone__file-retry-trigger', resolvedClassName) ??
          'drop-zone__file-retry-trigger',
      )}
      data-slot='drop-zone-file-retry-trigger'
    >
      {children}
    </ButtonPrimitive>
  );
}

type DropZoneComponent = typeof DropZoneRoot & {
  Area: typeof DropZoneArea;
  Description: typeof DropZoneDescription;
  FileFormatIcon: typeof DropZoneFileFormatIcon;
  FileInfo: typeof DropZoneFileInfo;
  FileItem: typeof DropZoneFileItem;
  FileList: typeof DropZoneFileList;
  FileMeta: typeof DropZoneFileMeta;
  FileName: typeof DropZoneFileName;
  FileProgress: typeof DropZoneFileProgress;
  FileProgressFill: typeof DropZoneFileProgressFill;
  FileProgressTrack: typeof DropZoneFileProgressTrack;
  FileRemoveTrigger: typeof DropZoneFileRemoveTrigger;
  FileRetryTrigger: typeof DropZoneFileRetryTrigger;
  Icon: typeof DropZoneIcon;
  Input: typeof DropZoneInput;
  Label: typeof DropZoneLabel;
  Root: typeof DropZoneRoot;
  Trigger: typeof DropZoneTrigger;
};
export const DropZone: DropZoneComponent = Object.assign(DropZoneRoot, {
  Area: DropZoneArea,
  Description: DropZoneDescription,
  FileFormatIcon: DropZoneFileFormatIcon,
  FileInfo: DropZoneFileInfo,
  FileItem: DropZoneFileItem,
  FileList: DropZoneFileList,
  FileMeta: DropZoneFileMeta,
  FileName: DropZoneFileName,
  FileProgress: DropZoneFileProgress,
  FileProgressFill: DropZoneFileProgressFill,
  FileProgressTrack: DropZoneFileProgressTrack,
  FileRemoveTrigger: DropZoneFileRemoveTrigger,
  FileRetryTrigger: DropZoneFileRetryTrigger,
  Icon: DropZoneIcon,
  Input: DropZoneInput,
  Label: DropZoneLabel,
  Root: DropZoneRoot,
  Trigger: DropZoneTrigger,
});
export function useDropZone(): Pick<DropZoneContextValue, 'openFilePicker'> {
  const { openFilePicker } = useContext(DropZoneContext);
  return { openFilePicker };
}
