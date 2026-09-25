import { FilePartInput } from '@opencode-ai/sdk/v2';
import type {
  ComposerSegment,
  TokenSegment,
} from '@/app/components/smart-composer/smart-composer-helpers';
import {
  ChatQuoteItem,
  SessionExternalPartsState,
} from '@/app/features/chat-page/chat-input/external-parts-store';

import { apiError } from '@/app/hooks/i18n/api-errors';
import { AeroPartUserMessage } from '@/server/services/harness/types';

/* ------------------------------------------------------------------ */
/*  Composer segments -> parts                                         */
/* ------------------------------------------------------------------ */

const MIME_MAP: Record<string, string> = {
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

function getMimeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return MIME_MAP[ext] ?? 'text/plain';
}

function buildFileMentionPart(token: TokenSegment['token']): FilePartInput {
  const path = token.value;
  const filename = path.split('/').pop() || path;

  return {
    type: 'file',
    mime: getMimeFromPath(path),
    filename,
    url: path, // matches extractCommandPayload's convention
    source: {
      type: 'file',
      path,
      text: {
        value: `@${token.value}`,
        start: 0,
        end: 0,
      },
    },
  };
}

function buildAgentMentionPart(
  token: TokenSegment['token'],
): AeroPartUserMessage {
  return {
    type: 'agent',
    name: token.value,
    // source: {
    //   value: `@${token.value}`,
    //   start: 0,
    //   end: 0,
    // },
  };
}

/**
 * Skills and snippets go across as text parts. The backend receives the
 * reference; any expansion is its call.
 */
function buildReferencePart(token: TokenSegment['token']): AeroPartUserMessage {
  return {
    type: 'text',
    text: token.value,
    metadata: {
      kind: token.type, // 'snippet' | 'skill'
      name: token.value,
    },
  };
}

/**
 * Token segments only. Text segments are skipped — their content already
 * lives in `payload.text`, which is prepended by `buildMessageParts`.
 * Command tokens are also skipped; those go through
 * `extractCommandPayload` + `sendCommand`.
 */
export function buildComposerTokenParts(
  segments: ComposerSegment[],
): AeroPartUserMessage[] {
  const parts: AeroPartUserMessage[] = [];

  for (const segment of segments) {
    if (segment.type !== 'token') continue;

    const { token } = segment;

    switch (token.type) {
      case 'file':
        parts.push(buildFileMentionPart(token));
        break;
      case 'agent':
        parts.push(buildAgentMentionPart(token));
        break;
      case 'snippet':
      case 'skill':
        parts.push(buildReferencePart(token));
        break;
      case 'command':
        // handled separately by the command flow
        break;
    }
  }

  return parts;
}

/* ------------------------------------------------------------------ */
/*  External parts -> parts                                            */
/* ------------------------------------------------------------------ */

function formatChatQuote(quote: ChatQuoteItem) {
  const quoted = quote.selection
    .trim()
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');

  const comment = quote.comment.trim();
  return comment ? `${quoted}\n\n${comment}` : quoted;
}

/**
 * Blob URLs are browser-scoped and rejected by opencode's URL validator
 * (http/https/data only). Data URLs travel with the request and are
 * accepted, so we read the File at send time.
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(reader.error ?? new Error(apiError('failedToReadFile')));
    reader.readAsDataURL(file);
  });
}

/**
 * Order:
 *   1. file attachments
 *   2. chat quotes (one text part each)
 *   3. browser annotations (image + text)
 *   4. subtask (at most one)
 */
export async function buildExternalParts(
  state: Pick<
    SessionExternalPartsState,
    'fileAttachments' | 'chatQuotes' | 'browserAnnotations' | 'subtask'
  >,
): Promise<AeroPartUserMessage[]> {
  const parts: AeroPartUserMessage[] = [];

  for (const attachment of state.fileAttachments) {
    if (attachment.file) {
      const url = await fileToDataUrl(attachment.file);

      parts.push({
        type: 'file',
        mime: attachment.mime,
        filename: attachment.filename,
        url,
      });
    }
  }

  for (const quote of state.chatQuotes) {
    parts.push({
      type: 'text',
      text: formatChatQuote(quote),
      metadata: {
        kind: 'chat-quote',
        sourceMessageId: quote.sourceMessageId,
        sourceSessionId: quote.sourceSessionId,
      },
    });
  }

  for (const annotation of state.browserAnnotations) {
    parts.push({
      type: 'file',
      mime: annotation.imageMime ?? 'image/png',
      filename: 'browser-annotation.png',
      url: annotation.imageUrl,
    });
    parts.push({
      type: 'text',
      text: annotation.text,
      metadata: {
        kind: 'browser-annotation',
        pageUrl: annotation.pageUrl,
        pageTitle: annotation.pageTitle,
      },
    });
  }

  if (state.subtask) {
    parts.push({ type: 'subtask', ...state.subtask });
  }

  return parts;
}

/* ------------------------------------------------------------------ */
/*  Merge                                                              */
/* ------------------------------------------------------------------ */

/**
 * Build the full `parts` array for `sendMessage`:
 *   [ primary text, composer tokens..., external parts... ]
 */
export async function buildMessageParts(
  text: string,
  segments: ComposerSegment[],
  external: Pick<
    SessionExternalPartsState,
    'fileAttachments' | 'chatQuotes' | 'browserAnnotations' | 'subtask'
  >,
): Promise<AeroPartUserMessage[]> {
  const parts: AeroPartUserMessage[] = [];

  if (text) {
    parts.push({ type: 'text', text });
  }

  parts.push(...buildComposerTokenParts(segments));
  parts.push(...(await buildExternalParts(external)));

  return parts;
}
