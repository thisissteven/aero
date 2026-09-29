// app/components/chat-aside/pr/pr-create-form.tsx
//
// Shown when the current branch has no open pull request. Lets the user pick
// the head and base branches, optionally write the description with AI, and
// open the PR.

import {
  Button,
  Input,
  Label,
  ListBox,
  Select,
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

  const { data: baseBranchesData, isLoading: baseBranchesLoading } =
    useGitHubBranches(target.owner, target.repo);
  const { data: headBranchesData, isLoading: headBranchesLoading } =
    useGitHubBranches(repo.owner, repo.repo);

  const branches = baseBranchesData?.branches ?? [];
  const headBranches = headBranchesData?.branches ?? [];

  // An unpushed current branch is still a valid head choice, so keep it listed
  // even when the remote does not report it yet.
  const headOptions = useMemo(
    () =>
      headBranches.includes(headBranch)
        ? headBranches
        : [headBranch, ...headBranches],
    [headBranches, headBranch],
  );

  const [head, setHead] = useState(headBranch);
  const [base, setBase] = useState<string>('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

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
        head,
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
    if (!head || !base) return;
    try {
      const created = await createPr.mutateAsync({
        directory,
        title: title.trim(),
        head,
        base,
        body: body.trim() || undefined,
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
    <div className='flex h-full min-h-0 flex-col'>
      <div className='scrollbar-thin min-h-0 flex-1 overflow-y-auto p-3'>
        <div className='mb-3 flex items-end gap-2'>
          <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
            <Label>{t.pullRequest.headBranch}</Label>
            <BranchSelect
              label={t.pullRequest.headBranch}
              value={head}
              branches={headOptions}
              isLoading={headBranchesLoading}
              loadingLabel={t.pullRequest.loadingBranches}
              placeholder={t.pullRequest.selectBranch}
              onSelect={setHead}
            />
          </div>

          <span className='text-muted pb-1.5 text-xs'>→</span>

          <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
            <Label>{t.pullRequest.baseBranch}</Label>
            <BranchSelect
              label={t.pullRequest.baseBranch}
              value={base}
              branches={branches}
              isLoading={baseBranchesLoading}
              loadingLabel={t.pullRequest.loadingBranches}
              placeholder={t.pullRequest.selectBranch}
              onSelect={setBase}
            />
          </div>
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
          <Label>{t.pullRequest.title}</Label>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t.pullRequest.titlePlaceholder}
            className='h-8 w-full px-2.5 text-sm rounded-md'
          />
        </div>

        <div className='mb-3 flex flex-col gap-1.5'>
          <div className='flex items-center justify-between'>
            <Label>{t.pullRequest.body}</Label>
            <Button
              size='sm'
              variant='ghost'
              className='h-6 gap-1 rounded-lg px-3 text-xs'
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
            className='scrollbar-thin min-h-32 w-full resize-none rounded-md text-sm'
            rows={8}
          />
        </div>
      </div>

      <div className='border-separator shrink-0 border-t p-3'>
        <Button
          variant='primary'
          className='w-full gap-1.5 rounded-lg'
          isDisabled={!title.trim() || !base || !head}
          isPending={createPr.isPending}
          onPress={submit}
        >
          <Icon data={CodeMerge} size={14} />
          {createPr.isPending
            ? t.pullRequest.creatingPullRequest
            : t.pullRequest.createPullRequest}
        </Button>
      </div>
    </div>
  );
}

function BranchSelect({
  label,
  value,
  branches,
  isLoading,
  loadingLabel,
  placeholder,
  onSelect,
}: {
  label: string;
  value: string;
  branches: string[];
  isLoading?: boolean;
  loadingLabel: string;
  placeholder: string;
  onSelect: (branch: string) => void;
}) {
  return (
    <Select
      size='sm'
      aria-label={label}
      value={value || undefined}
      onChange={(key) => onSelect(String(key))}
      placeholder={
        isLoading && branches.length === 0 ? loadingLabel : placeholder
      }
      className='w-full'
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className='rounded-lg'>
        <ListBox>
          {branches.map((branch) => (
            <ListBox.Item key={branch} id={branch} className='rounded-md'>
              <Label className='truncate'>{branch}</Label>
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
