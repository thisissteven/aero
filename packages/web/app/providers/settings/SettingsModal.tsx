import {
  Bell,
  Book,
  BookOpen,
  Box,
  BranchesDown,
  ChartBar,
  Clock,
  Code,
  Comment,
  Cpu,
  Display,
  Folder,
  Gear,
  Globe,
  LogoMcp,
  Microphone,
  Persons,
  PersonWorker,
  Server,
  Sliders,
  Sparkles,
  Terminal,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { SVGProps, useEffect, useRef } from 'react';

import { Modal, SearchField } from '@aero/ui';

import { AppearanceView } from '@/app/providers/settings/appearance/appearance-view';
import { GeneralView } from '@/app/providers/settings/general/general-view';
import { ReloadOpencode } from '@/app/providers/settings/reload-opencode';

import { SettingsTab, useSettingsModalStore } from './settings-store';

interface NavItem {
  id: SettingsTab;
  label: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
  badge?: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'AERO',
    items: [
      { id: 'general', label: 'General', icon: Gear },
      { id: 'appearance', label: 'Appearance', icon: Display },
      { id: 'chat', label: 'Chat', icon: Comment },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'sessions', label: 'Sessions', icon: Clock },
      { id: 'shortcuts', label: 'Shortcuts', icon: Sliders },
      { id: 'voice', label: 'Voice', icon: Microphone },
      { id: 'usage', label: 'Usage', icon: ChartBar },
    ],
  },
  {
    title: 'WORKSPACE',
    items: [
      { id: 'projects', label: 'Projects', icon: Folder },
      { id: 'remote-instances', label: 'Remote Instances', icon: Server },
      {
        id: 'external-tunnel',
        label: 'External Tunnel',
        icon: Globe,
        badge: 'beta',
      },
      { id: 'git', label: 'Git', icon: BranchesDown },
    ],
  },
  {
    title: 'OPENCODE',
    items: [
      { id: 'providers', label: 'Providers', icon: Cpu },
      { id: 'agents', label: 'Agents', icon: Persons },
      { id: 'behavior', label: 'Behavior', icon: PersonWorker },
      { id: 'commands', label: 'Commands', icon: Terminal },
      { id: 'mcp', label: 'MCP', icon: LogoMcp },
      { id: 'plugins', label: 'Plugins', icon: Box },
    ],
  },
  {
    title: 'LIBRARY',
    items: [
      { id: 'magic-prompts', label: 'Magic Prompts', icon: Sparkles },
      { id: 'snippets', label: 'Snippets', icon: Code },
      { id: 'skills', label: 'Skills', icon: BookOpen },
      { id: 'skills-catalog', label: 'Skills Catalog', icon: Book },
    ],
  },
];

export function SettingsModal() {
  const {
    isOpen,
    closeModal,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedSkillId,
    setSelectedSkillId,
    sidebarScrollTop,
    setSidebarScrollTop,
  } = useSettingsModalStore();

  const sidebarNavRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen && sidebarNavRef.current) {
      sidebarNavRef.current.scrollTop = sidebarScrollTop;
    }
  }, [isOpen]);

  const handleClose = () => {
    const currentScrollTop = sidebarNavRef.current?.scrollTop ?? 0;
    setSidebarScrollTop(currentScrollTop);
    closeModal();
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size='cover'>
          <Modal.Dialog className='bg-surface my-auto h-180 w-full max-w-5xl overflow-hidden rounded-2xl border-0 p-0 shadow-none'>
            <div className='text-foreground relative flex h-full w-full'>
              {/* Native Close Trigger */}
              <Modal.CloseTrigger className='text-muted hover:text-foreground absolute top-4 right-4 z-10 transition-colors' />

              {/* Left Sidebar */}
              <aside className='border-separator flex w-64 shrink-0 flex-col justify-between border-r'>
                <div
                  ref={sidebarNavRef}
                  className='relative flex scrollbar-thin flex-col gap-1 overflow-y-auto'
                >
                  {/* Search Bar */}
                  <div className='relative sticky top-0 px-3 py-3'>
                    <div className='bg-surface/50 absolute inset-0 -z-[1] -translate-y-1/2 backdrop-blur-sm'></div>
                    <SearchField
                      value={searchQuery}
                      onChange={setSearchQuery}
                      className='relative w-full'
                      variant='primary'
                    >
                      <SearchField.Group>
                        <SearchField.SearchIcon />
                        <SearchField.Input
                          placeholder='Search settings'
                          className='w-full text-sm'
                        />
                        <SearchField.ClearButton />
                      </SearchField.Group>
                    </SearchField>
                  </div>

                  {/* Navigation Items */}
                  <nav className='flex flex-col gap-4 px-3 pb-3'>
                    {NAV_SECTIONS.map((section, idx) => {
                      const filteredItems = section.items.filter((item) =>
                        item.label
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()),
                      );

                      if (filteredItems.length === 0) return null;

                      return (
                        <div key={idx} className='flex flex-col gap-1'>
                          {section.title && (
                            <span className='text-muted px-2 text-[10px] font-semibold tracking-wider uppercase'>
                              {section.title}
                            </span>
                          )}
                          {filteredItems.map((item) => {
                            const isActive = activeTab === item.id;
                            return (
                              <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm ${
                                  isActive
                                    ? 'bg-surface-secondary text-surface-foreground font-medium'
                                    : 'text-muted hover:bg-surface-secondary'
                                }`}
                              >
                                <div className='flex items-center gap-2.5'>
                                  <Icon data={item.icon} />
                                  <span
                                    className={`${
                                      isActive
                                        ? 'text-surface-foreground'
                                        : 'text-muted'
                                    }`}
                                  >
                                    {item.label}
                                  </span>
                                </div>
                                {item.badge && (
                                  <span className='bg-accent-soft-foreground text-accent-foreground rounded px-1.5 py-0.5 text-[10px] font-normal'>
                                    {item.badge}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </nav>
                </div>

                {/* Sidebar Footer */}
                <div className='border-separator border-t p-2'>
                  <ReloadOpencode />
                </div>
              </aside>

              {/* Main Content Area */}
              <main className='flex flex-1 overflow-hidden'>
                {activeTab === 'general' && <GeneralView />}
                {activeTab === 'appearance' && <AppearanceView />}
                {activeTab === 'skills' && (
                  <SkillsView
                    selectedSkillId={selectedSkillId}
                    onSelectSkill={setSelectedSkillId}
                  />
                )}
                {activeTab !== 'appearance' && activeTab !== 'general' && (
                  <div className='text-muted flex w-full items-center justify-center p-8 text-sm'>
                    Content for
                    <div className='text-foreground mx-1 capitalize'>
                      {activeTab.replace('-', ' ')}
                    </div>
                    is under development.
                  </div>
                )}
              </main>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/* ==========================================================================
   Skills Tab View
   ========================================================================== */
interface SkillsViewProps {
  selectedSkillId: string | null;
  onSelectSkill: (id: string) => void;
}

function SkillsView({ selectedSkillId, onSelectSkill }: SkillsViewProps) {
  const projectSkills = [
    { id: 'animation', name: 'animation...', tags: ['project', 'opencode'] },
    { id: 'emil-design', name: 'emil-desig...', tags: ['project', 'opencode'] },
    { id: 'make-inte', name: 'make-inte...', tags: ['project', 'opencode'] },
    { id: 'review-ani', name: 'review-ani...', tags: ['project', 'opencode'] },
  ];

  const userSkills = [
    {
      id: 'customize-open',
      name: 'customize-open...',
      tags: ['user', 'opencode'],
    },
    { id: 'find-skills', name: 'find-skills', tags: ['user', 'claude'] },
  ];

  return (
    <div className='flex flex-1 overflow-hidden'>
      {/* Sub-sidebar for Skills */}
      <div className='border-separator bg-surface-secondary flex w-56 shrink-0 flex-col gap-4 border-r p-4'>
        <div className='flex items-center justify-between'>
          <span className='text-foreground text-sm font-semibold'>Skills</span>
        </div>

        <select className='border-border bg-field-background text-field-foreground w-full rounded-md border px-2.5 py-1.5 text-xs'>
          <option>Aero</option>
        </select>

        <div className='text-muted flex items-center justify-between text-xs'>
          <span>Total 6</span>
          <button className='text-foreground text-base leading-none hover:opacity-80'>
            +
          </button>
        </div>

        <div className='scrollbar-thin space-y-4 overflow-y-auto'>
          <div>
            <span className='text-muted mb-2 block text-[10px] font-semibold tracking-wider uppercase'>
              PROJECT SKILLS
            </span>
            <div className='space-y-1'>
              {projectSkills.map((s) => (
                <SkillListItem
                  key={s.id}
                  skill={s}
                  isSelected={selectedSkillId === s.id}
                  onClick={() => onSelectSkill(s.id)}
                />
              ))}
            </div>
          </div>

          <div>
            <span className='text-muted mb-2 block text-[10px] font-semibold tracking-wider uppercase'>
              USER SKILLS
            </span>
            <div className='space-y-1'>
              {userSkills.map((s) => (
                <SkillListItem
                  key={s.id}
                  skill={s}
                  isSelected={selectedSkillId === s.id}
                  onClick={() => onSelectSkill(s.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Pane */}
      <div className='flex-1 scrollbar-thin space-y-6 overflow-y-auto p-6'>
        <div>
          <h2 className='text-foreground text-lg font-medium'>
            {selectedSkillId || 'find-skills'}
          </h2>
          <p className='text-muted text-xs'>User / Claude skill</p>
        </div>

        <div className='space-y-2'>
          <h3 className='text-foreground text-xs font-semibold'>
            Basic Information
          </h3>
          <div>
            <label className='text-muted mb-1 block text-xs'>
              Description <span className='text-danger'>*</span>
            </label>
            <textarea
              rows={3}
              readOnly
              className='border-border bg-field-background text-field-foreground w-full resize-none rounded-md border p-2.5 text-xs focus:outline-none'
              value='Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skill that can...", or express interest in extending capabilities.'
            />
          </div>
        </div>

        <div className='space-y-2'>
          <h3 className='text-foreground text-xs font-semibold'>
            Instructions
          </h3>
          <div className='border-border bg-surface-tertiary text-success overflow-x-auto rounded-md border p-3 font-mono text-[11px] leading-relaxed'>
            <pre>
              {`---
description: Helps users discover and install agent skills when they ask
  questions like "how do I do X", "find a skill for X", "is there a skill
  that can...", or express interest in extending capabilities. This skill
  should be
  used when the user is looking for functionality that might exist as an
  installable skill.
---

# Find Skills

This skill helps you discover and install skills from the open agent
skills ecosystem.

## When to Use This Skill`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkillListItem({
  skill,
  isSelected,
  onClick,
}: {
  skill: { id: string; name: string; tags: string[] };
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-md p-2 text-left text-xs ${
        isSelected
          ? 'bg-accent text-accent-foreground'
          : 'text-foreground hover:bg-surface-secondary'
      }`}
    >
      <span className='truncate'>{skill.name}</span>
      <div className='flex shrink-0 gap-1'>
        {skill.tags.map((t) => (
          <span
            key={t}
            className='bg-default text-default-foreground rounded px-1 py-0.5 text-[9px]'
          >
            {t}
          </span>
        ))}
      </div>
    </button>
  );
}
