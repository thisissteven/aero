'use client';

import {
  Button,
  IconButton,
  Input,
  Modal,
  RichTextEditor,
  toast,
} from '@aero/ui';
import {
  ArrowUturnCcwLeft,
  ArrowUturnCwRight,
  Bold,
  ChevronLeft,
  Code,
  Eraser,
  FileText,
  Heading1,
  Heading2,
  Italic,
  Link,
  ListOl,
  ListUl,
  Plus,
  QuoteOpen,
  Strikethrough,
  TrashBin,
  Underline,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import type { ComponentProps } from 'react';
import { useState } from 'react';

import {
  parseNotesDocument,
  serializeNotesDocument,
} from '@/app/components/chat-aside/notes/notes-content';
import {
  useCreateProjectNote,
  useDeleteProjectNote,
  useSaveProjectNote,
} from '@/app/hooks/api/project-context';
import { useI18n } from '@/app/hooks/i18n';
import type { AeroProjectNote } from '@/server/services/harness/types';

type EditorCommand = Parameters<
  typeof RichTextEditor.ToggleButton
>[0]['command'];
type EditorAction = Parameters<typeof RichTextEditor.ActionButton>[0]['action'];
type EditorIcon = ComponentProps<typeof Icon>['data'];

export function NotesTab({
  workspaceId,
  notes,
}: {
  workspaceId: string;
  notes: AeroProjectNote[];
}) {
  const { t } = useI18n();
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const createNote = useCreateProjectNote(workspaceId);

  const openNote = openNoteId
    ? notes.find((note) => note.id === openNoteId)
    : undefined;

  if (openNote) {
    return (
      <NoteEditor
        key={openNote.id}
        workspaceId={workspaceId}
        note={openNote}
        onBack={() => setOpenNoteId(null)}
      />
    );
  }

  const handleCreate = async () => {
    try {
      const result = await createNote.mutateAsync({ title: '' });
      setOpenNoteId(result.note.id);
    } catch {
      toast.danger(t.notesPanel.notes.createFailed);
    }
  };

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='border-separator flex shrink-0 items-center justify-end border-b px-3 py-2'>
        <Button
          size='sm'
          variant='ghost'
          className='h-7 shrink-0 rounded-lg text-xs'
          isPending={createNote.isPending}
          onPress={handleCreate}
        >
          <Icon data={Plus} />
          {t.notesPanel.notes.new}
        </Button>
      </div>

      <div className='scrollbar-thin min-h-0 flex-1 overflow-y-auto p-1.5'>
        {notes.length === 0 ? (
          <div className='text-muted flex h-full items-center justify-center px-4 text-center text-sm'>
            {t.notesPanel.notes.empty}
          </div>
        ) : (
          notes.map((note) => (
            <button
              key={note.id}
              type='button'
              onClick={() => setOpenNoteId(note.id)}
              className='hover:bg-surface-hover focus-visible:ring-accent flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left outline-none transition-colors focus-visible:ring-2'
            >
              <Icon data={FileText} size={16} className='text-muted shrink-0' />
              <span className='flex min-w-0 flex-col'>
                <span className='text-foreground truncate text-sm'>
                  {note.title.trim() || t.notesPanel.notes.untitled}
                </span>
                <span className='text-muted text-xs'>
                  {new Date(note.updatedAt).toLocaleDateString()}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function NoteEditor({
  workspaceId,
  note,
  onBack,
}: {
  workspaceId: string;
  note: AeroProjectNote;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const save = useSaveProjectNote(workspaceId, note.id);
  const deleteNote = useDeleteProjectNote(workspaceId);

  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(() => parseNotesDocument(note.body));
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='border-separator flex shrink-0 items-center gap-1.5 border-b px-2 py-1.5'>
        <IconButton
          className='shrink-0'
          aria-label={t.notesPanel.notes.back}
          onPress={onBack}
        >
          <Icon data={ChevronLeft} />
        </IconButton>

        <Input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            save.mutate({ title: event.target.value });
          }}
          placeholder={t.notesPanel.notes.titlePlaceholder}
          aria-label={t.notesPanel.notes.titlePlaceholder}
          className='h-7 flex-1 rounded-lg text-sm'
        />

        <IconButton
          className='shrink-0'
          aria-label={t.notesPanel.notes.delete}
          onPress={() => setConfirmDelete(true)}
        >
          <Icon data={TrashBin} />
        </IconButton>
      </div>

      <RichTextEditor
        value={content}
        onValueChange={(document, details) => {
          setContent(document);
          save.mutate({
            body: serializeNotesDocument(document, details.isEmpty),
          });
        }}
        placeholder={t.notesPanel.notes.placeholder}
        className='flex min-h-0 flex-1 flex-col'
      >
        <RichTextEditor.Shell className='min-h-0 flex-1 rounded-none border-0 bg-transparent'>
          <RichTextEditor.Toolbar
            aria-label={t.notesPanel.tabNotes}
            className='border-separator border-b'
          >
            <RichTextEditor.ToolbarGroup aria-label='History'>
              <EditorAction
                action='undo'
                icon={ArrowUturnCcwLeft}
                label='Undo'
              />
              <EditorAction
                action='redo'
                icon={ArrowUturnCwRight}
                label='Redo'
              />
            </RichTextEditor.ToolbarGroup>

            <RichTextEditor.ToolbarSeparator />

            <RichTextEditor.ToolbarGroup aria-label='Text style'>
              <EditorToggle command='bold' icon={Bold} label='Bold' />
              <EditorToggle command='italic' icon={Italic} label='Italic' />
              <EditorToggle
                command='underline'
                icon={Underline}
                label='Underline'
              />
              <EditorToggle
                command='strike'
                icon={Strikethrough}
                label='Strikethrough'
              />
              <EditorToggle command='code' icon={Code} label='Inline code' />
            </RichTextEditor.ToolbarGroup>

            <RichTextEditor.ToolbarSeparator />

            <RichTextEditor.ToolbarGroup aria-label='Blocks'>
              <EditorToggle
                command='heading-1'
                icon={Heading1}
                label='Heading 1'
              />
              <EditorToggle
                command='heading-2'
                icon={Heading2}
                label='Heading 2'
              />
              <EditorToggle
                command='blockquote'
                icon={QuoteOpen}
                label='Blockquote'
              />
            </RichTextEditor.ToolbarGroup>

            <RichTextEditor.ToolbarSeparator />

            <RichTextEditor.ToolbarGroup aria-label='Lists and links'>
              <EditorToggle
                command='bulletList'
                icon={ListUl}
                label='Bulleted list'
              />
              <EditorToggle
                command='orderedList'
                icon={ListOl}
                label='Numbered list'
              />
              <RichTextEditor.LinkPopover>
                <RichTextEditor.LinkPopover.Trigger className='size-7 rounded-md [&_svg]:!size-3.5'>
                  <Icon data={Link} size={14} />
                </RichTextEditor.LinkPopover.Trigger>
                <RichTextEditor.LinkPopover.Content>
                  <RichTextEditor.LinkPopover.Input />
                  <RichTextEditor.LinkPopover.Actions>
                    <RichTextEditor.LinkPopover.UnsetButton />
                    <RichTextEditor.LinkPopover.ApplyButton />
                  </RichTextEditor.LinkPopover.Actions>
                </RichTextEditor.LinkPopover.Content>
              </RichTextEditor.LinkPopover>
            </RichTextEditor.ToolbarGroup>

            <RichTextEditor.ToolbarSeparator />

            <RichTextEditor.ToolbarGroup aria-label='Clear'>
              <EditorAction
                action='clearFormatting'
                icon={Eraser}
                label='Clear formatting'
              />
            </RichTextEditor.ToolbarGroup>
          </RichTextEditor.Toolbar>

          <RichTextEditor.Content className='scrollbar-thin' />

          <RichTextEditor.BubbleMenu>
            <EditorToggle command='bold' icon={Bold} label='Bold' />
            <EditorToggle command='italic' icon={Italic} label='Italic' />
            <EditorToggle
              command='underline'
              icon={Underline}
              label='Underline'
            />
            <EditorToggle
              command='strike'
              icon={Strikethrough}
              label='Strikethrough'
            />
          </RichTextEditor.BubbleMenu>

          <RichTextEditor.Footer className='border-separator border-t'>
            <RichTextEditor.CharacterCount showWords>
              {({ words }) => t.notesPanel.notes.words(words)}
            </RichTextEditor.CharacterCount>
            <span aria-live='polite' className='text-muted text-xs'>
              {save.isPending
                ? t.notesPanel.notes.saving
                : t.notesPanel.notes.saved}
            </span>
          </RichTextEditor.Footer>
        </RichTextEditor.Shell>
      </RichTextEditor>

      <Modal isOpen={confirmDelete} onOpenChange={setConfirmDelete}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              {({ close }) => (
                <>
                  <Modal.Header>{t.notesPanel.notes.deleteTitle}</Modal.Header>
                  <Modal.Body>
                    {t.notesPanel.notes.deleteDescription(
                      title.trim() || t.notesPanel.notes.untitled,
                    )}
                  </Modal.Body>
                  <Modal.Footer>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='rounded-lg'
                      onPress={close}
                    >
                      {t.common.cancel}
                    </Button>
                    <Button
                      size='sm'
                      variant='danger'
                      className='rounded-lg'
                      isPending={deleteNote.isPending}
                      onPress={async () => {
                        try {
                          await deleteNote.mutateAsync(note.id);
                          toast.success(t.notesPanel.notes.deleted);
                          onBack();
                        } catch {
                          toast.danger(t.notesPanel.notes.deleteFailed);
                        } finally {
                          close();
                        }
                      }}
                    >
                      {t.common.delete}
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

function EditorToggle({
  command,
  icon,
  label,
}: {
  command: EditorCommand;
  icon: EditorIcon;
  label: string;
}) {
  return (
    <RichTextEditor.ToggleButton
      command={command}
      className='size-7 rounded-md [&_svg]:!size-3.5'
      tooltip={label}
    >
      <Icon data={icon} size={14} />
    </RichTextEditor.ToggleButton>
  );
}

function EditorAction({
  action,
  icon,
  label,
}: {
  action: EditorAction;
  icon: EditorIcon;
  label: string;
}) {
  return (
    <RichTextEditor.ActionButton
      action={action}
      className='size-7 rounded-md [&_svg]:!size-3.5'
      tooltip={label}
    >
      <Icon data={icon} size={14} />
    </RichTextEditor.ActionButton>
  );
}
