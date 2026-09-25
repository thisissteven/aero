import { cn, toast } from '@aero/ui';
import { Check, Xmark } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { sessionKeys, useRenameSession } from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';
import { useKeyPress } from '@/app/hooks/useKeyPress';
import { useOnClickOutside } from '@/app/hooks/useOnClickOutside';
import {
  useNavbarSessionRenameStore,
  useRecentsSessionRenameStore,
  useWorkspacesSessionRenameStore,
} from '@/app/stores/session-rename';

export function SessionTitleEditable({
  from,
  sessionId,
  sessionTitle,
  className = 'sm:text-base text-sm font-semibold',
  buttonClassName,
  iconSize = 14,
}: {
  from: 'navbar' | 'recents' | 'workspaces';
  sessionId: string;
  sessionTitle: string;
  className?: string;
  buttonClassName?: string;
  iconSize?: number;
}) {
  const { mutateAsync, isPending } = useRenameSession();
  const { t } = useI18n();
  const cancelRenameNavbar = useNavbarSessionRenameStore(
    (state) => state.cancelRename,
  );
  const cancelRenameRecents = useRecentsSessionRenameStore(
    (state) => state.cancelRename,
  );
  const cancelRenameWorkspaces = useWorkspacesSessionRenameStore(
    (state) => state.cancelRename,
  );

  const cancelRename = useMemo(() => {
    switch (from) {
      case 'navbar':
        return cancelRenameNavbar;
      case 'recents':
        return cancelRenameRecents;
      case 'workspaces':
        return cancelRenameWorkspaces;
    }
  }, [from]);

  const queryClient = useQueryClient();

  const [value, setValue] = useState(sessionTitle);

  const ref = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useOnClickOutside(formRef, cancelRename);
  useKeyPress('Escape', cancelRename, { ignoreInputs: false });

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.focus();
        const length = ref.current.value.length;
        ref.current.setSelectionRange(length, length);
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <form
      ref={formRef}
      className='absolute inset-0'
      onSubmit={(e) => {
        e.preventDefault();

        const title = value.trim();

        if (title === sessionTitle) {
          cancelRename();
          return;
        }

        const processRename = async () => {
          await mutateAsync({ sessionId, title });

          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: sessionKeys.merged(),
            }),
            queryClient.invalidateQueries({
              queryKey: sessionKeys.detail(undefined, sessionId),
            }),
          ]);

          cancelRename();
        };

        toast.promise(processRename(), {
          loading: t.sessionTitle.renamingSession,
          error: (err) => err.message,
          success: t.sessionTitle.sessionRenamed,
        });
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className='flex h-full w-full items-center gap-2'
      >
        <input
          ref={ref}
          placeholder={t.sessionTitle.enterSessionTitle}
          value={value}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              return;
            }

            e.stopPropagation();
          }}
          onChange={(e) => setValue(e.target.value)}
          className={cn(
            'text-foreground relative z-1 min-w-0 flex-1 focus-visible:outline-none',
            className,
          )}
        />

        <div
          className={cn(
            'relative z-1 flex shrink-0 items-center',
            iconSize <= 16 && 'gap-0.75',
            iconSize <= 12 && 'gap-0.5',
          )}
        >
          <button
            disabled={isPending}
            onClick={(e) => e.stopPropagation()}
            type='submit'
            className={cn(
              'bg-default/40 backdrop-blur-sm cursor-pointer rounded-md p-1 transition active:scale-95 disabled:pointer-events-none disabled:opacity-50',
              buttonClassName,
            )}
          >
            <Icon data={Check} size={iconSize} />
          </button>
          <button
            disabled={isPending}
            type='button'
            className={cn(
              'bg-default/40 backdrop-blur-sm cursor-pointer rounded-md p-1 transition active:scale-95 disabled:pointer-events-none disabled:opacity-50',
              buttonClassName,
            )}
            onClick={(e) => {
              e.stopPropagation();
              cancelRename();
            }}
          >
            <Icon data={Xmark} size={iconSize} />
          </button>
        </div>
      </div>
    </form>
  );
}
