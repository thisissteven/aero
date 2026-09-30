import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { z } from 'zod';

import { LEGACY_SNIPPETS_DIR, SNIPPETS_PATH } from '@/server/helper';
import { normalizePath } from '@/server/shared';

/**
 * Snippets are an Aero-only feature. They live in a single JSON file under the
 * Aero home directory (`~/.aero/snippets.json`) so they can be scoped either
 * globally or to a specific workspace.
 */

const TRIGGER_RE = /^[a-zA-Z0-9_.-]+$/;

export const snippetScopeSchema = z.enum(['global', 'workspace']);
export type SnippetScope = z.infer<typeof snippetScopeSchema>;

export const snippetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(''),
  aliases: z.array(z.string()),
  content: z.string(),
  scope: snippetScopeSchema,
  directory: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Snippet = z.infer<typeof snippetSchema>;

const snippetsFileSchema = z.object({
  version: z.literal(1),
  snippets: z.array(snippetSchema),
});

export interface CreateSnippetInput {
  name: string;
  content: string;
  description?: string;
  aliases?: string[];
  scope: SnippetScope;
  directory?: string;
}

export interface UpdateSnippetInput {
  name?: string;
  content?: string;
  description?: string;
  aliases?: string[];
  scope?: SnippetScope;
  directory?: string;
}

function normalizeDirectory(directory?: string): string | undefined {
  return directory ? normalizePath(directory) : undefined;
}

function normalizeAliases(aliases?: string[]): string[] {
  return (aliases ?? []).map((alias) => alias.trim()).filter(Boolean);
}

function assertValidTrigger(value: string, field: string): void {
  if (!TRIGGER_RE.test(value)) {
    throw new Error(
      `Invalid snippet ${field} "${value}". Use letters, numbers, ".", "_" or "-".`,
    );
  }
}

function scopeKey(snippet: Pick<Snippet, 'scope' | 'directory'>): string {
  return snippet.scope === 'global'
    ? 'global'
    : `workspace:${normalizeDirectory(snippet.directory) ?? ''}`;
}

function assertNoConflicts(
  all: Snippet[],
  candidate: Snippet,
  excludeId?: string,
): void {
  const candidateKey = scopeKey(candidate);
  const candidateTriggers = new Set(
    [candidate.name, ...candidate.aliases].map((trigger) =>
      trigger.toLowerCase(),
    ),
  );

  for (const other of all) {
    if (other.id === excludeId) continue;
    if (scopeKey(other) !== candidateKey) continue;

    for (const trigger of [other.name, ...other.aliases]) {
      if (candidateTriggers.has(trigger.toLowerCase())) {
        throw new Error(`Snippet trigger "${trigger}" is already in use.`);
      }
    }
  }
}

async function readSnippetsFile(): Promise<Snippet[]> {
  try {
    const raw = await readFile(SNIPPETS_PATH, 'utf8');
    const parsed = snippetsFileSchema.parse(JSON.parse(raw));
    return parsed.snippets;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      const migrated = await migrateLegacySnippets();
      if (migrated.length > 0) {
        await writeSnippetsFile(migrated);
      }
      return migrated;
    }

    throw error;
  }
}

/**
 * One-time migration from the old `~/.aero/snippets/*.txt` layout. Each file
 * becomes a global snippet named after the file.
 */
async function migrateLegacySnippets(): Promise<Snippet[]> {
  try {
    const entries = await readdir(LEGACY_SNIPPETS_DIR, { withFileTypes: true });
    const now = new Date().toISOString();
    const snippets: Snippet[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.txt')) continue;

      const name = entry.name.slice(0, -'.txt'.length);
      if (!TRIGGER_RE.test(name)) continue;

      try {
        const content = await readFile(
          join(LEGACY_SNIPPETS_DIR, entry.name),
          'utf8',
        );

        snippets.push({
          id: crypto.randomUUID(),
          name,
          description: '',
          aliases: [],
          content,
          scope: 'global',
          createdAt: now,
          updatedAt: now,
        });
      } catch {
        // Skip unreadable entries.
      }
    }

    return snippets;
  } catch {
    return [];
  }
}

let writeQueue: Promise<void> = Promise.resolve();

function writeSnippetsFile(snippets: Snippet[]): Promise<void> {
  const payload = `${JSON.stringify({ version: 1, snippets }, null, 2)}\n`;

  const task = writeQueue.then(async () => {
    await mkdir(dirname(SNIPPETS_PATH), { recursive: true });

    const tempPath = `${SNIPPETS_PATH}.tmp`;

    await writeFile(tempPath, payload, 'utf8');
    await rename(tempPath, SNIPPETS_PATH);
  });

  writeQueue = task.catch(() => {
    //
  });

  return task;
}

/**
 * Snippets visible for a directory: every global snippet plus any workspace
 * snippet scoped to that directory. Workspace snippets are returned last so a
 * name lookup lets a project snippet shadow a personal one.
 */
export async function listSnippets(directory?: string): Promise<Snippet[]> {
  const all = await readSnippetsFile();
  const normalized = normalizeDirectory(directory);

  return all
    .filter(
      (snippet) =>
        snippet.scope === 'global' ||
        (normalized !== undefined &&
          normalizeDirectory(snippet.directory) === normalized),
    )
    .sort((a, b) =>
      a.scope === b.scope
        ? a.name.localeCompare(b.name)
        : a.scope === 'global'
          ? -1
          : 1,
    );
}

export async function createSnippet(
  input: CreateSnippetInput,
): Promise<Snippet> {
  const all = await readSnippetsFile();

  const name = input.name.trim();
  const aliases = normalizeAliases(input.aliases);

  assertValidTrigger(name, 'name');
  for (const alias of aliases) assertValidTrigger(alias, 'alias');

  const directory =
    input.scope === 'workspace'
      ? normalizeDirectory(input.directory)
      : undefined;

  if (input.scope === 'workspace' && !directory) {
    throw new Error(
      'A workspace directory is required for workspace snippets.',
    );
  }

  const now = new Date().toISOString();

  const snippet: Snippet = {
    id: crypto.randomUUID(),
    name,
    description: (input.description ?? '').trim(),
    aliases: aliases.filter(
      (alias) => alias.toLowerCase() !== name.toLowerCase(),
    ),
    content: input.content,
    scope: input.scope,
    createdAt: now,
    updatedAt: now,
  };

  if (directory) snippet.directory = directory;

  assertNoConflicts(all, snippet);

  await writeSnippetsFile([...all, snippet]);

  return snippet;
}

export async function updateSnippet(
  id: string,
  patch: UpdateSnippetInput,
): Promise<Snippet> {
  const all = await readSnippetsFile();
  const index = all.findIndex((snippet) => snippet.id === id);

  if (index === -1) {
    throw new Error('Snippet not found.');
  }

  const current = all[index];
  const scope = patch.scope ?? current.scope;

  const name = (patch.name ?? current.name).trim();
  const aliases =
    patch.aliases !== undefined
      ? normalizeAliases(patch.aliases)
      : current.aliases;

  assertValidTrigger(name, 'name');
  for (const alias of aliases) assertValidTrigger(alias, 'alias');

  const directory =
    scope === 'workspace'
      ? normalizeDirectory(patch.directory ?? current.directory)
      : undefined;

  if (scope === 'workspace' && !directory) {
    throw new Error(
      'A workspace directory is required for workspace snippets.',
    );
  }

  const next: Snippet = {
    id: current.id,
    name,
    description:
      patch.description !== undefined
        ? patch.description.trim()
        : current.description,
    aliases: aliases.filter(
      (alias) => alias.toLowerCase() !== name.toLowerCase(),
    ),
    content: patch.content ?? current.content,
    scope,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  };

  if (directory) next.directory = directory;

  assertNoConflicts(all, next, id);

  all[index] = next;

  await writeSnippetsFile(all);

  return next;
}

export async function deleteSnippet(id: string): Promise<void> {
  const all = await readSnippetsFile();
  const next = all.filter((snippet) => snippet.id !== id);

  if (next.length === all.length) return;

  await writeSnippetsFile(next);
}
