import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SNIPPETS_PATH } from '@/server/helper';

export interface Snippet {
  name: string;
  content: string;
}

const NAME_RE = /^[a-zA-Z0-9_.-]+$/;

function assertValidName(name: string): void {
  if (!NAME_RE.test(name)) {
    throw new Error(`Invalid snippet name: ${name}`);
  }
}

function pathFor(name: string): string {
  return join(SNIPPETS_PATH, `${name}.txt`);
}

async function ensureDir(): Promise<void> {
  await mkdir(SNIPPETS_PATH, { recursive: true });
}

export async function listSnippets(): Promise<Snippet[]> {
  await ensureDir();

  const entries = await readdir(SNIPPETS_PATH, { withFileTypes: true });
  const snippets: Snippet[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.txt')) continue;
    const name = entry.name.slice(0, -'.txt'.length);
    try {
      const content = await readFile(pathFor(name), 'utf8');
      snippets.push({ name, content });
    } catch {
      // Skip unreadable entries.
    }
  }

  snippets.sort((a, b) => a.name.localeCompare(b.name));
  return snippets;
}

export async function getSnippet(name: string): Promise<Snippet | null> {
  assertValidName(name);
  try {
    const content = await readFile(pathFor(name), 'utf8');
    return { name, content };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

export async function createSnippet(
  name: string,
  content: string,
): Promise<Snippet> {
  assertValidName(name);
  await ensureDir();

  const existing = await getSnippet(name);
  if (existing) {
    throw new Error(`Snippet already exists: ${name}`);
  }

  await writeFile(pathFor(name), content, 'utf8');
  return { name, content };
}

export async function updateSnippet(
  name: string,
  content: string,
): Promise<Snippet> {
  assertValidName(name);
  await ensureDir();
  await writeFile(pathFor(name), content, 'utf8');
  return { name, content };
}

export async function deleteSnippet(name: string): Promise<void> {
  assertValidName(name);
  await rm(pathFor(name), { force: true });
}
