import type {
  AeroPartUserMessage,
  AeroSkill,
} from '@/server/services/harness/types';
import { listSnippets } from '@/server/services/snippets';

type SkillRefPart = AeroPartUserMessage & {
  type: 'text';
  metadata: { kind: 'skill'; name: string };
};

type SnippetRefPart = AeroPartUserMessage & {
  type: 'text';
  metadata: { kind: 'snippet'; name: string };
};

type AgentPart = AeroPartUserMessage & { type: 'agent'; name: string };

type FilePart = Extract<AeroPartUserMessage, { type: 'file' }>;

function isSkillRef(part: AeroPartUserMessage): part is SkillRefPart {
  if (part.type !== 'text') return false;
  const meta = part.metadata as { kind?: unknown; name?: unknown } | undefined;
  return meta?.kind === 'skill' && typeof meta.name === 'string';
}

function isSnippetRef(part: AeroPartUserMessage): part is SnippetRefPart {
  if (part.type !== 'text') return false;
  const meta = part.metadata as { kind?: unknown; name?: unknown } | undefined;
  return meta?.kind === 'snippet' && typeof meta.name === 'string';
}

function isAgentPart(part: AeroPartUserMessage): part is AgentPart {
  return part.type === 'agent';
}

function isFilePart(part: AeroPartUserMessage): part is FilePart {
  return part.type === 'file';
}

function isPrimaryText(
  part: AeroPartUserMessage,
): part is AeroPartUserMessage & { type: 'text' } {
  return (
    part.type === 'text' &&
    !part.synthetic &&
    !isSkillRef(part) &&
    !isSnippetRef(part)
  );
}

function normalizePart<T extends AeroPartUserMessage>(part: T): T {
  if (part.type !== 'text') return part;
  return { ...part, text: part.text.trim() };
}

function keepFirstAgentPart(
  parts: AeroPartUserMessage[],
): AeroPartUserMessage[] {
  let seenAgent = false;

  return parts.filter((part) => {
    if (!isAgentPart(part)) return true;
    if (seenAgent) return false;
    seenAgent = true;
    return true;
  });
}

/* ------------------------------------------------------------------ */
/*  File parts                                                         */
/* ------------------------------------------------------------------ */

const KNOWN_SCHEME = /^(?:file|https?|data|blob):/i;

function hasResolvableUrl(url: string): boolean {
  return KNOWN_SCHEME.test(url);
}

function isAbsolutePath(p: string): boolean {
  return p.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(p);
}

function toFileUrl(directory: string, inputPath: string): string {
  const normalizedInput = inputPath.replace(/\\/g, '/');

  const abs = isAbsolutePath(normalizedInput)
    ? normalizedInput
    : `${directory.replace(/\\/g, '/').replace(/\/+$/, '')}/${normalizedInput.replace(/^\/+/, '')}`;

  return abs.startsWith('/') ? `file://${abs}` : `file:///${abs}`;
}

function normalizeFilePart(
  part: FilePart,
  directory: string,
): AeroPartUserMessage {
  const { source: _source, ...rest } = part;
  const url = rest.url;

  if (!url || hasResolvableUrl(url)) {
    return rest;
  }

  return { ...rest, url: toFileUrl(directory, url) };
}

function normalizeFileParts(
  parts: AeroPartUserMessage[],
  directory: string,
): AeroPartUserMessage[] {
  return parts.map((part) =>
    isFilePart(part) ? normalizeFilePart(part, directory) : part,
  );
}

/* ------------------------------------------------------------------ */
/*  Snippet expansion                                                  */
/* ------------------------------------------------------------------ */

async function expandSnippetParts(
  parts: AeroPartUserMessage[],
): Promise<AeroPartUserMessage[]> {
  const refs = parts.filter(isSnippetRef);
  if (refs.length === 0) return parts;

  let byName: Map<string, { name: string; content: string }>;
  try {
    const snippets = await listSnippets();
    byName = new Map(snippets.map((s) => [s.name, s]));
  } catch {
    // If we can't read the snippets dir, don't blow up the send —
    // just pass refs through unresolved.
    byName = new Map();
  }

  return parts.map((part) => {
    if (!isSnippetRef(part)) return part;

    const snippet = byName.get(part.metadata.name);
    if (!snippet) {
      // Unknown snippet: keep the ref as-is but mark synthetic so it
      // doesn't render in the transcript.
      return { ...part, synthetic: true };
    }

    return {
      type: 'text',
      text: snippet.content.trim(),
      synthetic: true,
      metadata: { kind: 'snippet', name: snippet.name },
    } satisfies AeroPartUserMessage;
  });
}

/* ------------------------------------------------------------------ */
/*  Skill expansion                                                    */
/* ------------------------------------------------------------------ */

function formatSkillContent(skill: AeroSkill): string {
  return (
    skill.content +
    `\n\nBase directory for this skill: ${skill.location}\n` +
    `Relative paths in this skill (e.g., scripts/, references/) are relative to this base directory.`
  );
}

function contentPart(skill: AeroSkill): AeroPartUserMessage {
  return normalizePart({
    type: 'text',
    text: formatSkillContent(skill),
    metadata: { kind: 'skill', name: skill.name },
  });
}

function mentionedPart(skills: AeroSkill[]): AeroPartUserMessage {
  const list = skills.map((s) => `/${s.name}`).join(', ');
  return {
    type: 'text',
    text: `The user explicitly mentioned these skills in their message: ${list}. Use the corresponding skill tool when it is relevant to accomplishing the user's request.`,
    synthetic: true,
  };
}

function invokedPart(skill: AeroSkill): AeroPartUserMessage {
  return {
    type: 'text',
    text: `The user explicitly invoked the ${skill.name} skill. Use the corresponding skill tool to handle this request.`,
    synthetic: true,
  };
}

/* ------------------------------------------------------------------ */
/*  Entry point                                                        */
/* ------------------------------------------------------------------ */

export async function expandMessageParts(
  parts: AeroPartUserMessage[],
  directory: string,
  harness: { listSkills: (dir: string) => Promise<AeroSkill[]> },
): Promise<AeroPartUserMessage[]> {
  const deduped = keepFirstAgentPart(parts);
  const resolved = normalizeFileParts(deduped, directory);
  const withSnippets = await expandSnippetParts(resolved);

  const skillRefs = withSnippets.filter(isSkillRef);

  if (skillRefs.length === 0) {
    return withSnippets.map(normalizePart);
  }

  let skills: AeroSkill[];
  try {
    skills = await harness.listSkills(directory);
  } catch {
    skills = [];
  }

  const byName = new Map(skills.map((s) => [s.name, s]));

  const seen = new Set<string>();
  const uniqueSkills: AeroSkill[] = [];
  const unresolvedSkillRefs: SkillRefPart[] = [];

  for (const ref of skillRefs) {
    const name = ref.metadata.name;
    if (seen.has(name)) continue;
    seen.add(name);

    const skill = byName.get(name);
    if (!skill) {
      unresolvedSkillRefs.push(ref);
      continue;
    }
    uniqueSkills.push(skill);
  }

  const primaryTextParts = withSnippets.filter(isPrimaryText);

  const bare =
    uniqueSkills.length === 1 &&
    primaryTextParts.length === 1 &&
    primaryTextParts[0].text.trim() === `/${uniqueSkills[0].name}`;

  const out: AeroPartUserMessage[] = [];

  for (const part of withSnippets) {
    if (isSkillRef(part)) {
      // Unknown skill: keep the ref as-is, marked synthetic so it's
      // hidden from the transcript.
      if (unresolvedSkillRefs.includes(part)) {
        out.push({ ...part, synthetic: true });
      }
      // Known skill: handled by the append below.
      continue;
    }

    if (bare && isPrimaryText(part)) {
      out.push(contentPart(uniqueSkills[0]));
      continue;
    }

    out.push(normalizePart(part));
  }

  if (uniqueSkills.length > 0) {
    out.push(mentionedPart(uniqueSkills));
    out.push(invokedPart(uniqueSkills[0]));
  }

  return out;
}
