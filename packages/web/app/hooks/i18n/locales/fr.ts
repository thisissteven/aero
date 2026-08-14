import { BaseTranslation } from '@/app/hooks/i18n/locales/translations';

export const fr: BaseTranslation = {
  welcome: (name: string) => `Bonjour, ${name} !`,
  nav: {
    home: 'Accueil',
    about: 'À propos',
  },
  itemsCount: 'Vous avez {count} articles dans votre panier.',
};
