import {
  ArrowRightArrowLeft,
  CircleDashed,
  CircleTree,
  File,
  FileCode,
  Globe,
  LogoGithub,
  Terminal,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { Theme } from '@/app/providers';

export const PAGINATION_LIMIT = 10;

export function getCheckboxVariant(theme: Theme) {
  return theme === 'dark' ? 'secondary' : 'primary';
}

export const collapsibleNav = [
  {
    id: 'git',
    icon: <Icon data={CircleTree} className='-scale-y-100' size={18} />,
    label: 'Git',
    description: 'Commits, branches, and pull requests',
  },
  {
    id: 'context',
    icon: <Icon data={CircleDashed} size={18} />,
    label: 'Context',
    description: 'Session context and token usage',
  },

  {
    id: 'pr',
    icon: <Icon data={LogoGithub} size={18} />,
    label: 'Pull Request',
    description:
      'Create, review, and merge the pull request for the current branch',
  },
  {
    id: 'changes',
    icon: <Icon data={ArrowRightArrowLeft} size={18} />,
    label: 'Changes',
    description: 'Review working changes',
  },
  {
    id: 'files',
    icon: <Icon data={FileCode} size={18} />,
    label: 'Files',
    description: 'Edit project files',
  },
  {
    id: 'terminal',
    icon: <Icon data={Terminal} size={18} />,
    label: 'Terminal',
    description: 'Built-in terminal',
  },
  {
    id: 'notes',
    icon: <Icon data={File} size={18} />,
    label: 'Project notes',
    description: 'Notes, todos, and plans for the project',
  },
  {
    id: 'browser',
    icon: <Icon data={Globe} size={18} />,
    label: 'Browser',
    description: 'Built-in web browser',
  },
] as const;

export type NavItemId = (typeof collapsibleNav)[number]['id'];
