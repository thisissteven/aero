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
