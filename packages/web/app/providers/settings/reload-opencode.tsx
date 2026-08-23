import { ArrowsRotateRight } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { cn, toast } from '@aero/ui';

import { IconButton } from '@/app/components/ui/icon-button';
import { useReloadOpencode } from '@/app/hooks/api/pool';

export function ReloadOpencode() {
  const { mutateAsync: reloadOpencode, isPending } = useReloadOpencode();

  return (
    <IconButton
      onPress={() =>
        toast.promise(reloadOpencode(), {
          error: 'Reload failed',
          loading: 'Reloading opencode...',
          success: 'Reload success',
        })
      }
      isIconOnly={false}
      className='w-full'
      isDisabled={isPending}
    >
      <Icon
        data={ArrowsRotateRight}
        className={cn('size-4', isPending && 'animate-spin')}
      />
      <span>Reload OpenCode</span>
    </IconButton>
  );
}
