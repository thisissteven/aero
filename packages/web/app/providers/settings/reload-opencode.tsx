import { cn, IconButton, toast } from '@aero/ui';
import { ArrowsRotateRight } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useReloadOpencode } from '@/app/hooks/api/pool';

export function ReloadOpencode() {
  const { mutateAsync: reloadOpencode, isPending } = useReloadOpencode();

  return (
    <IconButton
      onPress={() =>
        toast.promise(reloadOpencode(), {
          error: 'Opencode failed to reload',
          loading: 'Reloading opencode...',
          success: 'Opencode reloaded successfully',
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
