import { cn } from '@aero/ui';
import { Fragment, memo } from 'react';

type TokenType = 'file' | 'agent' | 'skill' | 'command' | 'snippet';
type Trigger = '@' | '/' | '#';

// Keep this in sync with your smart-composer file (or import it from there).
const TOKEN_COLOR_MAP: Record<TokenType, string> = {
  file: 'text-accent',
  agent: 'text-accent-soft-foreground',
  skill: 'text-success',
  command: 'text-warning',
  snippet: 'text-danger',
};

// Default trigger → type mapping. Override via `resolveTokenType` prop
// if you have a real registry of known tokens.
const DEFAULT_TRIGGER_TYPE: Record<Trigger, TokenType> = {
  '@': 'file',
  '/': 'command',
  '#': 'snippet',
};

const URL_RE = /^https?:\/\/\S+$/i;

// `#` and `/` tokens may only contain letters, digits, and hyphens.
const RESTRICTED_TRIGGER_RE = /^[#/][A-Za-z0-9-]+/;

function trimUrl(url: string): string {
  let end = url.length;
  while (end > 0 && /[.,!?;:)\]}"']/.test(url[end - 1])) end--;
  return url.slice(0, end);
}

type Part =
  | { kind: 'text'; value: string }
  | { kind: 'link'; value: string }
  | { kind: 'token'; value: string; trigger: Trigger };

const isWhitespace = (ch: string) => /\s/.test(ch);

function tokenize(text: string): Part[] {
  const parts: Part[] = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (isWhitespace(ch)) {
      const last = parts[parts.length - 1];
      if (last && last.kind === 'text') {
        last.value += ch;
      } else {
        parts.push({ kind: 'text', value: ch });
      }
      i++;
      continue;
    }

    const atBoundary = i === 0 || isWhitespace(text[i - 1]);

    if (atBoundary) {
      let end = i;
      while (end < text.length && !isWhitespace(text[end])) end++;

      const word = text.slice(i, end);

      if (URL_RE.test(word)) {
        const trimmed = trimUrl(word);
        if (trimmed) {
          parts.push({ kind: 'link', value: trimmed });
          if (trimmed.length < word.length) {
            parts.push({ kind: 'text', value: word.slice(trimmed.length) });
          }
          i = end;
          continue;
        }
      }

      if (ch === '@' && word.length > 1) {
        parts.push({ kind: 'token', value: word, trigger: '@' });
        i = end;
        continue;
      }

      if (ch === '#' || ch === '/') {
        const match = RESTRICTED_TRIGGER_RE.exec(word);
        if (match) {
          parts.push({ kind: 'token', value: match[0], trigger: ch });
          i += match[0].length;
          continue;
        }
      }
    }

    const last = parts[parts.length - 1];
    if (last && last.kind === 'text') {
      last.value += ch;
    } else {
      parts.push({ kind: 'text', value: ch });
    }
    i++;
  }

  return parts;
}

export interface StyledTextProps {
  text: string;
  className?: string;
  /** Optional override for resolving `@foo` → file vs agent, etc. */
  resolveTokenType?: (trigger: Trigger, value: string) => TokenType;
}

export const StyledText = memo(function StyledText({
  text,
  className,
  resolveTokenType,
}: StyledTextProps) {
  const parts = tokenize(text);

  return (
    <span className={className}>
      {parts.map((part, idx) => {
        if (part.kind === 'text') {
          return <Fragment key={idx}>{part.value}</Fragment>;
        }

        if (part.kind === 'link') {
          return (
            <a
              key={idx}
              href={part.value}
              target='_blank'
              rel='noopener noreferrer'
              className='text-accent-soft-foreground underline decoration-1 transition-opacity hover:opacity-80 decoration-dashed underline-offset-4'
            >
              {part.value}
            </a>
          );
        }

        const type = resolveTokenType
          ? resolveTokenType(part.trigger, part.value)
          : DEFAULT_TRIGGER_TYPE[part.trigger];

        return (
          <span key={idx} className={cn('font-medium', TOKEN_COLOR_MAP[type])}>
            {part.value}
          </span>
        );
      })}
    </span>
  );
});
