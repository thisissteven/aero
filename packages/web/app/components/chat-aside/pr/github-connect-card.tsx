// app/components/chat-aside/pr/github-connect-card.tsx
//
// The signed-out state of the GitHub panel: start a device flow, or reuse an
// account Aero already knows about (`gh` CLI, or a previously added account).
// The server folds the `gh` CLI account into `accounts`, so both paths render
// through the same list.

import { Avatar, Button, cn, toast } from '@aero/ui';
import { ArrowUpRightFromSquare, Clock, Copy } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useEffect, useRef, useState } from 'react';

import {
  useGitHubActivateAccount,
  useGitHubCompleteDeviceFlow,
  useGitHubStartDeviceFlow,
} from '@/app/hooks/api/github';
import { useI18n } from '@/app/hooks/i18n';
import type { DeviceFlowStart, GitHubAccount, GitHubAuthStatus } from './types';
import { displayName } from './util';

export function GitHubConnectCard({
  auth,
  onConnected,
}: {
  auth: GitHubAuthStatus | null;
  onConnected: () => void;
}) {
  const { t } = useI18n();
  const [flow, setFlow] = useState<DeviceFlowStart | null>(null);
  const startMutation = useGitHubStartDeviceFlow();
  const exchangeMutation = useGitHubCompleteDeviceFlow();
  const activateMutation = useGitHubActivateAccount();
  const timerRef = useRef<number | null>(null);

  const accounts = auth?.accounts ?? [];

  useEffect(() => {
    if (!flow) return;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        const result = await exchangeMutation.mutateAsync({
          deviceCode: flow.deviceCode,
        });
        if (cancelled) return;

        if (result.connected) {
          toast.success(t.pullRequest.connectedToGitHub);
          setFlow(null);
          onConnected();
          return;
        }
      } catch {
        // A failed poll is normal while GitHub still says authorization_pending;
        // keep polling until the user cancels or the code expires.
      }
      if (!cancelled) {
        timerRef.current = window.setTimeout(poll, flow.interval * 1000);
      }
    };

    timerRef.current = window.setTimeout(
      poll,
      Math.max(flow.interval, 1) * 1000,
    );

    return () => {
      cancelled = true;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [flow, exchangeMutation, onConnected, t]);

  const handleStart = async () => {
    try {
      setFlow((await startMutation.mutateAsync({})) as DeviceFlowStart);
    } catch (error) {
      toast.danger(
        error instanceof Error
          ? error.message
          : t.pullRequest.failedToStartGithubLogin,
      );
    }
  };

  const copyCode = async () => {
    if (!flow) return;
    try {
      await navigator.clipboard.writeText(flow.userCode);
      toast.success(t.pullRequest.codeCopied);
    } catch {
      toast.danger(t.pullRequest.copyFailed);
    }
  };

  const useAccount = async (account: GitHubAccount) => {
    try {
      await activateMutation.mutateAsync({ accountId: account.id });
      onConnected();
    } catch (error) {
      toast.danger(
        error instanceof Error
          ? error.message
          : t.pullRequest.switchAccountFailed,
      );
    }
  };

  return (
    <div className='flex h-full items-center justify-center overflow-y-auto p-6'>
      <div className='border-separator bg-surface/60 w-full max-w-sm rounded-xl border p-5'>
        <div className='text-foreground mb-1 text-sm font-medium'>
          {t.pullRequest.connectGitHub}
        </div>
        <p className='text-muted mb-4 text-xs'>
          {t.pullRequest.signInDescription}
        </p>

        {flow ? (
          <>
            <div className='text-foreground mb-1 text-sm font-medium'>
              {t.pullRequest.authorizeDevice}
            </div>
            <p className='text-muted mb-3 text-xs'>
              {t.pullRequest.openLinkDescription}
            </p>

            <div className='border-separator bg-default/40 mb-3 flex items-center justify-between rounded-md border px-3 py-2'>
              <span className='font-mono text-lg tracking-[0.3em]'>
                {flow.userCode}
              </span>
              <Button
                size='sm'
                variant='ghost'
                isIconOnly
                onPress={copyCode}
                aria-label={t.pullRequest.copyCodeAria}
              >
                <Icon data={Copy} size={14} />
              </Button>
            </div>

            <a
              href={flow.verificationUriComplete ?? flow.verificationUri}
              target='_blank'
              rel='noopener noreferrer'
              className='text-accent inline-flex items-center gap-1 text-xs'
            >
              {t.pullRequest.openOnGitHub}
              <Icon data={ArrowUpRightFromSquare} size={12} />
            </a>

            <div className='text-muted mt-3 flex items-center justify-center gap-1.5 text-xs'>
              <Icon
                data={Clock}
                size={12}
                className='origin-center animate-spin'
              />
              {t.pullRequest.waitingForAuthorization}
            </div>

            <Button
              size='sm'
              variant='ghost'
              className='mt-2 w-full'
              onPress={() => setFlow(null)}
            >
              {t.common.cancel}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant='primary'
              className='w-full'
              onPress={handleStart}
              isPending={startMutation.isPending}
            >
              {t.pullRequest.connectWithGitHub}
            </Button>

            {accounts.length > 0 && (
              <div className='mt-4'>
                <div className='text-muted mb-2 text-[10px] font-medium tracking-wide uppercase'>
                  {t.pullRequest.accounts}
                </div>
                <div className='space-y-1'>
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      type='button'
                      disabled={account.current}
                      onClick={() => void useAccount(account)}
                      className={cn(
                        'hover:bg-default/50 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
                        account.current && 'bg-default/40 cursor-default',
                      )}
                    >
                      <Avatar size='sm'>
                        <Avatar.Image
                          src={account.user.avatarUrl ?? undefined}
                          alt={displayName(account.user)}
                        />
                        <Avatar.Fallback>
                          {displayName(account.user).slice(0, 2).toUpperCase()}
                        </Avatar.Fallback>
                      </Avatar>
                      <div className='min-w-0 flex-1'>
                        <div className='truncate text-sm'>
                          {account.user.name || displayName(account.user)}
                        </div>
                        <div className='text-muted truncate text-xs'>
                          @{displayName(account.user)}
                          {account.source === 'gh-cli' && ' · gh'}
                        </div>
                      </div>
                      {account.current && (
                        <span className='text-success text-[10px] font-medium'>
                          {t.pullRequest.connectedToGitHub}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
