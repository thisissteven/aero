import fs from 'node:fs';
import path from 'node:path';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import simpleGit, { type SimpleGit } from 'simple-git';

import { z } from 'zod';

import { parseWorktreePorcelainBrief } from '@/server/helper';

export const gitErrorCodeSchema = z.enum([
  'DIRECTORY_NOT_FOUND',
  'INVALID_GIT_REPOSITORY',
  'VALIDATION_ERROR',
  'INTERNAL_SERVER_ERROR',
]);

export type GitErrorCode = z.infer<typeof gitErrorCodeSchema>;

export class DirectoryNotFoundError extends Error {
  readonly code = 'DIRECTORY_NOT_FOUND' as const;

  constructor(public readonly directory: string) {
    super(`Directory does not exist: ${directory}`);
    this.name = 'DirectoryNotFoundError';
  }
}

export class InvalidGitRepositoryError extends Error {
  readonly code = 'INVALID_GIT_REPOSITORY' as const;

  constructor(public readonly directory: string) {
    super(`Directory is not a valid Git repository: ${directory}`);
    this.name = 'InvalidGitRepositoryError';
  }
}

const gitOptions = {
  maxConcurrentProcesses: 1,
};

const gitClients = new Map<string, SimpleGit>();

const repositoryValidationCache = new Map<
  string,
  {
    isRepo: boolean;
    expiresAt: number;
  }
>();

const REPOSITORY_VALIDATION_TTL = 5_000;

function normalizePath(inputPath: string): string {
  return path.resolve(inputPath).replace(/\\/g, '/').replace(/\/$/, '');
}

function getGitClient(directory: string): SimpleGit {
  const existing = gitClients.get(directory);

  if (existing) {
    return existing;
  }

  const client = simpleGit(directory, gitOptions);

  gitClients.set(directory, client);

  return client;
}

export async function resolveGitDir(inputPath: string): Promise<string> {
  const directory = normalizePath(inputPath);

  if (!fs.existsSync(directory)) {
    throw new DirectoryNotFoundError(directory);
  }

  const stat = fs.statSync(directory);

  if (!stat.isDirectory()) {
    throw new DirectoryNotFoundError(directory);
  }

  return directory;
}

async function isGitRepository(directory: string): Promise<boolean> {
  const now = Date.now();
  const cached = repositoryValidationCache.get(directory);

  if (cached && cached.expiresAt > now) {
    return cached.isRepo;
  }

  const isRepo = await getGitClient(directory).checkIsRepo();

  repositoryValidationCache.set(directory, {
    isRepo,
    expiresAt: now + REPOSITORY_VALIDATION_TTL,
  });

  return isRepo;
}

async function getGitDirectory(inputDirectory: string): Promise<string> {
  const directory = await resolveGitDir(inputDirectory);
  if (!(await isGitRepository(directory))) {
    throw new InvalidGitRepositoryError(directory);
  }
  return directory;
}

const gitDirectorySchema = z.string().min(1, 'Directory path is required');

const gitDirectoryQuerySchema = z.object({
  directory: gitDirectorySchema,
});

const commitBodySchema = z.object({
  directory: gitDirectorySchema,
  message: z.string().min(1, 'Commit message is required'),
  files: z.array(z.string()).optional(),
});

const checkoutBodySchema = z.object({
  directory: gitDirectorySchema,
  target: z.string().min(1, 'Branch or commit target is required'),
  createBranch: z.boolean().optional(),
});

const git = new Hono()
  .onError((err, c) => {
    if (err instanceof DirectoryNotFoundError) {
      return c.json({ code: err.code, message: err.message }, 404);
    }
    if (err instanceof InvalidGitRepositoryError) {
      return c.json({ code: err.code, message: err.message }, 400);
    }
    console.error('[git]', err);
    return c.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Git operation failed' },
      500,
    );
  })

  // GET /api/git/error-code?directory=/path/to/repo
  //
  // This is the only endpoint that explicitly performs repository validation.
  .get('/error-code', async (c) => {
    const directory = c.req.query('directory');

    if (!directory) {
      return c.json(
        {
          code: 'VALIDATION_ERROR',
        } as const,
        400,
      );
    }

    // Resolve without throwing so the RPC client sees the shape
    const resolved = path
      .resolve(directory)
      .replace(/\\/g, '/')
      .replace(/\/$/, '');

    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      return c.json(
        {
          code: 'DIRECTORY_NOT_FOUND',
        } as const,
        404,
      );
    }

    const isRepo = await isGitRepository(resolved);

    return c.json({
      code: isRepo ? null : 'INVALID_GIT_REPOSITORY',
    } as const);
  })

  // GET /api/git/current?directory=/path/to/repo
  .get('/current', zValidator('query', gitDirectoryQuerySchema), async (c) => {
    const { directory: inputDirectory } = c.req.valid('query');
    const directory = await getGitDirectory(inputDirectory);

    const status = await getGitClient(directory).status();

    return c.json({
      currentBranch: status.current,
    });
  })

  // GET /api/git/status?directory=/path/to/repo
  .get('/status', zValidator('query', gitDirectoryQuerySchema), async (c) => {
    const { directory: inputDirectory } = c.req.valid('query');
    const directory = await getGitDirectory(inputDirectory);

    const status = await getGitClient(directory).status();

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

  // GET /api/git/worktrees?directory=/path/to/repo
  .get(
    '/worktrees',
    zValidator('query', gitDirectoryQuerySchema),
    async (c) => {
      const { directory: inputDirectory } = c.req.valid('query');
      const directory = await getGitDirectory(inputDirectory);

      const rawWorktrees = await getGitClient(directory).raw([
        'worktree',
        'list',
        '--porcelain',
      ]);

      const worktrees = parseWorktreePorcelainBrief(rawWorktrees);

      return c.json(worktrees);
    },
  )

  // GET /api/git/diff?directory=/path/to/repo&filePath=src/index.ts
  .get(
    '/diff',
    zValidator(
      'query',
      gitDirectoryQuerySchema.extend({
        filePath: z.string().optional(),
      }),
    ),
    async (c) => {
      const { directory: inputDirectory, filePath } = c.req.valid('query');
      const directory = await getGitDirectory(inputDirectory);
      const gitClient = getGitClient(directory);

      const diffOptions = filePath
        ? ['HEAD', '--numstat', '--', filePath]
        : ['HEAD', '--numstat'];

      const patchOptions = filePath ? ['HEAD', '--', filePath] : ['HEAD'];

      /*
       * Deliberately run these sequentially.
       *
       * Since the client is shared per repository and configured with
       * maxConcurrentProcesses: 1, this keeps all Git operations for the
       * same repository serialized across concurrent HTTP requests too.
       */
      const numstatRaw = await gitClient.diff(diffOptions);
      const patch = await gitClient.diff(patchOptions);
      const status = await gitClient.status();

      const changedFilesMap = new Map<
        string,
        {
          path: string;
          additions: number;
          deletions: number;
        }
      >();

      numstatRaw
        .trim()
        .split('\n')
        .filter(Boolean)
        .forEach((line) => {
          const [additions, deletions, relPath] = line.split('\t');

          if (filePath && relPath !== filePath) {
            return;
          }

          changedFilesMap.set(relPath, {
            path: relPath,
            additions: additions === '-' ? 0 : Number.parseInt(additions, 10),
            deletions: deletions === '-' ? 0 : Number.parseInt(deletions, 10),
          });
        });

      for (const untrackedFile of status.not_added) {
        if (filePath && untrackedFile !== filePath) {
          continue;
        }

        if (changedFilesMap.has(untrackedFile)) {
          continue;
        }

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
          changedFilesMap.set(untrackedFile, {
            path: untrackedFile,
            additions: 0,
            deletions: 0,
          });
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
    const { directory: inputDirectory } = c.req.valid('query');
    const directory = await getGitDirectory(inputDirectory);

    const branches = await getGitClient(directory).branchLocal();

    return c.json({
      current: branches.current,
      all: branches.all,
      branches: Object.values(branches.branches).map((branch) => ({
        name: branch.name,
        current: branch.current,
        commit: branch.commit,
        label: branch.label,
      })),
    });
  })

  // POST /api/git/commit
  .post('/commit', zValidator('json', commitBodySchema), async (c) => {
    const { directory: inputDirectory, message, files } = c.req.valid('json');

    const directory = await getGitDirectory(inputDirectory);
    const gitClient = getGitClient(directory);

    if (files && files.length > 0) {
      await gitClient.add(files);
    } else {
      await gitClient.add('.');
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
    const {
      directory: inputDirectory,
      target,
      createBranch,
    } = c.req.valid('json');

    const directory = await getGitDirectory(inputDirectory);
    const gitClient = getGitClient(directory);

    if (createBranch) {
      await gitClient.checkoutLocalBranch(target);
    } else {
      await gitClient.checkout(target);
    }

    return c.json({
      success: true,
      activeTarget: target,
    });
  });

export default git;
