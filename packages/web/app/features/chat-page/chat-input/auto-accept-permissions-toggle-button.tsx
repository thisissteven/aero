import { ShieldCheck } from '@gravity-ui/icons';

import { ToggleButton, Tooltip } from '@aero/ui';

import { useConfig, useSetAutoAcceptPermissions } from '@/app/hooks/api/config';

export function AutoAcceptPermissionsToggleButton() {
  const { data: config } = useConfig();
  const { mutateAsync: setAutoAcceptPermissions } = useSetAutoAcceptPermissions(
    {
      harnessId: undefined,
      directory:
        'C:/Users/Steven/.aero/workspaces/74f9ff0a-bce2-4fd6-8623-9c74157c4605',
    },
  );

  // const allPermissionsAllowed = config?.permission?.['*'] === 'allow';

  return (
    <Tooltip delay={300}>
      <Tooltip.Trigger>
        <ToggleButton
          isIconOnly
          aria-label='Auto Accept Permissions'
          variant='ghost'
          size='sm'
          className='rounded-lg'
          onPress={() => {
            setAutoAcceptPermissions(true);
          }}
        >
          <ShieldCheck />
        </ToggleButton>
      </Tooltip.Trigger>
      <Tooltip.Content>
        w{/* Auto accept permissions: {allPermissionsAllowed ? 'on' : 'off'} */}
      </Tooltip.Content>
    </Tooltip>
  );
}
