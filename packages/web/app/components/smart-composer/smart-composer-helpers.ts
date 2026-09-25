import {
  getCustomCommandsNonSession,
  getExcludedCommands,
  getSteerCommand,
  isCustomCommandName,
} from '@/app/components/smart-composer/custom-commands';
import {
  AnyComposerSegment,
  getComposerSession,
  useComposerStore,
} from '@/app/components/smart-composer/smart-composer-store';
import { BaseTranslation } from '@/app/hooks/i18n/locales/translations';
import {
  AeroAgentCompact,
  AeroCommandCompact,
  AeroSkillCompact,
  SendCommandInput,
} from '@/server/services/harness/types';

const SNIPPETS = (t: BaseTranslation) => [
  { id: 'n1', label: t.composer.bugReport, value: 'bug-report' },
  { id: 'n2', label: t.composer.reactComponent, value: 'react-component' },
];

export const COMPOSER_CLIPBOARD_MIME = 'application/x-aero-composer+json';

export const TRIGGER_CHARS = ['@', '/', '#'] as const;

export type TokenType = 'file' | 'agent' | 'command' | 'skill' | 'snippet';

export type TriggerChar = (typeof TRIGGER_CHARS)[number];

interface TextSegment {
  type: 'text';
  text: string;
}

export interface TokenSegment {
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
  sessionId: string,
  t: BaseTranslation,
) {
  const q = query.toLowerCase();
  const results: SearchItem[] = [];

  if (trigger === '@') {
    for (const agent of data.agents) {
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
    const segments = getComposerSession(
      useComposerStore.getState(),
      sessionId,
    ).segments;

    const nonEmptySegments = segments.filter(
      (segment) =>
        segment.type === 'token' ||
        (segment.type === 'text' && segment.text.trim().length > 0),
    );

    const canAddCommandIfEmpty =
      nonEmptySegments.length === 1 &&
      nonEmptySegments[0].type === 'text' &&
      nonEmptySegments[0].text.trimStart().startsWith('/');

    const canAddCommandIfSteer =
      nonEmptySegments.length === 2 &&
      nonEmptySegments[0].type === 'token' &&
      nonEmptySegments[0].token.value === 'steer' &&
      nonEmptySegments[1].type === 'text' &&
      nonEmptySegments[1].text.trimStart().startsWith('/');

    if (canAddCommandIfEmpty || canAddCommandIfSteer) {
      const commands = [
        ...data.commands,
        ...(sessionId ? getExcludedCommands(t) : []),
        ...(sessionId && !canAddCommandIfSteer ? [getSteerCommand(t)] : []),
        ...getCustomCommandsNonSession(t),
      ];
      for (const command of commands) {
        if (
          matches(command.name, q) ||
          matches(command.hints.join(' '), q) ||
          matches(command.description ?? '', q)
        ) {
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

    for (const skill of data.skills) {
      if (matches(skill.name, q) || matches(skill.description ?? '', q)) {
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
    for (const snippet of SNIPPETS(t)) {
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

export function extractCommandPayload(segments: AnyComposerSegment[]) {
  let command: string | undefined;
  let isCustomCommand = false;
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
        isCustomCommand = isCustomCommandName(command);
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
    isCustomCommand,
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
