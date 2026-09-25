import {
  ArrowRightArrowLeft,
  CircleDashed,
  CircleTree,
  FaceRobot,
  File,
  FileCode,
  Globe,
  LogoGithub,
  Terminal,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { BaseTranslation } from '@/app/hooks/i18n/locales/translations';
import { Theme } from '@/app/providers';

export const PAGINATION_LIMIT = 10;

export function getCheckboxVariant(theme: Theme) {
  return theme === 'dark' ? 'secondary' : 'primary';
}

export const collapsibleNav = [
  {
    id: 'git',
    icon: <Icon data={CircleTree} className='-scale-y-100' size={18} />,
    labelKey: 'git',
    descriptionKey: 'gitDescription',
  },
  {
    id: 'context',
    icon: <Icon data={CircleDashed} size={18} />,
    labelKey: 'context',
    descriptionKey: 'contextDescription',
  },
  {
    id: 'pr',
    icon: <Icon data={LogoGithub} size={18} />,
    labelKey: 'pr',
    descriptionKey: 'prDescription',
  },
  {
    id: 'changes',
    icon: <Icon data={ArrowRightArrowLeft} size={18} />,
    labelKey: 'changes',
    descriptionKey: 'changesDescription',
  },
  {
    id: 'files',
    icon: <Icon data={FileCode} size={18} />,
    labelKey: 'files',
    descriptionKey: 'filesDescription',
  },
  {
    id: 'terminal',
    icon: <Icon data={Terminal} size={18} />,
    labelKey: 'terminal',
    descriptionKey: 'terminalDescription',
  },
  {
    id: 'notes',
    icon: <Icon data={File} size={18} />,
    labelKey: 'notes',
    descriptionKey: 'notesDescription',
  },
  {
    id: 'browser',
    icon: <Icon data={Globe} size={18} />,
    labelKey: 'browser',
    descriptionKey: 'browserDescription',
  },
  {
    id: 'side-chat',
    icon: <Icon data={FaceRobot} size={18} />,
    labelKey: 'subagentsHistory',
    descriptionKey: 'subagentsHistoryDescription',
  },
] as const;

export type NavItem = (typeof collapsibleNav)[number];
export type NavItemId = NavItem['id'];
export type NavLabelKey = keyof BaseTranslation['nav'];
