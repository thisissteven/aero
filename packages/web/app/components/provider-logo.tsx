import { cn } from '@aero/ui';
import React from 'react';

import { useI18n } from '@/app/hooks/i18n';
import { useProviderLogo } from '@/app/hooks/useProviderLogo';

interface ProviderLogoProps {
  providerId: string;
  alt?: string;
  className?: string;
  onError?: () => void;
}

export const ProviderLogo = ({
  providerId,
  alt,
  className,
  onError: externalOnError,
}: ProviderLogoProps) => {
  const { t } = useI18n();
  const {
    src,
    onError: handleInternalError,
    hasLogo,
  } = useProviderLogo(providerId);

  const handleError = React.useCallback(() => {
    handleInternalError();
    externalOnError?.();
  }, [handleInternalError, externalOnError]);

  if (!hasLogo || !src) {
    return null;
  }

  return (
    <img
      src={src}
      alt={alt || t.settingsProviders.providerLogoAlt(providerId)}
      className={cn('object-contain dark:invert', className)}
      loading='eager'
      decoding='async'
      fetchPriority='high'
      draggable={false}
      onError={handleError}
    />
  );
};
