import type { JSONContent } from '@aero/ui';

function emptyDocument(): JSONContent {
  return { type: 'doc', content: [{ type: 'paragraph' }] };
}

/**
 * Notes are persisted as a JSON string of the editor document. Notes written
 * before the editor existed are plain text, so anything that does not parse
 * into a `doc` node is migrated into paragraphs instead of being discarded.
 */
export function parseNotesDocument(value: string): JSONContent {
  const trimmed = value.trim();
  if (!trimmed) return emptyDocument();

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      (parsed as { type?: unknown }).type === 'doc'
    ) {
      return parsed as JSONContent;
    }
  } catch {
    // Not JSON — fall through to the plain-text migration below.
  }

  return plainTextDocument(value);
}

function plainTextDocument(value: string): JSONContent {
  return {
    type: 'doc',
    content: value
      .split('\n')
      .map((line) =>
        line
          ? { type: 'paragraph', content: [{ type: 'text', text: line }] }
          : { type: 'paragraph' },
      ),
  };
}

export function serializeNotesDocument(
  document: JSONContent,
  isEmpty: boolean,
): string {
  return isEmpty ? '' : JSON.stringify(document);
}

/** Build a persisted note body from a block of plain text. */
export function notesDocumentFromText(value: string): string {
  return value.trim() ? JSON.stringify(plainTextDocument(value)) : '';
}

/** First non-empty line of a block of text, trimmed and clamped. */
export function notesTitleFromText(value: string, maxLength = 200): string {
  const firstLine = value
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);

  return (firstLine ?? '').slice(0, maxLength);
}
