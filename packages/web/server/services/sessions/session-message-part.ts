import type {
  AeroPartUserMessage,
  AeroSkill,
} from '@/server/services/harness/types';

type SkillRefPart = AeroPartUserMessage & {
  type: 'text';
  metadata: { kind: 'skill'; name: string };
};

type AgentPart = AeroPartUserMessage & { type: 'agent'; name: string };

type FilePart = Extract<AeroPartUserMessage, { type: 'file' }>;

function isSkillRef(part: AeroPartUserMessage): part is SkillRefPart {
  if (part.type !== 'text') return false;
  const meta = part.metadata as { kind?: unknown; name?: unknown } | undefined;
  return meta?.kind === 'skill' && typeof meta.name === 'string';
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
  return part.type === 'text' && !part.synthetic && !isSkillRef(part);
}

function normalizePart<T extends AeroPartUserMessage>(part: T): T {
  if (part.type !== 'text') return part;
  return { ...part, text: part.text.trim() };
}

/**
 * Keep only the first agent part; drop any subsequent ones. Order of
 * everything else is preserved.
 */
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

/** `/home/x` on POSIX, `C:\x` or `C:/x` on Windows. */
function isAbsolutePath(p: string): boolean {
  return p.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(p);
}

function toFileUrl(directory: string, inputPath: string): string {
  const normalizedInput = inputPath.replace(/\\/g, '/');

  const abs = isAbsolutePath(normalizedInput)
    ? normalizedInput
    : `${directory.replace(/\\/g, '/').replace(/\/+$/, '')}/${normalizedInput.replace(/^\/+/, '')}`;

  // POSIX: /home/...  -> file:///home/...
  // Windows: C:/...   -> file:///C:/...
  return abs.startsWith('/') ? `file://${abs}` : `file:///${abs}`;
}

function normalizeFilePart(
  part: FilePart,
  directory: string,
): AeroPartUserMessage {
  // Always drop `source` — opencode's file parts don't carry it and
  // including it is what makes prompt() reject.
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
  return normalizePart({ type: 'text', text: formatSkillContent(skill) });
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

export async function expandMessageParts(
  parts: AeroPartUserMessage[],
  directory: string,
  harness: { listSkills: (dir: string) => Promise<AeroSkill[]> },
): Promise<AeroPartUserMessage[]> {
  const dedupedParts = keepFirstAgentPart(parts);
  const resolvedParts = normalizeFileParts(dedupedParts, directory);
  const skillRefs = resolvedParts.filter(isSkillRef);

  if (skillRefs.length === 0) {
    return resolvedParts.map(normalizePart);
  }

  const skills = await harness.listSkills(directory);
  const byName = new Map(skills.map((s) => [s.name, s]));

  // Resolve in order of appearance; dedupe by name (first wins).
  const seen = new Set<string>();
  const uniqueSkills: AeroSkill[] = [];

  for (const ref of skillRefs) {
    const name = ref.metadata.name;
    if (seen.has(name)) continue;
    seen.add(name);

    const skill = byName.get(name);
    if (!skill) {
      throw new Error(`Unknown skill referenced in message: ${name}`);
    }
    uniqueSkills.push(skill);
  }

  const primaryTextParts = resolvedParts.filter(isPrimaryText);

  // Bare = exactly one unique skill, and the only primary text is `/<name>`.
  // Multiple skills are never "bare" — we always keep the user's text.
  const bare =
    uniqueSkills.length === 1 &&
    primaryTextParts.length === 1 &&
    primaryTextParts[0].text.trim() === `/${uniqueSkills[0].name}`;

  const out: AeroPartUserMessage[] = [];

  for (const part of resolvedParts) {
    if (isSkillRef(part)) continue;

    if (bare && isPrimaryText(part)) {
      // Replace the bare trigger with the skill content.
      out.push(contentPart(uniqueSkills[0]));
      continue;
    }

    out.push(normalizePart(part));
  }

  out.push(mentionedPart(uniqueSkills));
  out.push(invokedPart(uniqueSkills[0]));

  return out;
}
