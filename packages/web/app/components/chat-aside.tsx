import {
  ArrowRightArrowLeft,
  CircleDashed,
  CircleTree,
  CodePullRequest,
  File,
  FileCode,
  Globe,
  Terminal,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { cn, Tooltip, Typography } from '@aero/ui';

export const collapsibleNav = [
  {
    id: 'context',
    icon: <Icon data={CircleDashed} size={18} />,
    label: 'Context',
    description: 'Session context and token usage',
  },
  {
    id: 'git',
    icon: <Icon data={CircleTree} size={18} />,
    label: 'Git',
    description: 'Commits, branches, and pull requests',
  },
  {
    id: 'pr',
    icon: <Icon data={CodePullRequest} size={18} />,
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

interface ChatAsideProps {
  activeItem: NavItemId | null;
  onSelect: (id: NavItemId) => void;
}

export function ChatAside({ activeItem, onSelect }: ChatAsideProps) {
  return (
    <aside className='relative h-full w-12 shrink-0 max-sm:hidden'>
      <div
        className='border-separator absolute inset-0 top-0 right-0 h-14 border-b'
        aria-hidden
      ></div>
      <div
        className={cn(
          'mt-14 flex h-full flex-col gap-2 pt-4',
          activeItem && 'border-separator border-l',
        )}
      >
        {collapsibleNav.map((item) => {
          const isActive = activeItem === item.id;
          return (
            <Tooltip key={item.id} delay={300}>
              <Tooltip.Trigger aria-label={item.label}>
                <button
                  type='button'
                  onClick={() => onSelect(item.id)}
                  className={`flex w-full items-center justify-center py-1.5 transition ${
                    isActive
                      ? 'text-accent-soft-foreground opacity-100'
                      : 'opacity-50 hover:opacity-80'
                  }`}
                >
                  {item.icon}
                </button>
              </Tooltip.Trigger>

              <Tooltip.Content placement='left'>
                <Typography
                  type='body-sm'
                  className='text-accent-soft-foreground'
                >
                  {item.label}
                </Typography>
                <Typography type='body-xs' className='leading-4 break-normal'>
                  {item.description}
                </Typography>
              </Tooltip.Content>
            </Tooltip>
          );
        })}
      </div>
    </aside>
  );
}
