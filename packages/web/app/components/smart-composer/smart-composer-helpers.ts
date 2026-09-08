const SNIPPETS = [
  { id: 'n1', label: '#bug-report', value: 'bug-report' },
  { id: 'n2', label: '#react-component', value: 'react-component' },
];

export const COMPOSER_CLIPBOARD_MIME = 'application/x-aero-composer+json';

export const TRIGGER_CHARS = ['@', '/', '#'] as const;

export type TokenType = 'file' | 'agent' | 'command' | 'skill' | 'snippet';

export type TriggerChar = (typeof TRIGGER_CHARS)[number];

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
    trigger: TriggerChar;
  };
}

export type ComposerSegment = TextSegment | TokenSegment;

export interface SearchItem {
  id: string;
  label: string;
  value: string;
  kind: TokenType;
  triggerChar: TriggerChar;
  group: 'FILES' | 'AGENTS' | 'COMMANDS' | 'SKILLS' | 'SNIPPETS';
}

interface SearchData {
  files: string[];
  agents: Array<{ name: string }>;
  commands: Array<{ name: string }>;
  skills: Array<{ name: string }>;
}

export function cloneSegments(segments: ComposerSegment[]): ComposerSegment[] {
  return JSON.parse(JSON.stringify(segments));
}

export function segmentsEqual(a: ComposerSegment[], b: ComposerSegment[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function buildText(segments: ComposerSegment[]) {
  return segments
    .map((segment) =>
      segment.type === 'text'
        ? segment.text
        : segment.token.label || segment.token.value || '',
    )
    .join('')
    .trim();
}

function matches(value: string, query: string) {
  return value.toLowerCase().includes(query);
}

function createItem(
  id: string,
  name: string,
  kind: TokenType,
  triggerChar: TriggerChar,
  group: SearchItem['group'],
): SearchItem {
  return {
    id,
    label: `${triggerChar}${name}`,
    value: name,
    kind,
    triggerChar,
    group,
  };
}

export function unifiedSearch(
  trigger: TriggerChar,
  query: string,
  data: SearchData,
) {
  const q = query.toLowerCase();
  const results: SearchItem[] = [];

  if (trigger === '@') {
    for (const path of data.files) {
      results.push(createItem(`file:${path}`, path, 'file', '@', 'FILES'));
    }

    for (const agent of data.agents) {
      if (matches(agent.name, q)) {
        results.push(
          createItem(`agent:${agent.name}`, agent.name, 'agent', '@', 'AGENTS'),
        );
      }
    }
  }

  if (trigger === '/') {
    for (const command of data.commands) {
      if (matches(command.name, q)) {
        results.push(
          createItem(
            `command:${command.name}`,
            command.name,
            'command',
            '/',
            'COMMANDS',
          ),
        );
      }
    }

    for (const skill of data.skills) {
      if (matches(skill.name, q)) {
        results.push(
          createItem(`skill:${skill.name}`, skill.name, 'skill', '/', 'SKILLS'),
        );
      }
    }
  }

  if (trigger === '#') {
    for (const snippet of SNIPPETS) {
      if (matches(snippet.value, q) || matches(snippet.label, q)) {
        results.push({
          ...snippet,
          kind: 'snippet',
          triggerChar: '#',
          group: 'SNIPPETS',
        });
      }
    }
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
