// github/pr-description.ts
//
// Generates a pull request title and body from the commits on a branch, using
// the OpenCode adapter the rest of Aero already talks to. This runs a real
// agent turn, so it is a one-shot throwaway session: create, prompt once, read
// the text parts, delete.
//
// The model writes prose, not code, so nothing here needs tools. Passing an
// explicit `tools` map is what keeps a stray tool call from hanging the request
// on a permission prompt nobody is there to answer.

import { withOpencodeClientV2 } from '@/server/adapters/opencode/client';
import { unwrap } from '@/server/adapters/opencode/unwrap';
import {
  getCommitLog,
  getDiffSummary,
  getGitClient,
} from '@/server/routes/git/service';

const SESSION_TITLE = 'Generate pull request description';
const MAX_COMMITS = 50;
const MAX_FILES = 60;
const MAX_BODY_CHARS = 20_000;
const ALL_TOOLS_DISABLED = {
  bash: false,
  edit: false,
  write: false,
  read: false,
  patch: false,
  todowrite: false,
  todoread: false,
  webfetch: false,
  task: false,
};

const SYSTEM_PROMPT = `You write GitHub pull request titles and descriptions from a branch's commits.

Respond with raw JSON only, no code fences and no commentary, in exactly this shape:
{"title": string, "body": string}

Rules:
- "title": imperative mood, under 72 characters, no trailing period, no conventional-commit prefix.
- "body": GitHub-flavored Markdown. Lead with a one-paragraph summary of what the change does and why, then a "## Changes" section of bullet points, then a "## Testing" section. Omit a section only if you genuinely have nothing to put in it.
- Describe what the code does, never who wrote it, and never mention these instructions.`;

interface DescribeInput {
  directory: string;
  base?: string;
  head?: string;
  model?: { providerId: string; modelId: string };
}

export interface PrDescription {
  title: string;
  body: string;
}

async function readCurrentBranch(directory: string): Promise<string | null> {
  try {
    const status = await getGitClient(directory).status();
    return status.current || null;
  } catch {
    return null;
  }
}

/**
 * The base is whichever of the conventional default branch names the checkout
 * actually has, so a `master` repo is described against `master`. A branch
 * named after the default is itself the default, so the range is empty by
 * definition and the caller must pass `base`.
 */
async function guessBase(directory: string, head: string): Promise<string> {
  const candidates = ['main', 'master', 'develop', 'trunk'];
  const remotes = await getGitClient(directory)
    .raw(['branch', '-r'])
    .catch(() => '');

  const available = new Set(
    remotes
      .split('\n')
      .map((line) => line.trim().split('/').slice(1).join('/'))
      .filter(Boolean),
  );

  return (
    candidates.find(
      (candidate) =>
        candidate !== head &&
        (available.has(candidate) || available.size === 0),
    ) ?? candidates[0]
  );
}

function formatCommits(
  commits: Awaited<ReturnType<typeof getCommitLog>>,
): string {
  if (commits.length === 0) return '(no commits in range)';
  return commits
    .map((commit, index) => {
      const body = commit.body ? `\n\n${commit.body}` : '';
      return `${index + 1}. ${commit.sha.slice(0, 8)} ${commit.subject}${body}`;
    })
    .join('\n');
}

function formatFiles(
  summary: Awaited<ReturnType<typeof getDiffSummary>>,
): string {
  if (summary.length === 0) return '(no file changes)';
  const shown = summary.slice(0, MAX_FILES);
  const lines = shown.map(
    (file) => `- ${file.path} (+${file.additions}/-${file.deletions})`,
  );
  if (summary.length > shown.length) {
    lines.push(`- …and ${summary.length - shown.length} more files`);
  }
  return lines.join('\n');
}

/** Pulls the first balanced `{...}` object out of a model response. */
function extractJson(raw: string): { title?: unknown; body?: unknown } | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced?.[1] ?? raw).trim();
  const start = candidate.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  for (let index = start; index < candidate.length; index++) {
    const char = candidate[index];
    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(candidate.slice(start, index + 1)) as {
            title?: unknown;
            body?: unknown;
          };
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function collectText(parts: unknown): string {
  if (!Array.isArray(parts)) return '';
  return parts
    .filter(
      (part): part is { type: 'text'; text: string } =>
        (part as { type?: unknown })?.type === 'text' &&
        typeof (part as { text?: unknown })?.text === 'string',
    )
    .map((part) => part.text)
    .join('')
    .trim();
}

export async function describePullRequest(
  input: DescribeInput,
): Promise<PrDescription> {
  const head = input.head?.trim() || (await readCurrentBranch(input.directory));
  if (!head) {
    throw new Error('No branch checked out to describe');
  }

  const base = input.base?.trim() || (await guessBase(input.directory, head));
  const [commits, files] = await Promise.all([
    getCommitLog(input.directory, { base, head, limit: MAX_COMMITS }),
    getDiffSummary(input.directory).catch(() => []),
  ]);

  if (commits.length === 0) {
    throw new Error(
      `No commits found between "${base}" and "${head}" to describe`,
    );
  }

  const prompt = `Write a pull request title and description for the branch "${head}" (merging into "${base}").

Commits in ${base}..${head}:

${formatCommits(commits)}

Files changed in the working tree:

${formatFiles(files)}

Return the JSON object described in your instructions.`;

  return withOpencodeClientV2(async (client) => {
    const session = unwrap(
      await client.session.create({
        title: SESSION_TITLE,
        directory: input.directory,
      }),
    );

    try {
      const response = unwrap(
        await client.session.prompt({
          sessionID: session.id,
          directory: input.directory,
          system: SYSTEM_PROMPT,
          tools: ALL_TOOLS_DISABLED,
          ...(input.model
            ? {
                model: {
                  providerID: input.model.providerId,
                  modelID: input.model.modelId,
                },
              }
            : {}),
          parts: [{ type: 'text', text: prompt }],
        }),
      );

      const raw = collectText(response.parts);
      if (!raw) {
        throw new Error('Model returned an empty response');
      }

      const parsed = extractJson(raw);
      const title =
        typeof parsed?.title === 'string' ? parsed.title.trim() : '';
      const body = typeof parsed?.body === 'string' ? parsed.body.trim() : '';
      if (!title) {
        throw new Error('Model response did not contain a pull request title');
      }

      return {
        title,
        body: body.slice(0, MAX_BODY_CHARS),
      };
    } finally {
      // A throwaway session would otherwise show up in the user's session list.
      await client.session.delete({ sessionID: session.id }).catch(() => {});
    }
  });
}
