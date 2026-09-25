import {
  Badge,
  IconButton,
  Kbd,
  KbdKey,
  Link,
  Modal,
  ScrollShadow,
  Sidebar,
  Tooltip,
  Typography,
  useSidebar,
} from '@aero/ui';
import {
  ArrowsExpandVertical,
  Bars,
  Boxes3,
  ChevronsExpandHorizontal,
  ChevronsExpandVertical,
  CircleInfo,
  CircleTree,
  Clock,
  CodeFork,
  Comment,
  Cpu,
  Display,
  Folder,
  Gear,
  Keyboard,
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
import { useOpencodeVersion } from '@/app/hooks/api/pool';
import { useI18n } from '@/app/hooks/i18n';
import { BaseTranslation } from '@/app/hooks/i18n/locales/translations';
import { useGlobalModalStore, useTheme } from '@/app/providers';
import { useSettingsModalStore } from '@/app/providers/settings/settings-store';

export function SidebarFooter() {
  const openSettingsModal = useSettingsModalStore((state) => state.openModal);
  const openAboutModal = useGlobalModalStore((state) => state.openModal);
  const openShortcutsModal = useGlobalModalStore((state) => state.openModal);
  const { setMobileOpen } = useSidebar();

  const { t } = useI18n();

  return (
    <Sidebar.Footer className='sticky bottom-0 z-10 px-0 pt-1 pb-3'>
      <div className='mt-1.5 space-x-1 px-4'>
        <Tooltip>
          <IconButton
            onPress={() => {
              openSettingsModal();
              setMobileOpen(false);
            }}
            slot='close'
            svgSize='sm'
          >
            <Icon data={Gear} />
          </IconButton>

          <Tooltip.Content>
            <p>{t.common.settings}</p>
          </Tooltip.Content>
        </Tooltip>

        <Tooltip>
          <IconButton
            onPress={() =>
              openShortcutsModal({
                children: <ShortcutsModal />,
              })
            }
            slot='close'
            svgSize='sm'
          >
            <Icon data={Keyboard} />
          </IconButton>

          <Tooltip.Content>
            <p>{t.common.shortcuts}</p>
          </Tooltip.Content>
        </Tooltip>

        <Tooltip>
          <IconButton
            onPress={() =>
              openAboutModal({
                children: <AboutModal />,
              })
            }
            slot='close'
            svgSize='sm'
          >
            <Icon data={CircleInfo} />
          </IconButton>
          <Tooltip.Content>
            <p>{t.app.aboutAero}</p>
          </Tooltip.Content>
        </Tooltip>
      </div>
    </Sidebar.Footer>
  );
}

export function AboutModal() {
  const { resolvedTheme } = useTheme();

  const { data } = useOpencodeVersion();

  const { t } = useI18n();

  return (
    <Modal.Dialog className='text-foreground rounded-2xl p-6 sm:max-w-[360px]'>
      <Modal.CloseTrigger />

      <Modal.Header className='flex flex-col items-center space-y-3 pt-2 text-center'>
        {/* Logo Container */}
        <div className='bg-surface-secondary border-secondary flex h-16 w-16 items-center justify-center rounded-2xl border p-2 inset-shadow-sm'>
          <img
            src={
              resolvedTheme === 'dark'
                ? '/favicon-dark.svg'
                : '/favicon-light.svg'
            }
            alt={t.app.aeroLogo}
            className='h-10 w-10 object-contain'
          />
        </div>

        {/* Heading & Version Badge */}
        <div className='flex items-center gap-3'>
          <div className='flex items-end gap-1'>
            <div className='relative px-4'>
              <Typography.Heading level={4}>{t.app.aero}</Typography.Heading>
              <Badge
                color='accent'
                size='sm'
                placement='top-right'
                className='-translate-y-1 px-0.5'
              >
                {t.app.version}
              </Badge>
            </div>
          </div>

          {data?.version && (
            <div className='flex items-end gap-1'>
              <div className='relative px-4'>
                <Typography.Heading level={4}>
                  {t.app.opencode}
                </Typography.Heading>
                <Badge
                  color='default'
                  size='sm'
                  placement='top-right'
                  className='-translate-y-1 px-0.5'
                >
                  {data.version}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </Modal.Header>

      <Modal.Body className='space-y-5 pt-4 text-center'>
        {/* Description */}
        <Typography.Paragraph size='sm' className='text-muted text-center'>
          {t.app.openedSource} <br />
          {t.app.inspiredBy}{' '}
          <Link
            href='https://github.com/openchamber/openchamber'
            rel='noreferrer'
            target='_blank'
          >
            {t.app.openchamber}
            <Link.Icon />
          </Link>
          {t.app.period}
        </Typography.Paragraph>

        {/* GitHub Link Button */}
        <Link
          href='https://github.com/thisissteven/aero'
          rel='noreferrer'
          target='_blank'
          className='space-x-2'
        >
          <Icon data={LogoGithub} />
          {t.app.starOnGithub}
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

function getShortcutSections(t: BaseTranslation): ShortcutSection[] {
  return [
    {
      category: t.shortcuts.groupNavigation,
      items: [
        {
          label: t.shortcuts.openCommandPalette,
          keys: ['Ctrl', 'K'],
          icon: <Icon data={Magnifier} size={14} />,
        },
        {
          label: t.shortcuts.showKeyboardShortcuts,
          keys: ['Ctrl', '.'],
          icon: <Icon data={Keyboard} size={14} />,
        },
        {
          label: t.shortcuts.toggleSessionSidebar,
          keys: ['Ctrl', 'L'],
          icon: <Icon data={LayoutSideContentLeft} size={14} />,
        },
        {
          label: t.shortcuts.cycleAgent,
          keys: ['Tab'],
          icon: <Icon data={Person} size={14} />,
        },
        {
          label: t.shortcuts.openModelSelector,
          keys: ['Ctrl', 'Shift', 'M'],
          icon: <Icon data={Cpu} size={14} />,
        },
        {
          label: t.shortcuts.navigateModels,
          keys: ['↑', '↓'],
          icon: <Icon data={ChevronsExpandVertical} size={14} />,
        },
        {
          label: t.shortcuts.adjustThinkingMode,
          keys: ['←', '→'],
          icon: <Icon data={ChevronsExpandHorizontal} size={14} />,
        },
        {
          label: t.shortcuts.cycleThinkingVariant,
          keys: ['Ctrl', 'Shift', 'T'],
          icon: <Icon data={Sparkles} size={14} />,
        },
        {
          label: t.shortcuts.newWindow,
          keys: ['Ctrl', 'Alt', 'Shift', 'N'],
          icon: <Icon data={Display} size={14} />,
        },
      ],
    },
    {
      category: t.shortcuts.groupSession,
      items: [
        {
          label: t.shortcuts.createNewSession,
          keys: ['N'],
          icon: <Icon data={Plus} size={14} />,
        },
        {
          label: t.shortcuts.createNewWorktreeDraft,
          keys: ['Ctrl', 'Shift', 'Q'],
          icon: <Icon data={CircleTree} size={14} />,
        },
        {
          label: t.shortcuts.focusChatInput,
          keys: ['Ctrl', 'I'],
          icon: <Icon data={Comment} size={14} />,
        },
        {
          label: t.shortcuts.togglePromptNavigator,
          keys: ['Ctrl', 'Alt', 'P'],
          icon: <Icon data={Bars} size={14} />,
        },
        {
          label: t.shortcuts.abortActiveRun,
          keys: ['Esc'],
          icon: <Icon data={Xmark} size={14} />,
        },
      ],
    },
    {
      category: t.shortcuts.groupPanels,
      items: [
        {
          label: t.shortcuts.toggleRightPanel,
          keys: ['Ctrl', 'B'],
          icon: <Icon data={LayoutSideContentRight} size={14} />,
        },
        {
          label: t.shortcuts.openGitSurface,
          keys: ['Ctrl', 'Shift', 'G'],
          icon: <Icon data={CodeFork} size={14} />,
        },
        {
          label: t.shortcuts.openFilesSurface,
          keys: ['Ctrl', 'Shift', 'F'],
          icon: <Icon data={Folder} size={14} />,
        },
        {
          label: t.shortcuts.toggleTerminalDock,
          keys: ['Ctrl', 'J'],
          icon: <Icon data={Terminal} size={14} />,
        },
        {
          label: t.shortcuts.toggleTerminalExpanded,
          keys: ['Ctrl', 'Shift', 'J'],
          icon: <Icon data={ArrowsExpandVertical} size={14} />,
        },
        {
          label: t.shortcuts.togglePlanContextPanel,
          keys: ['Ctrl', 'Shift', 'P'],
          icon: <Icon data={Clock} size={14} />,
        },
      ],
    },
    {
      category: t.shortcuts.groupInterface,
      items: [
        {
          label: t.shortcuts.cycleTheme,
          keys: ['Ctrl', '/'],
          icon: <Icon data={Palette} size={14} />,
        },
        {
          label: t.shortcuts.switchProject,
          keys: ['Ctrl', '1 ... 9'],
          icon: <Icon data={Boxes3} size={14} />,
        },
        {
          label: t.shortcuts.toggleServicesMenu,
          keys: ['Ctrl', 'Shift', 'S'],
          icon: <Icon data={Server} size={14} />,
        },
        {
          label: t.shortcuts.cycleServicesTab,
          keys: ['Ctrl', 'Shift', '['],
          icon: <Icon data={LayoutTabs} size={14} />,
        },
        {
          label: t.shortcuts.openSettings,
          keys: ['Ctrl', ','],
          icon: <Icon data={Gear} size={14} />,
        },
      ],
    },
  ];
}

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
  const { t } = useI18n();

  return (
    <Modal.Dialog className='text-foreground w-full max-w-xl gap-0 rounded-2xl px-0 py-0 pr-2'>
      <Modal.CloseTrigger />

      {/* Header */}
      <Modal.Header className='flex flex-col gap-1 px-6 py-5'>
        <div className='flex items-center gap-2'>
          <Icon data={Keyboard} />
          <Modal.Heading className='typography typography--h5 typography--weight-semibold text-foreground'>
            {t.shortcuts.dialogTitle}
          </Modal.Heading>
        </div>
        <Typography type='body-sm' color='muted'>
          {t.shortcuts.dialogDescription}
        </Typography>
      </Modal.Header>

      {/* Body */}
      <Modal.Body className='mt-0 overflow-hidden p-0'>
        <ScrollShadow offset={4} className='max-h-[65vh] px-6 py-4'>
          <div className='space-y-6'>
            {getShortcutSections(t).map((section) => (
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
                        <Kbd className='bg-surface-secondary text-foreground border-secondary'>
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
            <div className='border-secondary bg-surface-secondary/60 space-y-2 rounded-xl border p-4 backdrop-blur-sm'>
              <div className='flex items-center gap-2'>
                <Icon data={Keyboard} />
                <Typography
                  type='body-sm'
                  weight='semibold'
                  className='text-foreground'
                >
                  {t.shortcuts.proTips}
                </Typography>
              </div>

              <ul className='text-muted list-disc space-y-1 pl-6 text-sm'>
                <li>{t.shortcuts.tipCommandPalette}</li>
                <li>{t.shortcuts.tipRecentSessions}</li>
                <li>{t.shortcuts.tipThemeCycling}</li>
              </ul>
            </div>
          </div>
        </ScrollShadow>
      </Modal.Body>
    </Modal.Dialog>
  );
}
