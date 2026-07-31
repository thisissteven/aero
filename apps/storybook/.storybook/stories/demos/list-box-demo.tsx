import React from 'react';

import {
  Description,
  Header,
  Kbd,
  Label,
  ListBox,
  Separator,
  Surface,
} from '@aero/ui';
import { AddSquareIcon, Delete02Icon, PencilEdit01Icon } from '@aero/ui/icons';
import { HugeiconsIcon } from '@aero/ui/icons';

export function ListBoxDemo() {
  return (
    <Surface className='shadow-surface w-[256px] rounded-3xl'>
      <ListBox
        aria-label='File actions'
        className='w-full p-2'
        selectionMode='none'
      >
        <ListBox.Section>
          <Header>Actions</Header>
          <ListBox.Item id='new-file' textValue='New file'>
            <div className='flex h-8 items-start justify-center pt-px'>
              <HugeiconsIcon
                className='text-muted shrink-0'
                icon={AddSquareIcon}
                size={16}
              />
            </div>
            <div className='flex flex-col'>
              <Label>New file</Label>
              <Description>Create a new file</Description>
            </div>
            <Kbd className='ms-auto' variant='light'>
              <Kbd.Abbr keyValue='command' />
              <Kbd.Content>N</Kbd.Content>
            </Kbd>
          </ListBox.Item>
          <ListBox.Item id='edit-file' textValue='Edit file'>
            <div className='flex h-8 items-start justify-center pt-px'>
              <HugeiconsIcon
                className='text-muted shrink-0'
                icon={PencilEdit01Icon}
                size={16}
              />
            </div>
            <div className='flex flex-col'>
              <Label>Edit file</Label>
              <Description>Make changes</Description>
            </div>
            <Kbd className='ms-auto' variant='light'>
              <Kbd.Abbr keyValue='command' />
              <Kbd.Content>E</Kbd.Content>
            </Kbd>
          </ListBox.Item>
        </ListBox.Section>
        <Separator />
        <ListBox.Section>
          <Header>Danger zone</Header>
          <ListBox.Item
            id='delete-file'
            textValue='Delete file'
            variant='danger'
          >
            <div className='flex h-8 items-start justify-center pt-px'>
              <HugeiconsIcon
                className='text-danger shrink-0'
                icon={Delete02Icon}
                size={16}
              />
            </div>
            <div className='flex flex-col'>
              <Label>Delete file</Label>
              <Description>Move to trash</Description>
            </div>
            <Kbd className='ms-auto' variant='light'>
              <Kbd.Abbr keyValue='command' />
              <Kbd.Abbr keyValue='shift' />
              <Kbd.Content>D</Kbd.Content>
            </Kbd>
          </ListBox.Item>
        </ListBox.Section>
      </ListBox>
    </Surface>
  );
}
