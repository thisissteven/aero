import { Dropdown, Label } from '@aero/ui';
import { Check, Copy } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useRef } from 'react';
import { useI18n } from '@/app/hooks/i18n';
import { useCopyToClipboard } from '@/app/hooks/useCopyToClipboard';
import { copyButtonCss } from '@/app/lib/file';

export function CopyPath({
  path,
  withIcon = true,
}: {
  path: string;
  withIcon?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { t } = useI18n();

  const { copied, copy } = useCopyToClipboard({
    animatedRef: containerRef,
  });

  return (
    <Dropdown.Item onPress={() => copy(path)} shouldCloseOnSelect={false}>
      <style dangerouslySetInnerHTML={{ __html: copyButtonCss }} />

      <div ref={containerRef} className='t-text-swap items-center gap-2.25'>
        {withIcon && (
          <div className='shrink-0'>
            {copied ? (
              <Icon size={16} data={Check} />
            ) : (
              <Icon size={16} data={Copy} />
            )}
          </div>
        )}

        <Label className='min-w-0 flex-1'>
          {copied ? t.common.copied : t.chatNavbar.copyPath}
        </Label>
      </div>
    </Dropdown.Item>
  );
}
