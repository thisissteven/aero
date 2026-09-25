import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { id } from './id';
import { ja } from './ja';
import { zh } from './zh';
import { zhTW } from './zh-TW';

export const translations = {
  en,
  zh,
  'zh-TW': zhTW,
  id,
  es,
  fr,
  de,
  ja,
};

export type BaseTranslation = typeof en;
export type SupportedLanguage = keyof typeof translations;
export type TranslationsMap = Record<SupportedLanguage, BaseTranslation>;
