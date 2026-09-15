import { ReactNode, useState } from 'react';
import { BaseTranslation } from '@/app/hooks/i18n/locales/translations';
import { I18nContext } from '@/app/hooks/i18n/use-i18n';

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
