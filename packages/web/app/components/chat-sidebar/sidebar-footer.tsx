import {
  ArrowsExpandVertical,
  Bars,
  Boxes3,
  ChevronsExpandHorizontal,
  ChevronsExpandVertical,
  CircleInfo,
  CircleQuestion,
  CircleQuestionFill,
  CircleTree,
  Clock,
  CodeFork,
  Comment,
  Cpu,
  Display,
  Folder,
  Gear,
  LayoutSideContentLeft,
  LayoutSideContentRight,
  LayoutTabs,
  LogoGithub,
  Magnifier,
  Palette,
  Person,
  Plus,
  Server,
  Sparkles,
  Terminal,
  Xmark,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import React from 'react';

import {
  Badge,
  Kbd,
  KbdKey,
  Link,
  Modal,
  ScrollShadow,
  Sidebar,
  Tooltip,
  Typography,
} from '@aero/ui';

import { useGlobalModalStore, useTheme } from '@/app/providers';
import { useSettingsModalStore } from '@/app/providers/settings/settings-store';

export function SidebarFooter() {
  const openSettingsModal = useSettingsModalStore((state) => state.openModal);
  const openAboutModal = useGlobalModalStore((state) => state.openModal);
  const openShortcutsModal = useGlobalModalStore((state) => state.openModal);
  return (
    <Sidebar.Footer className='sticky bottom-0 z-10 px-0 pt-1 pb-3'>
      <div className='mt-1.5 space-x-2 px-4'>
        <Tooltip delay={0}>
          <Tooltip.Trigger
            onClick={() => openSettingsModal()}
            className='focus-visible:ring-accent rounded-md outline-0 focus-visible:ring-2 focus-visible:outline-none'
          >
            <div className='grid size-6 place-items-center opacity-50 transition hover:opacity-80'>
              <Icon data={Gear} size={18} />
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Settings</p>
          </Tooltip.Content>
        </Tooltip>

        <Tooltip delay={0}>
          <Tooltip.Trigger
            onClick={() =>
              openShortcutsModal({
                children: <ShortcutsModal />,
              })
            }
            className='focus-visible:ring-accent rounded-md outline-0 focus-visible:ring-2 focus-visible:outline-none'
          >
            <div className='grid size-6 place-items-center opacity-50 transition hover:opacity-80'>
              <Icon data={CircleQuestion} size={18} />
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Shortcuts</p>
          </Tooltip.Content>
        </Tooltip>

        <Tooltip delay={0}>
          <Tooltip.Trigger
            onClick={() =>
              openAboutModal({
                children: <AboutModal />,
              })
            }
            className='focus-visible:ring-accent rounded-md outline-0 focus-visible:ring-2 focus-visible:outline-none'
          >
            <div className='grid size-6 place-items-center opacity-50 transition hover:opacity-80'>
              <Icon data={CircleInfo} size={18} />
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>About Aero</p>
          </Tooltip.Content>
        </Tooltip>
      </div>
    </Sidebar.Footer>
  );
}

export function AboutModal() {
  const { theme } = useTheme();

  return (
    <Modal.Dialog className='bg-surface text-foreground border-separator rounded-2xl border p-6 shadow-xl sm:max-w-[360px]'>
      <Modal.CloseTrigger />

      <Modal.Header className='flex flex-col items-center space-y-3 pt-2 text-center'>
        {/* Logo Container */}
        <div className='bg-surface-secondary border-separator flex h-16 w-16 items-center justify-center rounded-2xl border p-2 inset-shadow-sm'>
          <img
            src={theme === 'dark' ? '/favicon-dark.svg' : '/favicon-light.svg'}
            alt='Aero Logo'
            className='h-10 w-10 object-contain'
          />
        </div>

        {/* Heading & Version Badge */}
        <div className='flex items-end gap-1'>
          <Modal.Heading className='relative px-4'>
            <Typography.Heading level={4}>Aero</Typography.Heading>
            <Badge
              color='accent'
              size='sm'
              placement='top-right'
              className='-translate-y-1 px-0.5'
            >
              v1.0.0
            </Badge>
          </Modal.Heading>
        </div>
      </Modal.Header>

      <Modal.Body className='space-y-5 pt-4 text-center'>
        {/* Description */}
        <Typography.Paragraph size='sm' className='text-muted text-center'>
          An open-source AI workspace. <br />
          Inspired by{' '}
          <Link
            href='https://github.com/openchamber/openchamber'
            rel='noreferrer'
            target='_blank'
          >
            Openchamber
            <Link.Icon />
          </Link>
          .
        </Typography.Paragraph>

        {/* GitHub Link Button */}
        <Link
          href='https://github.com/thisissteven/aero'
          rel='noreferrer'
          target='_blank'
          className='space-x-2'
        >
          <Icon data={LogoGithub} />
          Star on GitHub
          <Link.Icon />
        </Link>
      </Modal.Body>
    </Modal.Dialog>
  );
}

interface ShortcutItem {
  icon?: React.ReactNode;
  label: string;
  keys: (KbdKey | string)[];
}

interface ShortcutSection {
  category: string;
  items: ShortcutItem[];
}

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    category: 'NAVIGATION & COMMANDS',
    items: [
      {
        label: 'Open Command Palette',
        keys: ['Ctrl', 'K'],
        icon: <Icon data={Magnifier} size={14} />,
      },
      {
        label: 'Show Keyboard Shortcuts (this dialog)',
        keys: ['Ctrl', '.'],
        icon: <Icon data={CircleQuestion} size={14} />,
      },
      {
        label: 'Toggle Session Sidebar',
        keys: ['Ctrl', 'L'],
        icon: <Icon data={LayoutSideContentLeft} size={14} />,
      },
      {
        label: 'Cycle Agent (chat input)',
        keys: ['Tab'],
        icon: <Icon data={Person} size={14} />,
      },
      {
        label: 'Open Model Selector',
        keys: ['Ctrl', 'Shift', 'M'],
        icon: <Icon data={Cpu} size={14} />,
      },
      {
        label: 'Navigate Models (in picker)',
        keys: ['↑', '↓'],
        icon: <Icon data={ChevronsExpandVertical} size={14} />,
      },
      {
        label: 'Adjust Thinking Mode (in picker, when supported)',
        keys: ['←', '→'],
        icon: <Icon data={ChevronsExpandHorizontal} size={14} />,
      },
      {
        label: 'Cycle Thinking Variant (global shortcut)',
        keys: ['Ctrl', 'Shift', 'T'],
        icon: <Icon data={Sparkles} size={14} />,
      },
      {
        label: 'New Window (desktop only)',
        keys: ['Ctrl', 'Alt', 'Shift', 'N'],
        icon: <Icon data={Display} size={14} />,
      },
    ],
  },
  {
    category: 'SESSION MANAGEMENT',
    items: [
      {
        label: 'Create New Session',
        keys: ['N'],
        icon: <Icon data={Plus} size={14} />,
      },
      {
        label: 'Create New Worktree Draft',
        keys: ['Ctrl', 'Shift', 'N'],
        icon: <Icon data={CircleTree} size={14} />,
      },
      {
        label: 'Focus Chat Input',
        keys: ['Ctrl', 'I'],
        icon: <Icon data={Comment} size={14} />,
      },
      {
        label: 'Toggle Prompt Navigator',
        keys: ['Ctrl', 'Alt', 'P'],
        icon: <Icon data={Bars} size={14} />,
      },
      {
        label: 'Abort active run (double press)',
        keys: ['Esc'],
        icon: <Icon data={Xmark} size={14} />,
      },
    ],
  },
  {
    category: 'PANELS',
    items: [
      {
        label: 'Toggle Right Panel',
        keys: ['Ctrl', 'B'],
        icon: <Icon data={LayoutSideContentRight} size={14} />,
      },
      {
        label: 'Open Git surface',
        keys: ['Ctrl', 'Shift', 'G'],
        icon: <Icon data={CodeFork} size={14} />,
      },
      {
        label: 'Open Files surface',
        keys: ['Ctrl', 'Shift', 'F'],
        icon: <Icon data={Folder} size={14} />,
      },
      {
        label: 'Toggle Terminal Dock',
        keys: ['Ctrl', 'J'],
        icon: <Icon data={Terminal} size={14} />,
      },
      {
        label: 'Toggle Terminal Expanded',
        keys: ['Ctrl', 'Shift', 'J'],
        icon: <Icon data={ArrowsExpandVertical} size={14} />,
      },
      {
        label: 'Toggle Plan Context Panel',
        keys: ['Ctrl', 'Shift', 'P'],
        icon: <Icon data={Clock} size={14} />,
      },
    ],
  },
  {
    category: 'INTERFACE',
    items: [
      {
        label: 'Cycle Theme (Light → Dark → System)',
        keys: ['Ctrl', '/'],
        icon: <Icon data={Palette} size={14} />,
      },
      {
        label: 'Switch Project',
        keys: ['Ctrl', '1 ... 9'],
        icon: <Icon data={Boxes3} size={14} />,
      },
      {
        label: 'Toggle Services Menu',
        keys: ['Ctrl', 'Shift', 'S'],
        icon: <Icon data={Server} size={14} />,
      },
      {
        label: 'Cycle Services Tab',
        keys: ['Ctrl', 'Shift', '['],
        icon: <Icon data={LayoutTabs} size={14} />,
      },
      {
        label: 'Open Settings',
        keys: ['Ctrl', ','],
        icon: <Icon data={Gear} size={14} />,
      },
    ],
  },
];

const KEY_ABBR_MAP: Record<string, KbdKey> = {
  ctrl: 'ctrl',
  shift: 'shift',
  alt: 'alt',
  cmd: 'command',
  command: 'command',
  option: 'option',
  tab: 'tab',
  esc: 'escape',
  escape: 'escape',
  enter: 'enter',
  space: 'space',
  delete: 'delete',
  backspace: 'delete',
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right',
  '↑': 'up',
  '↓': 'down',
  '←': 'left',
  '→': 'right',
};

function KeyItem({ keyName, isFirst }: { keyName: KbdKey; isFirst: boolean }) {
  const normalizedKey = keyName.toLowerCase();
  const keyValue = KEY_ABBR_MAP[normalizedKey];

  if (!isFirst && keyValue) {
    return <Kbd.Abbr keyValue={keyValue} className='ml-0.5' />;
  }

  return (
    <Kbd.Content className='not:first-of-type:ml-0.5 last-of-type:ml-0.5'>
      {keyName}
    </Kbd.Content>
  );
}

export function ShortcutsModal() {
  return (
    <Modal.Dialog className='border-separator bg-surface text-foreground w-full max-w-xl gap-0 rounded-2xl border px-0 py-0 pr-2 shadow-2xl'>
      <Modal.CloseTrigger />

      {/* Header */}
      <Modal.Header className='border-separator flex flex-col gap-1 border-b px-6 py-5'>
        <div className='flex items-center gap-2'>
          <Icon data={CircleQuestionFill} />
          <Modal.Heading className='typography typography--h5 typography--weight-semibold text-foreground'>
            Keyboard Shortcuts
          </Modal.Heading>
        </div>
        <Typography type='body-sm' color='muted'>
          Use these keyboard shortcuts to navigate Aero efficiently
        </Typography>
      </Modal.Header>

      {/* Body */}
      <Modal.Body className='mt-0 overflow-hidden p-0'>
        <ScrollShadow offset={4} className='max-h-[65vh] px-6 py-4'>
          <div className='space-y-6'>
            {SHORTCUT_SECTIONS.map((section) => (
              <div key={section.category} className='space-y-2'>
                <Typography
                  type='body-xs'
                  color='muted'
                  weight='semibold'
                  className='tracking-wider uppercase'
                >
                  {section.category}
                </Typography>

                <div className='space-y-1'>
                  {section.items.map((item) => (
                    <div
                      key={item.label}
                      className='flex items-center justify-between rounded-lg py-1.5'
                    >
                      <div className='text-muted-foreground flex items-center gap-2'>
                        {item.icon && (
                          <span className='text-muted flex shrink-0 items-center'>
                            {item.icon}
                          </span>
                        )}
                        <Typography type='body-sm' className='text-foreground'>
                          {item.label}
                        </Typography>
                      </div>

                      {/* Shortcut Keys */}
                      <div className='flex items-center gap-1'>
                        <Kbd className='bg-surface-secondary text-foreground border-separator'>
                          {item.keys.map((key, idx) => (
                            <React.Fragment key={idx}>
                              {idx > 0 && (
                                <span className='text-muted mx-0.5'>+</span>
                              )}
                              <KeyItem
                                keyName={key as KbdKey}
                                isFirst={idx === 0}
                              />
                            </React.Fragment>
                          ))}
                        </Kbd>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Pro Tips Section */}
            <div className='border-separator bg-surface-secondary space-y-2 rounded-xl border p-4'>
              <div className='flex items-center gap-2'>
                <Icon data={CircleQuestion} />
                <Typography
                  type='body-sm'
                  weight='semibold'
                  className='text-foreground'
                >
                  Pro Tips:
                </Typography>
              </div>

              <ul className='text-muted list-disc space-y-1 pl-6 text-sm'>
                <li>
                  Use Command Palette (Ctrl + K) to quickly access all actions
                </li>
                <li>
                  The 10 most recent sessions appear in the Command Palette
                </li>
                <li>Theme cycling remembers your preference across sessions</li>
              </ul>
            </div>
          </div>
        </ScrollShadow>
      </Modal.Body>
    </Modal.Dialog>
  );
}
