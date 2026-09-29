import {
  Button,
  Input,
  Label,
  Modal,
  SearchField,
  Segment,
  Spinner,
  Switch,
} from '@aero/ui';
import {
  ArrowLeft,
  Check,
  Folder,
  Lock,
  LogoGithub,
  Magnifier,
  Xmark,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useEffect, useMemo, useRef, useState } from 'react';

import { GitHubConnectCard } from '@/app/components/chat-aside/pr/github-connect-card';
import { FolderPicker } from '@/app/components/folder-picker';
import { useGitCloneRepo } from '@/app/hooks/api/git';
import {
  type GitHubUserRepo,
  useGitHubAuthStatus,
  useGitHubRepos,
} from '@/app/hooks/api/github';
import { useI18n } from '@/app/hooks/i18n';
import { useDebounce } from '@/app/hooks/useDebounce';
import { formatCompactRelativeTime } from '@/app/lib';
import { useGlobalModalStore } from '@/app/providers/global-modal/global-modal-store';
import { useFolderPickerStore } from '@/app/stores/folder-picker-store';
import { normalizePath } from '@/server/shared';

interface SelectedRepo {
  owner: string;
  name: string;
  fullName: string;
  cloneUrl: string;
}

interface GitHubRepoPickerProps {
  onSelect?: (path: string) => void;
  onClose?: () => void;
}

type PickerTab = 'repos' | 'url';
type PickerStep = 'repo' | 'destination';

/**
 * Adds a project by cloning a GitHub repository. Two ways in: browse the
 * connected account's repositories, or paste any GitHub URL (public repos work
 * while disconnected). The destination is chosen with the regular FolderPicker
 * so local and GitHub flows share one directory browser.
 */
export function GitHubRepoPicker({
  onSelect,
  onClose = () => useGlobalModalStore.getState().closeModal(),
}: GitHubRepoPickerProps) {
  const { t } = useI18n();
  const cloneMutation = useGitCloneRepo();
  const authQuery = useGitHubAuthStatus();
  const connected = Boolean(authQuery.data?.connected);

  const lastSelectedPath = useFolderPickerStore(
    (state) => state.lastSelectedPath,
  );

  const [tab, setTab] = useState<PickerTab>('repos');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [urlValue, setUrlValue] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [step, setStep] = useState<PickerStep>('repo');
  const [browsing, setBrowsing] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<SelectedRepo | null>(null);
  const [parentDir, setParentDir] = useState(lastSelectedPath);
  const [full, setFull] = useState(false);
  const [submodules, setSubmodules] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const reposQuery = useGitHubRepos(debouncedSearch, { enabled: connected });

  const repos = useMemo(() => {
    const raw = reposQuery.data?.pages.flatMap((page) => page.repos) ?? [];
    const byId = new Map<number, GitHubUserRepo>();
    for (const repo of raw) byId.set(repo.id, repo);
    return Array.from(byId.values());
  }, [reposQuery.data]);

  const targetDir = selectedRepo ? joinPath(parentDir, selectedRepo.name) : '';

  const isCloning = cloneMutation.isPending;

  const chooseRepo = (repo: SelectedRepo) => {
    setSelectedRepo(repo);
    setCloneError(null);
    setStep('destination');
  };

  const chooseUserRepo = (repo: GitHubUserRepo) => {
    chooseRepo({
      owner: repo.owner,
      name: repo.name,
      fullName: repo.fullName || `${repo.owner}/${repo.name}`,
      cloneUrl:
        repo.cloneUrl || `https://github.com/${repo.owner}/${repo.name}.git`,
    });
  };

  const handleUrlContinue = () => {
    const parsed = parseRepoInput(urlValue);
    if (!parsed) {
      setUrlError(t.githubRepoPicker.invalidUrl);
      return;
    }
    setUrlError(null);
    chooseRepo(parsed);
  };

  const handleClone = () => {
    if (!selectedRepo || !parentDir || isCloning) return;
    setCloneError(null);
    cloneMutation.mutate(
      {
        url: selectedRepo.cloneUrl,
        targetDir,
        full,
        submodules,
      },
      {
        onSuccess: (result) => {
          onSelect?.(result.path);
          onClose();
        },
        onError: (error) =>
          setCloneError(error.message || t.githubRepoPicker.cloneFailed),
      },
    );
  };

  // Choosing the destination reuses the existing folder browser.
  if (browsing) {
    return (
      <FolderPicker
        onSelect={(path) => {
          setParentDir(path);
          setBrowsing(false);
        }}
        onClose={() => setBrowsing(false)}
      />
    );
  }

  return (
    <Modal.Dialog className='bg-surface text-foreground my-auto flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl p-0 sm:h-[min(600px,calc(100vh-48px))]'>
      {/* Header */}
      <div className='border-separator flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3'>
        {step === 'destination' ? (
          <button
            type='button'
            disabled={isCloning}
            onClick={() => {
              setStep('repo');
              setCloneError(null);
            }}
            className='text-muted hover:text-foreground flex items-center gap-1.5 text-xs transition-colors disabled:opacity-40'
          >
            <Icon data={ArrowLeft} size={14} />
            {t.common.back}
          </button>
        ) : (
          <div className='flex items-center gap-2'>
            <Icon data={LogoGithub} size={16} />
            <span className='text-sm font-medium'>
              {t.githubRepoPicker.title}
            </span>
          </div>
        )}

        <button
          type='button'
          disabled={isCloning}
          onClick={onClose}
          aria-label={t.common.cancel}
          className='text-muted hover:text-foreground hover:bg-surface-secondary flex size-7 items-center justify-center rounded transition-colors disabled:opacity-40'
        >
          <Icon data={Xmark} size={16} />
        </button>
      </div>

      {step === 'repo' ? (
        <>
          <div className='border-separator shrink-0 border-b px-4 py-2'>
            <Segment
              selectedKey={tab}
              onSelectionChange={(key) => setTab(key as PickerTab)}
            >
              <Segment.Item id='repos'>
                {t.githubRepoPicker.repositoriesTab}
              </Segment.Item>
              <Segment.Item id='url'>{t.githubRepoPicker.urlTab}</Segment.Item>
            </Segment>
          </div>

          {tab === 'repos' ? (
            !connected || !authQuery.data ? (
              <div className='min-h-0 flex-1'>
                <GitHubConnectCard
                  auth={authQuery.data ?? null}
                  onConnected={() => void authQuery.refetch()}
                />
              </div>
            ) : (
              <>
                <div className='shrink-0 px-4 py-2'>
                  <SearchField
                    value={search}
                    onChange={setSearch}
                    className='h-7 w-full'
                    variant='primary'
                  >
                    <SearchField.Group className='border-separator rounded border'>
                      <Icon
                        data={Magnifier}
                        size={14}
                        className='text-muted ml-3'
                      />
                      <SearchField.Input
                        placeholder={t.githubRepoPicker.searchRepositories}
                        className='w-full pl-2 text-xs'
                      />
                      <SearchField.ClearButton />
                    </SearchField.Group>
                  </SearchField>
                </div>

                <div className='scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 pb-2'>
                  {reposQuery.isLoading && repos.length === 0 ? (
                    <div className='flex h-full items-center justify-center py-10'>
                      <Spinner className='text-muted size-5' />
                    </div>
                  ) : repos.length === 0 ? (
                    <div className='text-muted flex h-full items-center justify-center px-6 py-10 text-xs'>
                      {reposQuery.isError
                        ? t.githubRepoPicker.loadFailed
                        : t.githubRepoPicker.noRepositories}
                    </div>
                  ) : (
                    <div className='space-y-0.5'>
                      {repos.map((repo) => (
                        <RepoRow
                          key={repo.id}
                          repo={repo}
                          onSelect={() => chooseUserRepo(repo)}
                        />
                      ))}
                      <LoadMoreSentinel
                        enabled={Boolean(reposQuery.hasNextPage)}
                        onIntersect={() => void reposQuery.fetchNextPage()}
                      />
                    </div>
                  )}
                </div>
              </>
            )
          ) : (
            <div className='min-h-0 flex-1 overflow-y-auto p-4'>
              <Label>{t.githubRepoPicker.urlLabel}</Label>
              <Input
                variant='secondary'
                value={urlValue}
                onChange={(event) => {
                  setUrlValue(event.target.value);
                  if (urlError) setUrlError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleUrlContinue();
                }}
                placeholder={t.githubRepoPicker.urlPlaceholder}
                className='mt-1.5 w-full'
              />
              {urlError ? (
                <p className='text-danger mt-1.5 text-xs'>{urlError}</p>
              ) : (
                <p className='text-muted mt-1.5 text-xs'>
                  {t.githubRepoPicker.urlHint}
                </p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className='border-separator bg-surface-secondary/30 flex shrink-0 items-center justify-end gap-2 border-t px-4 py-2.5'>
            <Button variant='ghost' size='sm' onClick={onClose}>
              {t.common.cancel}
            </Button>
            {tab === 'url' && (
              <Button
                variant='primary'
                size='sm'
                isDisabled={!urlValue.trim()}
                onClick={handleUrlContinue}
              >
                {t.githubRepoPicker.continue}
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className='min-h-0 flex-1 overflow-y-auto p-4'>
            {selectedRepo && (
              <div className='border-separator bg-surface-secondary/40 flex items-center gap-3 rounded-lg border p-3'>
                <Icon
                  data={LogoGithub}
                  size={20}
                  className='text-muted shrink-0'
                />
                <div className='min-w-0 flex-1'>
                  <div className='text-foreground truncate text-sm font-medium'>
                    {selectedRepo.name}
                  </div>
                  <div className='text-muted truncate text-xs'>
                    {selectedRepo.owner}/{selectedRepo.name}
                  </div>
                </div>
              </div>
            )}

            <div className='mt-4'>
              <Label>{t.githubRepoPicker.cloneInto}</Label>
              <div className='border-separator mt-1.5 flex items-center gap-2 rounded-md border px-3 py-2'>
                <Icon
                  data={Folder}
                  size={14}
                  className='text-warning shrink-0'
                />
                <span
                  className='text-foreground min-w-0 flex-1 truncate font-mono text-xs'
                  title={targetDir}
                >
                  {targetDir || t.githubRepoPicker.noFolderSelected}
                </span>
                <Button
                  variant='ghost'
                  size='sm'
                  onPress={() => setBrowsing(true)}
                >
                  {t.githubRepoPicker.changeFolder}
                </Button>
              </div>
            </div>

            <div className='border-separator mt-4 divide-y rounded-lg border'>
              <OptionRow
                label={t.githubRepoPicker.fullHistory}
                description={t.githubRepoPicker.fullHistoryDescription}
                isSelected={full}
                onChange={setFull}
              />
              <OptionRow
                label={t.githubRepoPicker.submodules}
                description={t.githubRepoPicker.submodulesDescription}
                isSelected={submodules}
                onChange={setSubmodules}
              />
            </div>

            {cloneError && (
              <div className='text-danger mt-3 text-xs'>{cloneError}</div>
            )}
          </div>

          {/* Footer */}
          <div className='border-separator bg-surface-secondary/30 flex shrink-0 items-center justify-end gap-2 border-t px-4 py-2.5'>
            <Button
              variant='ghost'
              size='sm'
              isDisabled={isCloning}
              onClick={() => {
                setStep('repo');
                setCloneError(null);
              }}
            >
              {t.common.back}
            </Button>
            <Button
              variant='primary'
              size='sm'
              isPending={isCloning}
              isDisabled={!parentDir || !selectedRepo || isCloning}
              onClick={handleClone}
            >
              {isCloning
                ? t.githubRepoPicker.cloning
                : t.githubRepoPicker.clone}
            </Button>
          </div>
        </>
      )}
    </Modal.Dialog>
  );
}

function RepoRow({
  repo,
  onSelect,
}: {
  repo: GitHubUserRepo;
  onSelect: () => void;
}) {
  const { t } = useI18n();

  return (
    <button
      type='button'
      onClick={onSelect}
      className='hover:bg-surface-secondary/70 flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors'
    >
      <Icon
        data={LogoGithub}
        size={16}
        className='text-muted mt-0.5 shrink-0'
      />
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-1.5'>
          <span className='text-foreground truncate text-xs font-medium'>
            {repo.name}
          </span>
          {repo.private && (
            <span className='text-muted border-separator inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-px text-[10px]'>
              <Icon data={Lock} size={9} />
              {t.githubRepoPicker.privateRepo}
            </span>
          )}
        </div>
        <div className='text-muted truncate text-[11px]'>{repo.owner}</div>
        {repo.description && (
          <div className='text-muted mt-0.5 line-clamp-1 text-[11px]'>
            {repo.description}
          </div>
        )}
      </div>
      {repo.updatedAt && (
        <span className='text-muted shrink-0 text-[10px]'>
          {formatCompactRelativeTime(repo.updatedAt, true)}
        </span>
      )}
    </button>
  );
}

function OptionRow({
  label,
  description,
  isSelected,
  onChange,
}: {
  label: string;
  description: string;
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
}) {
  return (
    <div className='flex items-center justify-between gap-3 px-3 py-2.5'>
      <div className='min-w-0'>
        <div className='text-foreground text-xs font-medium'>{label}</div>
        <div className='text-muted text-[11px]'>{description}</div>
      </div>
      <Switch size='sm' isSelected={isSelected} onChange={onChange}>
        {({ isSelected: selected }) => (
          <Switch.Content>
            <Switch.Control className={selected ? 'bg-accent' : ''}>
              <Switch.Thumb>
                <Switch.Icon>
                  {selected ? (
                    <Check className='size-2 text-inherit opacity-100' />
                  ) : null}
                </Switch.Icon>
              </Switch.Thumb>
            </Switch.Control>
          </Switch.Content>
        )}
      </Switch>
    </div>
  );
}

/**
 * Fires when the sentinel scrolls into view. The observer's default root is the
 * viewport, and the modal's overflow clips it correctly, so no root ref is
 * needed even though the list has its own scroll container.
 */
function LoadMoreSentinel({
  enabled,
  onIntersect,
}: {
  enabled: boolean;
  onIntersect: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onIntersect);
  callbackRef.current = onIntersect;

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) callbackRef.current();
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  if (!enabled) return null;
  return <div ref={ref} className='h-6 w-full' />;
}

/** Joins a parent directory and a repo name, tolerating a trailing separator. */
function joinPath(parent: string, name: string): string {
  const base = normalizePath(parent).replace(/\/+$/, '');
  return base ? `${base}/${name}` : name;
}

/**
 * Accepts `https://github.com/o/r(.git)`, `git@github.com:o/r.git`, or the
 * `o/r` shorthand. Returns null for anything that is not a GitHub repo, so the
 * caller can show a validation message instead of cloning the wrong thing.
 */
function parseRepoInput(input: string): SelectedRepo | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const sshMatch = trimmed.match(/^git@([^:]+):(.+)$/);
  if (sshMatch) {
    return buildRepo(sshMatch[1], sshMatch[2]);
  }

  const shorthandMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (shorthandMatch) {
    return buildRepo('github.com', trimmed);
  }

  try {
    const url = new URL(
      trimmed.includes('://') ? trimmed : `https://${trimmed}`,
    );
    if (
      url.hostname !== 'github.com' &&
      !url.hostname.endsWith('.github.com')
    ) {
      return null;
    }
    return buildRepo(url.hostname, url.pathname.replace(/^\/+/, ''));
  } catch {
    return null;
  }
}

function buildRepo(host: string, pathPart: string): SelectedRepo | null {
  const cleaned = pathPart.replace(/\/+$/, '').replace(/\.git$/i, '');
  const [owner, repo] = cleaned.split('/');
  if (!owner || !repo) return null;
  return {
    owner,
    name: repo,
    fullName: `${owner}/${repo}`,
    cloneUrl: `https://${host}/${owner}/${repo}.git`,
  };
}
