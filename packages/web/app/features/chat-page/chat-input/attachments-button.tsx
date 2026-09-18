import { cn, Dropdown, IconButton, Label } from '@aero/ui';
import { CircleTree, File, LogoGithub, Paperclip } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useRef } from 'react';
import { useGitErrorCode } from '@/app/hooks/api/git';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { useGlobalModalStore } from '@/app/providers';

import { useExternalPartsStore } from './external-parts-store';

export function AttachmentsButton() {
  const inputRef = useRef<HTMLInputElement>(null);

  const directory = useSessionDirectory();
  const { data: error } = useGitErrorCode(directory);

  const invalidGitRepo = error?.code === 'INVALID_GIT_REPOSITORY' || !directory;

  const addFileAttachments = useExternalPartsStore(
    (state) => state.addFileAttachments,
  );

  return (
    <>
      <input
        ref={inputRef}
        type='file'
        multiple
        className='hidden'
        onChange={(event) => {
          const files = event.target.files;
          if (files && files.length > 0) {
            addFileAttachments(files);
          }
          // Reset so picking the same file twice still fires onChange.
          event.target.value = '';
        }}
      />

      <Dropdown size='sm'>
        <IconButton size='sm' className='rounded-lg'>
          <Icon
            data={Paperclip}
            style={{ width: 14, height: 14 }}
            className='shrink-0'
          />
        </IconButton>
        <Dropdown.Popover className='' placement='top start' crossOffset={-8}>
          <Dropdown.Menu aria-label='Attachment actions list'>
            <FileAttachments inputRef={inputRef} />
            <LinkGithubIssue
              directory={directory}
              isDisabled={invalidGitRepo}
            />
            <LinkGithubPullRequest
              directory={directory}
              isDisabled={invalidGitRepo}
            />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </>
  );
}

function FileAttachments({
  inputRef,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <Dropdown.Item className='gap-1' onPress={() => inputRef.current?.click()}>
      <Icon size={14} data={File} />
      <Label className='font-medium'>Attach files</Label>
    </Dropdown.Item>
  );
}

function LinkGithubIssue({
  directory,
  isDisabled,
}: {
  directory?: string;
  isDisabled: boolean;
}) {
  const openModal = useGlobalModalStore((state) => state.openModal);

  return (
    <Dropdown.Item className='gap-1' isDisabled={isDisabled}>
      <Icon
        size={14}
        data={LogoGithub}
        className={cn(isDisabled && 'opacity-50')}
      />
      <Label className='font-medium'>Link GitHub issue</Label>
    </Dropdown.Item>
  );
}

function LinkGithubPullRequest({
  directory,
  isDisabled,
}: {
  directory?: string;
  isDisabled: boolean;
}) {
  const openModal = useGlobalModalStore((state) => state.openModal);

  return (
    <Dropdown.Item className='gap-1' isDisabled={isDisabled}>
      <Icon
        size={14}
        data={CircleTree}
        className={cn(isDisabled && 'opacity-50')}
      />
      <Label className='font-medium'>Link GitHub pull request</Label>
    </Dropdown.Item>
  );
}
