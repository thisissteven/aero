import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import simpleGit from 'simple-git';
import { z } from 'zod';

export async function resolveGitDir(inputPath: string): Promise<string> {
  // 1. Convert to an absolute path & normalize relative segments (., ..)
  const absolutePath = path.resolve(inputPath);

  // 2. Formatting (slashes logic)
  const normalizedPath = absolutePath.replace(/\\/g, '/').replace(/\/$/, '');

  // 3. Ensure the folder exists on disk
  if (!fs.existsSync(normalizedPath)) {
    throw new Error(`Directory does not exist: ${normalizedPath}`);
  }

  // 4. Ensure it's actually inside a valid Git repository
  const isRepo = await simpleGit(normalizedPath).checkIsRepo();
  if (!isRepo) {
    throw new Error(
      `Directory is not a valid Git repository: ${normalizedPath}`,
    );
  }

  return normalizedPath;
}

// Zod schema helper that resolves and validates git directories
const gitDirectorySchema = z
  .string()
  .min(1, 'Directory path is required')
  .transform(async (val, ctx) => {
    try {
      return await resolveGitDir(val);
    } catch (err) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: err instanceof Error ? err.message : 'Invalid Git directory',
      });
      return z.NEVER;
    }
  });

const gitDirectoryQuerySchema = z.object({
  directory: gitDirectorySchema,
});

const commitBodySchema = z.object({
  directory: gitDirectorySchema,
  message: z.string().min(1, 'Commit message is required'),
  files: z.array(z.string()).optional(), // Optional specific files to stage & commit
});

const checkoutBodySchema = z.object({
  directory: gitDirectorySchema,
  target: z.string().min(1, 'Branch or commit target is required'),
  createBranch: z.boolean().optional(),
});

const git = new Hono()

  // GET /api/git/status?directory=/path/to/repo
  // Returns untracked, modified, staged, additions, deletions
  .get('/', zValidator('query', gitDirectoryQuerySchema), async (c) => {
    const { directory } = c.req.valid('query');
    const gitClient = simpleGit(directory);

    const status = await gitClient.status();

    return c.json({
      currentBranch: status.current,
      tracking: status.tracking,
      isClean: status.isClean(),
      ahead: status.ahead,
      behind: status.behind,
      files: status.files.map((file) => ({
        path: file.path,
        index: file.index,
        workingTree: file.working_dir,
      })),
      staged: status.staged,
      modified: status.modified,
      notAdded: status.not_added,
      deleted: status.deleted,
    });
  })

  // GET /api/git/diff?directory=/path/to/repo&filePath=src/index.ts
  .get(
    '/diff',
    zValidator(
      'query',
      gitDirectoryQuerySchema.extend({ filePath: z.string().optional() }),
    ),
    async (c) => {
      const { directory, filePath } = c.req.valid('query');
      const gitClient = simpleGit(directory);

      // 1. Target HEAD to include BOTH staged and unstaged changes
      const diffOptions = filePath
        ? ['HEAD', '--numstat', '--', filePath]
        : ['HEAD', '--numstat'];

      const patchOptions = filePath ? ['HEAD', '--', filePath] : ['HEAD'];

      // 2. Fetch diff stats against HEAD and fetch status for untracked files
      const [numstatRaw, patch, status] = await Promise.all([
        gitClient.diff(diffOptions),
        gitClient.diff(patchOptions),
        gitClient.status(),
      ]);

      // Parse --numstat output (tracked staged + unstaged)
      const changedFilesMap = new Map<
        string,
        { path: string; additions: number; deletions: number }
      >();

      numstatRaw
        .trim()
        .split('\n')
        .filter(Boolean)
        .forEach((line) => {
          const [additions, deletions, relPath] = line.split('\t');
          if (filePath && relPath !== filePath) return;

          changedFilesMap.set(relPath, {
            path: relPath,
            additions: additions === '-' ? 0 : parseInt(additions, 10),
            deletions: deletions === '-' ? 0 : parseInt(deletions, 10),
          });
        });

      // 3. Account for Untracked / Newly Created Files
      for (const untrackedFile of status.not_added) {
        if (filePath && untrackedFile !== filePath) continue;
        if (!changedFilesMap.has(untrackedFile)) {
          try {
            const fullPath = path.join(directory, untrackedFile);
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lineCount = content.split('\n').length;

            changedFilesMap.set(untrackedFile, {
              path: untrackedFile,
              additions: lineCount,
              deletions: 0,
            });
          } catch {
            // If binary or unreadable file
            changedFilesMap.set(untrackedFile, {
              path: untrackedFile,
              additions: 0,
              deletions: 0,
            });
          }
        }
      }

      return c.json({
        summary: Array.from(changedFilesMap.values()),
        patch,
      });
    },
  )

  // GET /api/git/branches?directory=/path/to/repo
  .get('/branches', zValidator('query', gitDirectoryQuerySchema), async (c) => {
    const { directory } = c.req.valid('query');
    const gitClient = simpleGit(directory);

    const branches = await gitClient.branchLocal();

    return c.json({
      current: branches.current,
      all: branches.all,
      branches: Object.values(branches.branches).map((b) => ({
        name: b.name,
        current: b.current,
        commit: b.commit,
        label: b.label,
      })),
    });
  })

  // POST /api/git/commit
  .post('/commit', zValidator('json', commitBodySchema), async (c) => {
    const { directory, message, files } = c.req.valid('json');
    const gitClient = simpleGit(directory);

    if (files && files.length > 0) {
      await gitClient.add(files);
    } else {
      await gitClient.add('.'); // Stage all changes
    }

    const commitResult = await gitClient.commit(message);

    return c.json({
      success: true,
      branch: commitResult.branch,
      commit: commitResult.commit,
      summary: commitResult.summary,
    });
  })

  // POST /api/git/checkout
  .post('/checkout', zValidator('json', checkoutBodySchema), async (c) => {
    const { directory, target, createBranch } = c.req.valid('json');
    const gitClient = simpleGit(directory);

    if (createBranch) {
      await gitClient.checkoutLocalBranch(target);
    } else {
      await gitClient.checkout(target);
    }

    return c.json({ success: true, activeTarget: target });
  });

export default git;
