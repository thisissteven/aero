import React, { createContext, ReactNode, useContext, useState } from 'react';

import { BaseTranslation } from '@/app/hooks/i18n/locales/translations';

interface I18nContextType {
  t: BaseTranslation;
  language: string;
  setLanguage: (lang: string) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({
  children,
  translations,
  defaultLanguage = 'en',
}: {
  children: ReactNode;
  translations: Record<string, BaseTranslation>;
  defaultLanguage?: string;
}) {
  const [language, setLanguage] = useState(defaultLanguage);

  const t = translations[language] ?? translations[defaultLanguage];

  return (
    <I18nContext.Provider value={{ t, language, setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
