// components/connect-provider-view.tsx
import { Button, Input, Label, Separator, Typography, toast } from '@aero/ui';
import { useState } from 'react';
import { RELOAD_OPENCODE_TOAST } from '@/app/hooks/api/pool';
import { useSetApiKey } from '@/app/hooks/api/providers';
import { useI18n } from '@/app/hooks/i18n';
import { InfoTooltip } from '@/app/providers/settings/general/components/info-tooltip';
import { ProviderDropdown } from '../providers-dropdown';
import { useProvidersStore } from '../providers-store';

export function ConnectProviderView() {
  const selectedProviderId = useProvidersStore((s) => s.selectedProviderId);
  const setSelectedProviderId = useProvidersStore(
    (s) => s.setSelectedProviderId,
  );
  const { t } = useI18n();
  const [apiKey, setApiKey] = useState('');

  // Use the provided hook for setting the API key
  const { mutateAsync: setApiKeyMutation, isPending } = useSetApiKey();

  const handleSave = async () => {
    if (!selectedProviderId || !apiKey) return;

    try {
      await setApiKeyMutation({
        provider: selectedProviderId,
        apiKey,
      });

      // Reset form state
      setApiKey('');
      setSelectedProviderId(null);

      // Notify the user
      toast(RELOAD_OPENCODE_TOAST);
    } catch (error) {
      console.error('Failed to save API key', error);
      // Optional: Add an error toast here if desired
      // toast.error('Failed to save API key');
    }
  };

  return (
    <div className='space-y-8'>
      <div>
        <Typography type='h4' weight='semibold' className='mb-1'>
          {t.settingsProviders.connectProvider}
        </Typography>
      </div>

      <Separator />

      <section className='space-y-6'>
        <Typography type='h6'>
          {t.settingsProviders.selectProviderHeading}
        </Typography>
        <ProviderDropdown />
      </section>

      <Separator />

      <section className='space-y-6'>
        <Typography type='h6'>{t.settingsProviders.authentication}</Typography>

        <div className='flex items-center gap-4'>
          <div className='flex w-20 shrink-0 items-center gap-1.5'>
            <Label>{t.settingsProviders.apiKey}</Label>
            <InfoTooltip>{t.settingsProviders.apiKeyTooltip}</InfoTooltip>
          </div>
          <div className='flex flex-1 items-center gap-2'>
            <Input
              type='password'
              placeholder={t.settingsProviders.apiKeyPlaceholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className='flex-1 font-mono text-sm'
            />
            <Button
              variant='secondary'
              className='shrink-0 rounded-xl'
              onClick={handleSave}
              isPending={isPending}
              isDisabled={!selectedProviderId || !apiKey}
            >
              {t.settingsProviders.saveKey}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
