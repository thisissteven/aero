import { en } from './en';
import { id } from './id';
import { zh } from './zh';

export const translations = {
  en,
  zh,
  id,
};

export type BaseTranslation = typeof en;
export type SupportedLanguage = keyof typeof translations;
export type TranslationsMap = Record<SupportedLanguage, BaseTranslation>;
