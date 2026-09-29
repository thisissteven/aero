// app/components/chat-aside/pr/github-account-menu.tsx
//
// Header account switcher. Lists every account Aero can use (including the
// `gh` CLI one) and lets the user disable the CLI fallback entirely.

import { Avatar, Dropdown, Label, Separator, toast } from '@aero/ui';
import { ArrowRotateLeft, Check, Xmark } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import {
  useGitHubActivateAccount,
  useGitHubDisconnect,
  useGitHubSetGhCli,
} from '@/app/hooks/api/github';
import { useI18n } from '@/app/hooks/i18n';
import type { GitHubAuthStatus } from './types';
import { displayName } from './util';

export function GitHubAccountMenu({
  auth,
  onChanged,
}: {
  auth: GitHubAuthStatus;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const activateMutation = useGitHubActivateAccount();
  const ghCliMutation = useGitHubSetGhCli();
  const disconnect = useGitHubDisconnect();

  const accounts = auth.accounts ?? [];
  const ghCli = auth.ghCli;
  const user = auth.user ?? null;

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      onChanged();
    } catch (error) {
      toast.danger(
        error instanceof Error
          ? error.message
          : t.pullRequest.switchAccountFailed,
      );
    }
  };

  return (
    <Dropdown size='sm'>
      <Dropdown.Trigger
        aria-label={t.pullRequest.account}
        className='flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-default/50'
      >
        <Avatar size='sm'>
          <Avatar.Image
            src={user?.avatarUrl ?? undefined}
            alt={displayName(user)}
          />
          <Avatar.Fallback>
            {displayName(user).slice(0, 2).toUpperCase()}
          </Avatar.Fallback>
        </Avatar>
        <span className='text-foreground hidden truncate text-xs font-medium sm:inline'>
          {displayName(user)}
        </span>
      </Dropdown.Trigger>
      <Dropdown.Popover className='w-56' placement='bottom end'>
        <Dropdown.Menu aria-label={t.pullRequest.accounts}>
          {accounts.map((account) => (
            <Dropdown.Item
              key={account.id}
              id={`account:${account.id}`}
              textValue={displayName(account.user)}
              isDisabled={account.current}
              onPress={() =>
                void run(() =>
                  activateMutation.mutateAsync({ accountId: account.id }),
                )
              }
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
              <Label className='flex-1 truncate'>
                {account.user.name || displayName(account.user)}
                {account.source === 'gh-cli' && ' · gh'}
              </Label>
              {account.current && <Icon data={Check} size={14} />}
            </Dropdown.Item>
          ))}

          {ghCli?.available && (
            <>
              <Separator />
              <Dropdown.Item
                id='toggle-gh-cli'
                textValue={t.pullRequest.useGhCli}
                onPress={() =>
                  void run(() =>
                    ghCliMutation.mutateAsync({ disabled: !ghCli.disabled }),
                  )
                }
              >
                <Label className='flex-1'>
                  {ghCli.disabled
                    ? t.pullRequest.useGhCli
                    : t.pullRequest.ghCliEnabled}
                </Label>
                {ghCli.disabled ? (
                  <Icon data={ArrowRotateLeft} size={14} />
                ) : (
                  <Icon data={Xmark} size={14} />
                )}
              </Dropdown.Item>
            </>
          )}

          <Separator />
          <Dropdown.Item
            id='disconnect'
            variant='danger'
            textValue={t.pullRequest.disconnect}
            onPress={async () => {
              try {
                await disconnect.mutateAsync();
                toast.success(t.pullRequest.disconnected);
                onChanged();
              } catch (error) {
                toast.danger(
                  error instanceof Error
                    ? error.message
                    : t.pullRequest.disconnectFailed,
                );
              }
            }}
          >
            <Label>{t.pullRequest.disconnect}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
