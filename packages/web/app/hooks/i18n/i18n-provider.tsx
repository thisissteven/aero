import { ReactNode, useCallback, useState } from 'react';
import {
  SupportedLanguage,
  TranslationsMap,
} from '@/app/hooks/i18n/locales/translations';
import { I18nContext } from '@/app/hooks/i18n/use-i18n';

const STORAGE_KEY = 'aero.language';

function getInitialLanguage(
  defaultLanguage: SupportedLanguage,
  supportedLanguages: SupportedLanguage[],
): SupportedLanguage {
  if (typeof window === 'undefined') return defaultLanguage;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && supportedLanguages.includes(stored as SupportedLanguage)) {
    return stored as SupportedLanguage;
  }
  return defaultLanguage;
}

export function I18nProvider({
  children,
  translations,
  defaultLanguage = 'en',
}: {
  children: ReactNode;
  translations: TranslationsMap;
  defaultLanguage?: SupportedLanguage;
}) {
  const supportedLanguages = Object.keys(translations) as SupportedLanguage[];
  const [language, setLanguage] = useState<SupportedLanguage>(() =>
    getInitialLanguage(defaultLanguage, supportedLanguages),
  );

  const updateLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguage(lang);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        // ignore storage errors
      }
    }
  }, []);

  const t = translations[language] ?? translations[defaultLanguage];

  return (
    <I18nContext.Provider value={{ t, language, setLanguage: updateLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}
