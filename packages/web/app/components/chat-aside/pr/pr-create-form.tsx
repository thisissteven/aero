// app/components/chat-aside/pr/pr-create-form.tsx
//
// Shown when the current branch has no open pull request. Lets the user pick a
// base branch, optionally write the description with AI, and open the PR.

import {
  Button,
  Label,
  ListBox,
  Select,
  Switch,
  TextArea,
  toast,
} from '@aero/ui';
import { CodeMerge, MagicWand, Sparkles } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useEffect, useMemo, useState } from 'react';

import {
  useGitHubBranches,
  useGitHubCreatePr,
  useGitHubDescribePr,
  useGitHubUpstream,
} from '@/app/hooks/api/github';
import { useI18n } from '@/app/hooks/i18n';

import type { RepoRef } from './types';

export function PrCreateForm({
  directory,
  repo,
  headBranch,
  onCreated,
}: {
  directory: string;
  repo: RepoRef;
  headBranch: string;
  onCreated: () => void;
}) {
  const { t } = useI18n();
  const { data: upstreamData } = useGitHubUpstream(directory);
  const upstream = upstreamData?.upstream ?? null;
  const isFork = Boolean(upstreamData?.isFork && upstream);

  const target: RepoRef = isFork
    ? { owner: upstream!.owner, repo: upstream!.repo }
    : repo;

  const { data: branchesData, isLoading: branchesLoading } = useGitHubBranches(
    target.owner,
    target.repo,
  );
  const branches = branchesData?.branches ?? [];

  const [base, setBase] = useState<string>('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [draft, setDraft] = useState(false);

  const describe = useGitHubDescribePr();
  const createPr = useGitHubCreatePr();

  const defaultBase = useMemo(() => {
    if (upstream?.defaultBranch) return upstream.defaultBranch;
    if (branches.includes('main')) return 'main';
    if (branches.includes('master')) return 'master';
    return branches[0] ?? '';
  }, [upstream?.defaultBranch, branches]);

  useEffect(() => {
    if (!base && defaultBase) setBase(defaultBase);
  }, [base, defaultBase]);

  const generate = async () => {
    try {
      const result = await describe.mutateAsync({
        directory,
        base: base || undefined,
        head: headBranch,
      });
      setTitle(result.title);
      setBody(result.body);
      toast.success(t.pullRequest.generatedSuccessfully);
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : t.pullRequest.generateFailed,
      );
    }
  };

  const submit = async () => {
    if (!title.trim()) {
      toast.danger(t.pullRequest.titleRequired);
      return;
    }
    if (!base) return;
    try {
      const created = await createPr.mutateAsync({
        directory,
        title: title.trim(),
        head: headBranch,
        base,
        body: body.trim() || undefined,
        draft,
        remote: isFork ? 'upstream' : 'origin',
        ...(isFork
          ? {
              headRemote: 'origin',
              targetRepo: { owner: upstream!.owner, repo: upstream!.repo },
            }
          : {}),
      });
      toast.success(t.pullRequest.pullRequestCreated(created.number));
      onCreated();
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : t.pullRequest.createFailed,
      );
    }
  };

  return (
    <div className='min-h-0 flex-1 overflow-y-auto p-3'>
      <div className='mb-3 flex items-center gap-2'>
        <code className='bg-default/60 rounded px-1.5 py-0.5 font-mono text-xs'>
          {headBranch}
        </code>
        {base && (
          <>
            <span className='text-muted text-xs'>→</span>
            <code className='bg-default/60 rounded px-1.5 py-0.5 font-mono text-xs'>
              {isFork ? `${upstream!.owner}/` : ''}
              {base}
            </code>
          </>
        )}
      </div>

      <p className='text-muted mb-4 text-xs'>
        {t.pullRequest.createDescription}
        {isFork && (
          <>
            {' '}
            <span className='text-accent'>
              {t.pullRequest.forkOf} {upstream!.owner}/{upstream!.repo}
            </span>
          </>
        )}
      </p>

      <div className='mb-3 flex flex-col gap-1.5'>
        <Label>{t.pullRequest.baseBranch}</Label>
        <Select
          value={base || undefined}
          onChange={(key) => setBase(String(key))}
          placeholder={
            branchesLoading
              ? t.pullRequest.loadingBranches
              : t.pullRequest.selectBranch
          }
          className='w-full'
          isDisabled={branchesLoading}
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover className='rounded-xl'>
            <ListBox>
              {branches.map((branch) => (
                <ListBox.Item key={branch} id={branch} className='rounded-lg'>
                  <Label>{branch}</Label>
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      <div className='mb-3 flex flex-col gap-1.5'>
        <Label>{t.pullRequest.title}</Label>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t.pullRequest.titlePlaceholder}
          className='border-separator bg-default/30 text-foreground placeholder:text-muted focus:border-accent w-full rounded-md border px-2.5 py-1.5 text-sm outline-none'
        />
      </div>

      <div className='mb-3 flex flex-col gap-1.5'>
        <div className='flex items-center justify-between'>
          <Label>{t.pullRequest.body}</Label>
          <Button
            size='sm'
            variant='ghost'
            className='h-6 gap-1 px-1.5 text-xs'
            isPending={describe.isPending}
            onPress={generate}
          >
            <Icon
              data={describe.isPending ? Sparkles : MagicWand}
              size={12}
              className={describe.isPending ? 'animate-pulse' : undefined}
            />
            {describe.isPending
              ? t.pullRequest.generating
              : t.pullRequest.generateWithAi}
          </Button>
        </div>
        <TextArea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t.pullRequest.bodyPlaceholder}
          className='scrollbar-thin min-h-32 w-full rounded-md text-sm'
          rows={8}
        />
      </div>

      <label className='mb-4 flex items-center gap-2'>
        <Switch size='sm' isSelected={draft} onChange={setDraft} />
        <span className='text-muted text-xs'>{t.pullRequest.draft}</span>
      </label>

      <Button
        variant='primary'
        className='w-full gap-1.5'
        isDisabled={!title.trim() || !base}
        isPending={createPr.isPending}
        onPress={submit}
      >
        <Icon data={CodeMerge} size={14} />
        {createPr.isPending
          ? t.pullRequest.creatingPullRequest
          : t.pullRequest.createPullRequest}
      </Button>
    </div>
  );
}
