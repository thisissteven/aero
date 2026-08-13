import { AeroConversationTurn } from '../../server/services/harness/types';

export type ChatModel = {
  id: string;
  label: string;
};

export type ChatSearchMode = {
  id: string;
  label: string;
};

export type ChatSession = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  modelId: string;
  searchModeId: string;
  user: {
    avatar: string;
    email: string;
    name: string;
  };
  turns: AeroConversationTurn[];
};

export const CHAT_MODELS: readonly ChatModel[] = [
  { id: 'gpt-5.4', label: 'GPT-5.4' },
  { id: 'claude-4.6-opus', label: 'Claude 4.6 Opus' },
  { id: 'claude-4.6-sonnet', label: 'Claude 4.6 Sonnet' },
  { id: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro' },
] as const;

export const CHAT_SEARCH_MODES: readonly ChatSearchMode[] = [
  { id: 'deep-search', label: 'Deep Search' },
  { id: 'quick-search', label: 'Quick Search' },
] as const;

export const SUGGESTED_PROMPTS: readonly string[] = [
  "Summarize this week's product and design updates into a team-ready status note.",
  'Turn a rough product brief into a launch checklist with owners and deadlines.',
  'Rewrite this paragraph for a skeptical executive who cares about ROI.',
  'Brainstorm onboarding flow names for a data-heavy analytics product.',
  'Draft a weekly 1:1 agenda that surfaces blockers and growth goals.',
  'Compare three pricing models and recommend one for a usage-based SaaS.',
] as const;

export function getChatSession(_: string) {
  return undefined;
}

export type ChatPageKind = 'new' | 'workspaces' | 'plugins' | 'sessions';

export type ChatActivePage =
  | { kind: 'new' }
  | { kind: 'workspaces' }
  | { kind: 'plugins' }
  | { kind: 'sessions' };

export function resolveChatActivePage(pathname: string): ChatActivePage {
  const trimmedBase = ''.replace(/\/$/, '');
  const raw = pathname.startsWith(trimmedBase)
    ? pathname.slice(trimmedBase.length)
    : pathname;
  const relative = raw || '/';
  const firstSegment = relative.replace(/^\//, '').split('/')[0] ?? '';

  if (firstSegment === 'new') return { kind: 'new' };
  if (firstSegment === 'workspaces') return { kind: 'workspaces' };
  if (firstSegment === 'plugins') return { kind: 'plugins' };
  if (firstSegment === 'sessions') return { kind: 'sessions' };

  return { kind: 'new' };
}
