import { createContext, useContext } from 'react';

import { BaseTranslation } from '@/app/hooks/i18n/locales/translations';

interface I18nContextType {
  t: BaseTranslation;
  language: string;
  setLanguage: (lang: string) => void;
}

export const I18nContext = createContext<I18nContextType | undefined>(
  undefined,
);

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
