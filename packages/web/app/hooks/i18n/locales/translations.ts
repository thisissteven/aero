import { en } from './en';
import { es } from './es';
import { fr } from './fr';

export const translations = {
  en,
  es,
  fr,
};

export type BaseTranslation = typeof en;
export type SupportedLanguage = keyof typeof translations;
export type TranslationsMap = Record<SupportedLanguage, BaseTranslation>;
