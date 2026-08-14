import { BaseTranslation } from '@/app/hooks/i18n/locales/translations';

export const es: BaseTranslation = {
  welcome: (name: string) => `¡Hola, ${name}!`,
  nav: {
    home: 'Inicio',
    about: 'Sobre Nosotros',
  },
  itemsCount: 'Tienes {count} artículos en tu carrito.',
};
