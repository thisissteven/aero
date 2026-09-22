// app/components/chat-aside/pr/pull-request-panel.tsx
import { Avatar, Button, Chip, cn, Skeleton, Tooltip, toast } from '@aero/ui';
import {
  ArrowRotateLeft,
  ArrowUpRightFromSquare,
  CircleCheck,
  CircleInfo,
  CircleXmark,
  Clock,
  Copy,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useEffect, useRef, useState } from 'react';
import { useGitCurrentBranch } from '@/app/hooks/api/git';
import {
  useGitHubAuthStatus,
  useGitHubDisconnect,
  useGitHubExchangeDeviceCode,
  useGitHubPrStatus,
  useGitHubStartDeviceFlow,
} from '@/app/hooks/api/github';
import { useSessionDirectory } from '@/app/hooks/api/sessions';

export function PullRequestPanel() {
  const directory = useSessionDirectory();
  const { data: auth, isLoading: authLoading } = useGitHubAuthStatus();

  if (authLoading) return <AuthSkeleton />;

  const connected = Boolean(
    (auth as { connected?: boolean } | null | undefined)?.connected,
  );

  if (!connected) return <ConnectCard />;

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      <ConnectedHeader auth={auth} />
      <PrStatusSection directory={directory} />
    </div>
  );
}

interface DeviceFlowState {
  device_code: string;
  user_code: string;
  verification_uri: string;
  interval: number;
}

function ConnectCard() {
  const [flow, setFlow] = useState<DeviceFlowState | null>(null);
  const startMutation = useGitHubStartDeviceFlow();
  const exchangeMutation = useGitHubExchangeDeviceCode();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!flow) return;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        const result = (await exchangeMutation.mutateAsync({
          deviceCode: flow.device_code,
        })) as { connected?: boolean; error?: string };

        if (cancelled) return;

        if (result.connected) {
          toast.success('Connected to GitHub');
          setFlow(null);
          return;
        }

        timerRef.current = window.setTimeout(poll, flow.interval * 1000);
      } catch {
        if (!cancelled) {
          timerRef.current = window.setTimeout(poll, flow.interval * 1000);
        }
      }
    };

    timerRef.current = window.setTimeout(poll, flow.interval * 1000);

    return () => {
      cancelled = true;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [flow, exchangeMutation]);

  const handleStart = async () => {
    try {
      const result = (await startMutation.mutateAsync({})) as DeviceFlowState;
      setFlow(result);
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : 'Failed to start GitHub login',
      );
    }
  };

  const copyCode = async () => {
    if (!flow) return;
    try {
      await navigator.clipboard.writeText(flow.user_code);
      toast.success('Code copied');
    } catch {
      toast.danger('Copy failed');
    }
  };

  return (
    <div className='flex h-full items-center justify-center p-6'>
      <div className='border-separator bg-surface/60 w-full max-w-sm rounded-xl border p-5'>
        {!flow ? (
          <>
            <div className='text-foreground mb-1 text-sm font-medium'>
              Connect GitHub
            </div>
            <p className='text-muted mb-4 text-xs'>
              Sign in to see pull request status, CI checks, and reviews for the
              current branch.
            </p>
            <Button
              variant='primary'
              className='w-full'
              onPress={handleStart}
              isPending={startMutation.isPending}
            >
              Connect with GitHub
            </Button>
          </>
        ) : (
          <>
            <div className='text-foreground mb-1 text-sm font-medium'>
              Authorize this device
            </div>
            <p className='text-muted mb-3 text-xs'>
              Open the link below and enter this code:
            </p>

            <div className='border-separator bg-default/40 mb-3 flex items-center justify-between rounded-md border px-3 py-2'>
              <span className='font-mono text-lg tracking-[0.3em]'>
                {flow.user_code}
              </span>
              <Button
                size='sm'
                variant='ghost'
                isIconOnly
                onPress={copyCode}
                aria-label='Copy code'
              >
                <Icon data={Copy} size={14} />
              </Button>
            </div>

            <a
              href={flow.verification_uri}
              target='_blank'
              rel='noopener noreferrer'
              className='w-full'
            >
              Open {flow.verification_uri}
              <Icon data={ArrowUpRightFromSquare} size={12} />
            </a>

            <div className='text-muted mt-3 flex items-center justify-center gap-1.5 text-xs'>
              <Icon
                data={Clock}
                size={12}
                className={cn('animate-spin origin-center')}
              />
              Waiting for authorization…
            </div>

            <Button
              size='sm'
              variant='ghost'
              className='mt-2 w-full'
              onPress={() => setFlow(null)}
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function ConnectedHeader({ auth }: { auth: unknown }) {
  const me =
    (
      auth as
        | {
            user?: {
              login?: string;
              avatarUrl?: string | null;
              name?: string | null;
            };
          }
        | null
        | undefined
    )?.user ?? null;

  const disconnect = useGitHubDisconnect();

  return (
    <div className='border-separator flex items-center gap-2 border-b px-3 py-2'>
      <Avatar size='sm'>
        <Avatar.Image src={me?.avatarUrl ?? undefined} alt={me?.login ?? ''} />
        <Avatar.Fallback>
          {me?.login?.slice(0, 2).toUpperCase() ?? '?'}
        </Avatar.Fallback>
      </Avatar>
      <div className='min-w-0 flex-1'>
        <div className='truncate text-sm font-medium'>
          {me?.name || me?.login || 'GitHub'}
        </div>
        {me?.login && (
          <div className='text-muted truncate text-xs'>@{me.login}</div>
        )}
      </div>
      <Tooltip>
        <Tooltip.Trigger>
          <Button
            size='sm'
            variant='ghost'
            isIconOnly
            onPress={async () => {
              try {
                await disconnect.mutateAsync();
                toast.success('Disconnected');
              } catch (error) {
                toast.danger(
                  error instanceof Error ? error.message : 'Disconnect failed',
                );
              }
            }}
          >
            <Icon data={CircleXmark} size={14} />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>Disconnect</Tooltip.Content>
      </Tooltip>
    </div>
  );
}

interface CheckSummary {
  state: 'success' | 'failure' | 'pending' | 'unknown';
  total: number;
  success: number;
  failure: number;
  pending: number;
}

interface PrStatusShape {
  found?: boolean;
  number?: number;
  url?: string;
  state?: string;
  title?: string;
  headRef?: string;
  baseRef?: string;
  mergeable?: boolean | null;
  checks?: CheckSummary;
}

function PrStatusSection({ directory }: { directory?: string }) {
  const { data: branchData } = useGitCurrentBranch(directory);
  const branch =
    (branchData as { currentBranch?: string | null } | null | undefined)
      ?.currentBranch ?? undefined;

  const { data, isLoading, refetch, isFetching } = useGitHubPrStatus(
    directory,
    branch,
  );

  const status = data as PrStatusShape | null | undefined;

  if (!branch) {
    return (
      <div className='text-muted flex flex-1 items-center justify-center p-6 text-center text-sm'>
        No branch checked out
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='space-y-2 p-3'>
        <Skeleton className='h-6 w-3/4 rounded' />
        <Skeleton className='h-4 w-1/2 rounded' />
        <Skeleton className='h-16 w-full rounded' />
      </div>
    );
  }

  return (
    <div className='min-h-0 flex-1 overflow-y-auto p-3'>
      <div className='mb-3 flex items-center justify-between'>
        <span className='text-muted font-mono text-xs'>{branch}</span>
        <Button
          size='sm'
          variant='ghost'
          isIconOnly
          onPress={() => refetch()}
          aria-label='Refresh'
        >
          <Icon
            data={ArrowRotateLeft}
            size={12}
            className={cn(isFetching && 'animate-spin')}
          />
        </Button>
      </div>

      {!status?.found ? (
        <div className='border-separator bg-default/30 text-muted rounded-lg border border-dashed p-4 text-center text-sm'>
          <Icon data={CircleInfo} size={16} className='mx-auto mb-1.5' />
          No pull request for this branch
        </div>
      ) : (
        <div className='space-y-3'>
          <div className='border-separator bg-default/30 rounded-lg border p-3'>
            <div className='flex items-start gap-2'>
              <span className='text-muted shrink-0 font-mono text-xs'>
                #{status.number}
              </span>
              <div className='min-w-0 flex-1 text-sm font-medium'>
                {status.title}
              </div>
              {status.url && (
                <a
                  href={status.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label='Open on GitHub'
                >
                  <Icon data={ArrowUpRightFromSquare} size={12} />
                </a>
              )}
            </div>

            <div className='mt-2 flex flex-wrap items-center gap-1.5'>
              <StateChip state={status.state} />
              {status.headRef && status.baseRef && (
                <span className='text-muted font-mono text-xs'>
                  {status.headRef} → {status.baseRef}
                </span>
              )}
            </div>
          </div>

          {status.mergeable !== undefined && (
            <div className='flex items-center gap-2 text-sm'>
              <Icon
                data={status.mergeable ? CircleCheck : CircleInfo}
                size={14}
                className={status.mergeable ? 'text-success' : 'text-warning'}
              />
              <span className='text-muted'>
                {status.mergeable
                  ? 'Ready to merge'
                  : 'Merge conflicts or checks pending'}
              </span>
            </div>
          )}

          {status.checks && (
            <div className='border-separator bg-default/30 rounded-lg border p-3'>
              <div className='mb-2 flex items-center justify-between'>
                <span className='text-sm font-medium'>Checks</span>
                <ChecksChip summary={status.checks} />
              </div>

              <div className='grid grid-cols-3 gap-2 text-center text-xs'>
                <Stat
                  label='Passed'
                  value={status.checks.success}
                  tone='success'
                />
                <Stat
                  label='Failed'
                  value={status.checks.failure}
                  tone='danger'
                />
                <Stat
                  label='Pending'
                  value={status.checks.pending}
                  tone='warning'
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StateChip({ state }: { state?: string }) {
  const normalized = (state ?? '').toLowerCase();
  const color =
    normalized === 'open'
      ? 'success'
      : normalized === 'merged'
        ? 'accent'
        : normalized === 'closed'
          ? 'danger'
          : 'default';
  return (
    <Chip size='sm' variant='soft' color={color as never}>
      {state ?? 'unknown'}
    </Chip>
  );
}

function ChecksChip({ summary }: { summary: CheckSummary }) {
  const color =
    summary.state === 'success'
      ? 'success'
      : summary.state === 'failure'
        ? 'danger'
        : summary.state === 'pending'
          ? 'warning'
          : 'default';

  const icon =
    summary.state === 'success'
      ? CircleCheck
      : summary.state === 'failure'
        ? CircleXmark
        : Clock;

  return (
    <Chip size='sm' variant='soft' color={color as never}>
      <Icon data={icon} size={10} />
      {summary.state}
    </Chip>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'success' | 'danger' | 'warning';
}) {
  const colorClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'danger'
        ? 'text-danger'
        : 'text-warning';
  return (
    <div className='bg-default/40 rounded-md py-1.5'>
      <div className={cn('text-sm font-semibold', colorClass)}>{value}</div>
      <div className='text-muted text-[10px] uppercase tracking-wide'>
        {label}
      </div>
    </div>
  );
}

function AuthSkeleton() {
  return (
    <div className='space-y-2 p-3'>
      <Skeleton className='h-8 w-full rounded' />
      <Skeleton className='h-20 w-full rounded' />
    </div>
  );
}
