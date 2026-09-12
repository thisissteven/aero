import { useComposerStore } from '@/app/components/smart-composer/smart-composer-store';
import {
  AeroAgentCompact,
  AeroCommandCompact,
  AeroSkillCompact,
  SendCommandInput,
} from '@/server/services/harness/types';

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

type BaseSearchItem = {
  id: string;
  label: string;
  value: string;
  triggerChar: TriggerChar;
};

export type SearchItem =
  | (BaseSearchItem & {
      kind: 'file';
      group: 'FILES';
    })
  | (BaseSearchItem & {
      kind: 'agent';
      group: 'AGENTS';
      agent: AeroAgentCompact;
    })
  | (BaseSearchItem & {
      kind: 'command';
      group: 'COMMANDS';
      command: AeroCommandCompact;
    })
  | (BaseSearchItem & {
      kind: 'skill';
      group: 'SKILLS';
      skill: AeroSkillCompact;
    })
  | (BaseSearchItem & {
      kind: 'snippet';
      group: 'SNIPPETS';
    });

interface SearchData {
  files: string[];
  agents: AeroAgentCompact[];
  commands: AeroCommandCompact[];
  skills: AeroSkillCompact[];
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

function createItem<T extends TokenType>(
  id: string,
  name: string,
  kind: T,
  triggerChar: TriggerChar,
  group: SearchItem['group'],
  source?: T extends 'agent'
    ? AeroAgentCompact
    : T extends 'command'
      ? AeroCommandCompact
      : T extends 'skill'
        ? AeroSkillCompact
        : never,
): SearchItem {
  const base = {
    id,
    label: `${triggerChar}${name}`,
    value: name,
    kind,
    triggerChar,
    group,
  };

  if (kind === 'agent') {
    return {
      ...base,
      kind: 'agent',
      group: 'AGENTS',
      agent: source as AeroAgentCompact,
    };
  }

  if (kind === 'command') {
    return {
      ...base,
      kind: 'command',
      group: 'COMMANDS',
      command: source as AeroCommandCompact,
    };
  }

  if (kind === 'skill') {
    return {
      ...base,
      kind: 'skill',
      group: 'SKILLS',
      skill: source as AeroSkillCompact,
    };
  }

  return base as SearchItem;
}

export function unifiedSearch(
  trigger: TriggerChar,
  query: string,
  data: SearchData,
) {
  const q = query.toLowerCase();
  const results: SearchItem[] = [];

  if (trigger === '@') {
    const agents = query === '' ? data.agents.slice(0, 5) : data.agents;

    for (const agent of agents) {
      if (matches(agent.name, q)) {
        results.push(
          createItem(
            `agent:${agent.name}`,
            agent.name,
            'agent',
            '@',
            'AGENTS',
            agent,
          ),
        );
      }
    }

    for (const path of data.files) {
      results.push(createItem(`file:${path}`, path, 'file', '@', 'FILES'));
    }
  }

  if (trigger === '/') {
    const segments = useComposerStore.getState().segments;

    const nonEmptySegments = segments.filter(
      (segment) =>
        segment.type === 'token' ||
        (segment.type === 'text' && segment.text.trim().length > 0),
    );

    const canAddCommand =
      nonEmptySegments.length === 1 &&
      nonEmptySegments[0].type === 'text' &&
      nonEmptySegments[0].text.startsWith('/');

    if (canAddCommand) {
      const commands = query === '' ? data.commands.slice(0, 5) : data.commands;

      for (const command of commands) {
        if (matches(command.name, q)) {
          results.push(
            createItem(
              `command:${command.name}`,
              command.name,
              'command',
              '/',
              'COMMANDS',
              command,
            ),
          );
        }
      }
    }

    const skills = query === '' ? data.skills.slice(0, 5) : data.skills;
    for (const skill of skills) {
      if (matches(skill.name, q)) {
        results.push(
          createItem(
            `skill:${skill.name}`,
            skill.name,
            'skill',
            '/',
            'SKILLS',
            skill,
          ),
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

export function extractCommandPayload(
  segments:
    | ComposerSegment[]
    | {
        type: 'shell';
        text: string;
      }[],
) {
  let command: string | undefined;
  const argumentTexts: string[] = [];
  const parts: SendCommandInput['parts'] = [];

  for (const segment of segments) {
    if (segment.type === 'text') {
      const trimmed = segment.text.trim();
      if (trimmed) {
        argumentTexts.push(trimmed);
      }
    } else if (segment.type === 'token') {
      const { token } = segment;

      if (token.type === 'command') {
        // e.g., token.value = "explain" or "/explain"
        command = token.value.replace(/^\//, '');
      } else if (token.type === 'file') {
        const path = token.value; // e.g. "src/index.ts"
        const filename = path.split('/').pop() || path;
        const ext = filename.split('.').pop()?.toLowerCase() || '';

        parts.push({
          type: 'file',
          filename,
          url: path, // Uses file path as fallback identifier
          mime: getMimeFromExtension(ext),
          source: {
            type: 'file',
            path,
            text: {
              value: `@${token.label || filename}`,
              start: 0,
              end: 0,
            },
          },
        });
      }
    }
  }

  return {
    command: command || '',
    arguments: argumentTexts.join(' '),
    parts,
  };
}

// Simple mime inference helper
function getMimeFromExtension(ext: string): string {
  const mimeMap: Record<string, string> = {
    ts: 'text/typescript',
    tsx: 'text/typescript-jsx',
    js: 'text/javascript',
    jsx: 'text/javascript-jsx',
    json: 'application/json',
    py: 'text/x-python',
    md: 'text/markdown',
    html: 'text/html',
    css: 'text/css',
  };
  return mimeMap[ext] || 'text/plain';
}
