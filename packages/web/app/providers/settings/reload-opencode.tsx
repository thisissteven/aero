import { cn, IconButton, toast } from '@aero/ui';
import { ArrowsRotateRight } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useReloadOpencode } from '@/app/hooks/api/pool';
import { useI18n } from '@/app/hooks/i18n';

export function ReloadOpencode() {
  const { mutateAsync: reloadOpencode, isPending } = useReloadOpencode();
  const { t } = useI18n();

  return (
    <IconButton
      onPress={() =>
        toast.promise(reloadOpencode(), {
          error: t.settings.opencodeReloadFailed,
          loading: t.settings.reloadingOpencode,
          success: t.settings.opencodeReloaded,
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
      <span>{t.settings.reloadOpencode}</span>
    </IconButton>
  );
}
