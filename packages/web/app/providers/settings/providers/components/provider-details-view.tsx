// components/provider-details-view.tsx
import { Button, Input, Separator, Tooltip, Typography, toast } from '@aero/ui';
import {
  Check,
  Eye,
  EyeSlash,
  File,
  Magnifier,
  Picture,
  Sparkles,
  Video,
  Volume,
  Wrench,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useMemo, useState } from 'react';
import { RELOAD_OPENCODE_TOAST } from '@/app/hooks/api/pool';
import {
  useConfiguredProviders,
  useDisconnectProvider,
} from '@/app/hooks/api/providers';
import { useHiddenModels, useUpdateSetting } from '@/app/hooks/api/settings';
import { InfoTooltip } from '@/app/providers/settings/general/components/info-tooltip';
import { useProvidersStore } from '../providers-store';

// --- Capability Badges Component ---

interface ModelCapabilities {
  temperature?: boolean;
  reasoning?: boolean;
  attachment?: boolean;
  toolcall?: boolean;
  interleaved?: boolean | { field: string };
  input?: {
    text?: boolean;
    audio?: boolean;
    image?: boolean;
    video?: boolean;
    pdf?: boolean;
  };
  output?: {
    text?: boolean;
    audio?: boolean;
    image?: boolean;
    video?: boolean;
    pdf?: boolean;
  };
}

function ModelCapabilityBadges({
  capabilities,
}: {
  capabilities: ModelCapabilities;
}) {
  const badges = [];

  if (capabilities.reasoning)
    badges.push({ key: 'reasoning', icon: Sparkles, label: 'Reasoning' });
  if (capabilities.toolcall)
    badges.push({ key: 'toolcall', icon: Wrench, label: 'Tool Calling' });
  if (capabilities.input?.image || capabilities.input?.video)
    badges.push({ key: 'input-image', icon: Picture, label: 'Image Input' });
  if (capabilities.input?.audio)
    badges.push({ key: 'input-audio', icon: Volume, label: 'Audio Input' });
  if (capabilities.input?.video)
    badges.push({ key: 'input-video', icon: Video, label: 'Video Input' });
  if (capabilities.input?.pdf)
    badges.push({ key: 'input-pdf', icon: File, label: 'PDF Input' });

  if (badges.length === 0) return null;

  return (
    <div className='flex items-center gap-0.5'>
      {badges.map(({ key, icon, label }) => (
        <Tooltip key={key}>
          <Tooltip.Trigger>
            <div className='flex h-6 w-6 cursor-help items-center justify-center rounded hover:bg-surface-secondary'>
              <Icon data={icon} className='text-muted size-3.5' />
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <Typography type='body-xs'>{label}</Typography>
          </Tooltip.Content>
        </Tooltip>
      ))}
    </div>
  );
}

// --- Main View ---

export function ProviderDetailsView() {
  const selectedProviderId = useProvidersStore((s) => s.selectedProviderId);
  const { data: providers = [], isLoading } = useConfiguredProviders();
  const { mutateAsync: disconnectProvider, isPending: isDisconnecting } =
    useDisconnectProvider();
  const { mutateAsync: updateSetting } = useUpdateSetting();
  const [searchQuery, setSearchQuery] = useState('');

  const setViewMode = useProvidersStore((state) => state.setViewMode);
  const setSelectedProviderId = useProvidersStore(
    (state) => state.setSelectedProviderId,
  );

  const provider = providers.find((p) => p.id === selectedProviderId);
  const hiddenModelIds = useHiddenModels(selectedProviderId);

  const allModels = useMemo(() => {
    if (!provider?.models) return [];
    return Object.values(provider.models);
  }, [provider]);

  const models = useMemo(
    () =>
      allModels.filter((model) =>
        model.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [allModels, searchQuery],
  );

  const persistHidden = (next: string[]) => {
    if (!provider) return;
    updateSetting({
      path: ['hiddenModels', provider.id],
      value: next.length > 0 ? next : undefined,
    });
  };

  const toggleModelHidden = (modelId: string) => {
    const next = hiddenModelIds.includes(modelId)
      ? hiddenModelIds.filter((id) => id !== modelId)
      : [...hiddenModelIds, modelId];
    persistHidden(next);
  };

  const hideAll = () => {
    persistHidden(allModels.map((m) => m.id));
  };

  const showAll = () => {
    persistHidden([]);
  };

  if (isLoading) {
    return (
      <div className='text-muted flex h-full items-center text-sm justify-center'>
        Loading provider details...
      </div>
    );
  }

  if (!provider) return null;

  const totalModels = allModels.length;
  const hiddenCount = hiddenModelIds.length;

  return (
    <div className='space-y-8 pb-10'>
      {/* Header */}
      <div>
        <div className='flex items-center gap-2'>
          <Typography type='h4' weight='semibold'>
            {provider.name}
          </Typography>
        </div>
        <Typography type='body-sm' color='muted' className='mt-1'>
          {provider.id}
        </Typography>
      </div>

      {/* Authentication */}
      <section className='space-y-4'>
        <div className='flex items-center justify-between'>
          <Typography type='h6'>Authentication</Typography>
          <Button
            variant='outline'
            size='sm'
            className='rounded-lg'
            onPress={() => {
              setViewMode('connect');
              setSelectedProviderId(provider.id);
            }}
          >
            reconnect
          </Button>
        </div>
        <div className='text-success flex items-center gap-2'>
          <Icon data={Check} className='size-4' />
          <span className='text-sm font-medium'>Connected</span>
          <InfoTooltip>
            Your connection to this provider is active and working.
          </InfoTooltip>
        </div>
      </section>

      <Separator />

      {/* Connection Details */}
      <section className='space-y-4'>
        <Typography type='h6'>Connection Details</Typography>
        <div className='flex items-center justify-between'>
          <Typography type='body-sm' color='muted'>
            Configured in: {provider.source} credentials
          </Typography>
          <Button
            variant='danger'
            size='sm'
            className='rounded-lg'
            onPress={async () => {
              await disconnectProvider({ provider: provider.id });
              toast(RELOAD_OPENCODE_TOAST);
            }}
            isPending={isDisconnecting}
          >
            disconnect
          </Button>
        </div>
      </section>

      <Separator />

      {/* Available Models */}
      <section className='space-y-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Typography type='h6'>Available Models</Typography>
            <Typography type='body-sm' color='muted'>
              ({totalModels}
              {hiddenCount > 0 && ` · ${hiddenCount} hidden`})
            </Typography>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              className='rounded-lg'
              onPress={hideAll}
              isDisabled={hiddenCount === totalModels}
            >
              hide all
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='rounded-lg'
              onPress={showAll}
              isDisabled={hiddenCount === 0}
            >
              show all
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className='relative'>
          <Icon
            data={Magnifier}
            className='text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2'
          />
          <Input
            placeholder='Filter models...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full pl-9 font-normal'
          />
        </div>

        {/* Models List */}
        <div className='flex flex-col'>
          {models.length === 0 ? (
            <div className='text-muted py-8 text-center text-sm'>
              No models found.
            </div>
          ) : (
            models.map((model) => {
              const isHidden = hiddenModelIds.includes(model.id);
              return (
                <div
                  key={model.id}
                  className={`border-separator flex w-full flex-col gap-0.5 border-b py-3 transition-opacity last:border-0 ${
                    isHidden ? 'opacity-40' : ''
                  }`}
                >
                  <Typography type='body-xs'>{model.name}</Typography>
                  <div className='flex w-full items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <span className='bg-surface-secondary text-muted shrink-0 rounded px-2 py-0.5 text-[10px] font-medium'>
                        {model.limit.context >= 1000000
                          ? `${(model.limit.context / 1000000).toFixed(1)}M`
                          : `${(model.limit.context / 1000).toFixed(1)}K`}{' '}
                        ctx ·{' '}
                        {model.limit.output >= 1000
                          ? `${(model.limit.output / 1000).toFixed(1)}K`
                          : model.limit.output}{' '}
                        out
                      </span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <ModelCapabilityBadges
                        capabilities={model.capabilities}
                      />
                      <Tooltip>
                        <Tooltip.Trigger>
                          <button
                            onClick={() => toggleModelHidden(model.id)}
                            className='text-muted hover:text-foreground flex h-6 w-6 items-center justify-center rounded transition-colors'
                            aria-label={
                              isHidden ? 'Unhide model' : 'Hide model'
                            }
                          >
                            <Icon
                              data={isHidden ? EyeSlash : Eye}
                              className='size-3.5'
                            />
                          </button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          <Typography type='body-xs'>
                            {isHidden ? 'Unhide model' : 'Hide model'}
                          </Typography>
                        </Tooltip.Content>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
