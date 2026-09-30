import {
  Button,
  IconButton,
  Input,
  Label,
  ListBox,
  Select,
  Separator,
  Skeleton,
  TextArea,
  Typography,
  toast,
} from '@aero/ui';
import { Pencil, Plus, TrashBin } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useEffect, useMemo, useState } from 'react';

import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';
import {
  useCreateSnippet,
  useDeleteSnippet,
  useSnippets,
  useUpdateSnippet,
} from '@/app/hooks/api/snippets';
import { useWorkspacesKeys } from '@/app/hooks/api/workspaces';
import { useI18n } from '@/app/hooks/i18n';
import type { Snippet, SnippetScope } from '@/server/services/snippets';

interface SnippetDraft {
  id?: string;
  name: string;
  description: string;
  aliases: string;
  content: string;
  scope: SnippetScope;
  directory: string;
}

export function SnippetsView() {
  const { t } = useI18n();

  const { data: workspaces } = useWorkspacesKeys();
  const preselectedDirectory = useNewSessionStore(
    (state) => state.selectedWorkspace?.directory,
  );

  const directories = useMemo(
    () => Object.keys(workspaces ?? {}),
    [workspaces],
  );

  const [directory, setDirectory] = useState('');

  useEffect(() => {
    if (directory) return;

    if (preselectedDirectory && directories.includes(preselectedDirectory)) {
      setDirectory(preselectedDirectory);
      return;
    }

    if (directories.length > 0) {
      setDirectory(directories[0]);
    }
  }, [directory, preselectedDirectory, directories]);

  const { data: snippets = [], isLoading } = useSnippets(
    directory || undefined,
  );

  const createSnippet = useCreateSnippet();
  const updateSnippet = useUpdateSnippet();
  const deleteSnippet = useDeleteSnippet();

  const [draft, setDraft] = useState<SnippetDraft | null>(null);

  const globalSnippets = snippets.filter(
    (snippet) => snippet.scope === 'global',
  );
  const workspaceSnippets = snippets.filter(
    (snippet) => snippet.scope === 'workspace',
  );

  const startCreate = () => {
    setDraft({
      name: '',
      description: '',
      aliases: '',
      content: '',
      scope: 'global',
      directory,
    });
  };

  const startEdit = (snippet: Snippet) => {
    setDraft({
      id: snippet.id,
      name: snippet.name,
      description: snippet.description,
      aliases: snippet.aliases.join(', '),
      content: snippet.content,
      scope: snippet.scope,
      directory: snippet.directory ?? directory,
    });
  };

  const handleSave = () => {
    if (!draft) return;

    const name = draft.name.trim();
    if (!name) return;

    const aliases = draft.aliases
      .split(',')
      .map((alias) => alias.trim())
      .filter(Boolean);

    const targetDirectory =
      draft.scope === 'workspace' ? draft.directory || directory : undefined;

    if (draft.scope === 'workspace' && !targetDirectory) return;

    const payload = {
      name,
      description: draft.description,
      content: draft.content,
      aliases,
      scope: draft.scope,
      ...(targetDirectory ? { directory: targetDirectory } : {}),
    };

    const onSuccess = () => setDraft(null);
    const onError = (error: Error) =>
      toast.danger(error.message || t.settingsSnippets.saveFailed);

    if (draft.id) {
      updateSnippet.mutate(
        { id: draft.id, ...payload },
        { onSuccess, onError },
      );
    } else {
      createSnippet.mutate(payload, { onSuccess, onError });
    }
  };

  const handleDelete = (snippet: Snippet) => {
    deleteSnippet.mutate(snippet.id, {
      onError: (error: Error) =>
        toast.danger(error.message || t.settingsSnippets.deleteFailed),
    });
  };

  const isSaving = createSnippet.isPending || updateSnippet.isPending;

  return (
    <div className='bg-background max-w-4xl flex-1 scrollbar-thin space-y-6 overflow-y-auto p-8'>
      <div>
        <Typography type='h3' weight='semibold'>
          {t.settings.snippets}
        </Typography>
        <Typography type='body-sm' color='muted'>
          {t.settingsSnippets.subtitle}
        </Typography>
      </div>

      <Separator />

      <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        {directories.length > 0 && (
          <Select
            value={directory}
            onChange={(key) => setDirectory(key as string)}
            className='flex w-full max-w-[280px] flex-col gap-2'
          >
            <Label>{t.settingsSnippets.workspace}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover className='rounded-xl'>
              <ListBox>
                {directories.map((item) => (
                  <ListBox.Item key={item} id={item} className='rounded-lg'>
                    <Label>{workspaces?.[item]?.name ?? item}</Label>
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        )}

        <Button variant='outline' onPress={startCreate} className='shrink-0'>
          <Icon data={Plus} className='size-4' />
          {t.settingsSnippets.newSnippet}
        </Button>
      </div>

      {draft && (
        <SnippetEditor
          draft={draft}
          directories={directories}
          workspaceNames={workspaces ?? {}}
          isSaving={isSaving}
          onChange={setDraft}
          onCancel={() => setDraft(null)}
          onSave={handleSave}
        />
      )}

      {isLoading ? (
        <div className='space-y-2'>
          <Skeleton className='h-14 w-full rounded-lg' />
          <Skeleton className='h-14 w-full rounded-lg' />
        </div>
      ) : snippets.length === 0 ? (
        <div className='text-muted flex items-center justify-center rounded-lg border border-dashed border-separator p-8 text-sm'>
          {t.settingsSnippets.empty}
        </div>
      ) : (
        <div className='space-y-6'>
          {globalSnippets.length > 0 && (
            <SnippetGroup
              title={t.settingsSnippets.global}
              snippets={globalSnippets}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          )}

          {workspaceSnippets.length > 0 && (
            <SnippetGroup
              title={t.settingsSnippets.workspace}
              snippets={workspaceSnippets}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface SnippetGroupProps {
  title: string;
  snippets: Snippet[];
  onEdit: (snippet: Snippet) => void;
  onDelete: (snippet: Snippet) => void;
}

function SnippetGroup({
  title,
  snippets,
  onEdit,
  onDelete,
}: SnippetGroupProps) {
  const { t } = useI18n();

  return (
    <section className='space-y-2'>
      <div className='text-muted text-[10px] font-semibold tracking-wider uppercase'>
        {title}
      </div>

      <div className='flex flex-col gap-1'>
        {snippets.map((snippet) => (
          <div
            key={snippet.id}
            className='border-separator hover:bg-surface-secondary/50 group flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5'
          >
            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-2'>
                <span className='text-danger text-sm font-medium'>
                  #{snippet.name}
                </span>
                {snippet.aliases.map((alias) => (
                  <span key={alias} className='text-muted text-xs'>
                    #{alias}
                  </span>
                ))}
              </div>
              <div className='text-muted mt-0.5 truncate text-xs'>
                {snippet.description || snippet.content}
              </div>
            </div>

            <div className='flex shrink-0 items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100'>
              <IconButton
                aria-label={t.common.edit}
                onPress={() => onEdit(snippet)}
              >
                <Icon data={Pencil} className='size-4' />
              </IconButton>
              <IconButton
                aria-label={t.common.delete}
                onPress={() => onDelete(snippet)}
              >
                <Icon data={TrashBin} className='size-4' />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

interface SnippetEditorProps {
  draft: SnippetDraft;
  directories: string[];
  workspaceNames: Record<string, { name: string }>;
  isSaving: boolean;
  onChange: (draft: SnippetDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}

function SnippetEditor({
  draft,
  directories,
  workspaceNames,
  isSaving,
  onChange,
  onCancel,
  onSave,
}: SnippetEditorProps) {
  const { t } = useI18n();

  return (
    <div className='border-separator bg-surface-secondary/30 space-y-4 rounded-xl border p-4'>
      <div className='text-foreground text-sm font-medium'>
        {draft.id
          ? t.settingsSnippets.editSnippet
          : t.settingsSnippets.newSnippet}
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='flex flex-col gap-2'>
          <Label>{t.settingsSnippets.name}</Label>
          <Input
            autoFocus
            value={draft.name}
            variant='secondary'
            placeholder={t.settingsSnippets.namePlaceholder}
            onChange={(event) =>
              onChange({ ...draft, name: event.target.value.trimStart() })
            }
          />
        </div>

        <div className='flex flex-col gap-2'>
          <Label>{t.settingsSnippets.aliases}</Label>
          <Input
            variant='secondary'
            value={draft.aliases}
            placeholder={t.settingsSnippets.aliasesPlaceholder}
            onChange={(event) =>
              onChange({ ...draft, aliases: event.target.value })
            }
          />
        </div>
      </div>

      <div className='flex flex-col gap-2'>
        <Label>{t.settingsSnippets.description}</Label>
        <Input
          value={draft.description}
          variant='secondary'
          placeholder={t.settingsSnippets.descriptionPlaceholder}
          onChange={(event) =>
            onChange({ ...draft, description: event.target.value })
          }
        />
      </div>

      <div className='flex flex-col gap-2'>
        <Label>{t.settingsSnippets.content}</Label>
        <TextArea
          value={draft.content}
          variant='secondary'
          placeholder={t.settingsSnippets.contentPlaceholder}
          className='min-h-24 w-full resize-none scrollbar-thin'
          onChange={(event) =>
            onChange({ ...draft, content: event.target.value })
          }
        />
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <Select
          value={draft.scope}
          onChange={(key) => onChange({ ...draft, scope: key as SnippetScope })}
          className='flex flex-col gap-2'
          variant='secondary'
        >
          <Label>{t.settingsSnippets.scope}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover className='rounded-xl'>
            <ListBox>
              <ListBox.Item id='global' className='rounded-lg'>
                <Label>{t.settingsSnippets.global}</Label>
              </ListBox.Item>
              <ListBox.Item
                id='workspace'
                className='rounded-lg'
                isDisabled={directories.length === 0}
              >
                <Label>{t.settingsSnippets.workspace}</Label>
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>

        {draft.scope === 'workspace' && directories.length > 0 && (
          <Select
            value={draft.directory}
            onChange={(key) => onChange({ ...draft, directory: key as string })}
            className='flex flex-col gap-2'
            variant='secondary'
          >
            <Label>{t.settingsSnippets.selectWorkspace}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover className='rounded-xl'>
              <ListBox>
                {directories.map((item) => (
                  <ListBox.Item key={item} id={item} className='rounded-lg'>
                    <Label>{workspaceNames[item]?.name ?? item}</Label>
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        )}
      </div>

      <div className='flex items-center justify-end gap-2'>
        <Button size='sm' variant='tertiary' onPress={onCancel}>
          {t.common.cancel}
        </Button>
        <Button
          size='sm'
          onPress={onSave}
          isDisabled={!draft.name.trim() || isSaving}
        >
          {t.common.save}
        </Button>
      </div>
    </div>
  );
}
