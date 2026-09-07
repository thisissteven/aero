const FILES = [
  {
    id: 'f1',
    label: '@src/components/chat.tsx',
    value: 'src/components/chat.tsx',
  },
  {
    id: 'f2',
    label: '@src/components/chat-input.tsx',
    value: 'src/components/chat-input.tsx',
  },
  {
    id: 'f3',
    label: '@src/services/search.ts',
    value: 'src/services/search.ts',
  },
  {
    id: 'f4',
    label: '@src/components/file.tsx',
    value: 'src/components/file.tsx',
  },
  {
    id: 'f5',
    label: '@src/components/chat-button.tsx',
    value: 'src/components/chat-button.tsx',
  },
  {
    id: 'f6',
    label: '@src/services/settings.ts',
    value: 'src/services/settings.ts',
  },
];

const AGENTS = [
  { id: 'a1', label: '@build', value: 'build' },
  { id: 'a2', label: '@planner', value: 'planner' },
];

const COMMANDS = [
  { id: 'c1', label: '/refactor', value: 'refactor' },
  { id: 'c2', label: '/review', value: 'review' },
];

const SKILLS = [
  {
    id: 's1',
    label: '/frontend-design',
    value: 'frontend-design',
  },
  {
    id: 's2',
    label: '/code-review',
    value: 'code-review',
  },
];

const SNIPPETS = [
  { id: 'n1', label: '#bug-report', value: 'bug-report' },
  { id: 'n2', label: '#react-component', value: 'react-component' },
];

export const COMPOSER_CLIPBOARD_MIME = 'application/x-aero-composer+json';

export const TRIGGER_CHARS = ['@', '/', '#'] as const;

export type TokenType = 'file' | 'agent' | 'command' | 'skill' | 'snippet';

interface TextSegment {
  type: 'text';
  text: string;
}

interface TokenSegment {
  type: 'token';
  token: {
    id: string;
    type: TokenType;
    label: string;
    value: string;
    trigger: '@' | '/' | '#';
  };
}

export type ComposerSegment = TextSegment | TokenSegment;

export interface SearchItem {
  id: string;
  label: string;
  value: string;
  kind: TokenType;
  triggerChar: '@' | '/' | '#';
  group: 'FILES' | 'AGENTS' | 'COMMANDS' | 'SKILLS' | 'SNIPPETS';
}

export function cloneSegments(segments: ComposerSegment[]): ComposerSegment[] {
  return JSON.parse(JSON.stringify(segments));
}

export function segmentsEqual(a: ComposerSegment[], b: ComposerSegment[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function buildText(segments: ComposerSegment[]) {
  return segments
    .map((segment) => {
      if (segment.type === 'text') {
        return segment.text;
      }

      return segment.token.label || segment.token.value || '';
    })
    .join('')
    .trim();
}

export function unifiedSearch(trigger: '@' | '/' | '#', query: string) {
  const q = (query || '').toLowerCase();
  const results: SearchItem[] = [];

  if (trigger === '@') {
    FILES.filter(
      (item) =>
        item.value.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q),
    ).forEach((item) => {
      results.push({
        ...item,
        kind: 'file',
        triggerChar: '@',
        group: 'FILES',
      });
    });

    AGENTS.filter(
      (item) =>
        item.value.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q),
    ).forEach((item) => {
      results.push({
        ...item,
        kind: 'agent',
        triggerChar: '@',
        group: 'AGENTS',
      });
    });
  }

  if (trigger === '/') {
    COMMANDS.filter(
      (item) =>
        item.value.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q),
    ).forEach((item) => {
      results.push({
        ...item,
        kind: 'command',
        triggerChar: '/',
        group: 'COMMANDS',
      });
    });

    SKILLS.filter(
      (item) =>
        item.value.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q),
    ).forEach((item) => {
      results.push({
        ...item,
        kind: 'skill',
        triggerChar: '/',
        group: 'SKILLS',
      });
    });
  }

  if (trigger === '#') {
    SNIPPETS.filter(
      (item) =>
        item.value.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q),
    ).forEach((item) => {
      results.push({
        ...item,
        kind: 'snippet',
        triggerChar: '#',
        group: 'SNIPPETS',
      });
    });
  }

  const groups: Record<string, SearchItem[]> = {};

  for (const result of results) {
    (groups[result.group] ||= []).push(result);
  }

  return {
    groups,
    flat: results,
  };
}
