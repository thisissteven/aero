import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import simpleGit from 'simple-git';
import { z } from 'zod';

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

export async function resolveGitDir(inputPath: string): Promise<string> {
  // 1. Convert to an absolute path & normalize relative segments
  const absolutePath = path.resolve(inputPath);

  // 2. Normalize Windows path separators
  const normalizedPath = absolutePath.replace(/\\/g, '/').replace(/\/$/, '');

  // 3. Ensure the folder exists on disk
  if (!fs.existsSync(normalizedPath)) {
    throw new DirectoryNotFoundError(normalizedPath);
  }

  // 4. Ensure it's actually inside a valid Git repository
  const isRepo = await simpleGit(normalizedPath).checkIsRepo();

  if (!isRepo) {
    throw new InvalidGitRepositoryError(normalizedPath);
  }

  return normalizedPath;
}

// Zod is only responsible for validating request shape.
// Filesystem / Git validation happens in resolveGitDir().
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

/**
 * Resolve and validate the Git directory from the request.
 */
async function getGitDirectory(inputDirectory: string): Promise<string> {
  return resolveGitDir(inputDirectory);
}

const git = new Hono()

  /**
   * Convert known application errors into a consistent API response.
   */
  .onError((err, c) => {
    if (err instanceof DirectoryNotFoundError) {
      return c.json(
        {
          success: false,
          error: {
            code: err.code,
            message: err.message,
            directory: err.directory,
          },
        },
        404,
      );
    }

    if (err instanceof InvalidGitRepositoryError) {
      return c.json(
        {
          success: false,
          error: {
            code: err.code,
            message: err.message,
            directory: err.directory,
          },
        },
        400,
      );
    }

    // Let Zod validation errors keep their normal behavior.
    if (err instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request',
            issues: err.issues,
          },
        },
        400,
      );
    }

    console.error(err);

    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: err instanceof Error ? err.message : 'Internal server error',
        },
      },
      500,
    );
  })

  // GET /api/git/error-code?directory=/path/to/repo
  // Returns only the Git directory validation error code, if any.
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

    try {
      await resolveGitDir(directory);

      return c.json({
        code: null,
      } as const);
    } catch (err) {
      if (err instanceof DirectoryNotFoundError) {
        return c.json({
          code: 'DIRECTORY_NOT_FOUND',
        } as const);
      }

      if (err instanceof InvalidGitRepositoryError) {
        return c.json({
          code: 'INVALID_GIT_REPOSITORY',
        } as const);
      }

      throw err;
    }
  })

  // GET /api/git/current?directory=/path/to/repo
  // Returns current branch
  .get('/current', zValidator('query', gitDirectoryQuerySchema), async (c) => {
    const { directory: inputDirectory } = c.req.valid('query');
    const directory = await getGitDirectory(inputDirectory);

    const gitClient = simpleGit(directory);
    const status = await gitClient.status();

    return c.json({
      currentBranch: status.current,
    });
  })

  // GET /api/git/status?directory=/path/to/repo
  // Returns untracked, modified, staged, additions, deletions
  .get('/status', zValidator('query', gitDirectoryQuerySchema), async (c) => {
    const { directory: inputDirectory } = c.req.valid('query');
    const directory = await getGitDirectory(inputDirectory);

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
      gitDirectoryQuerySchema.extend({
        filePath: z.string().optional(),
      }),
    ),
    async (c) => {
      const { directory: inputDirectory, filePath } = c.req.valid('query');

      const directory = await getGitDirectory(inputDirectory);
      const gitClient = simpleGit(directory);

      // Target HEAD to include BOTH staged and unstaged changes
      const diffOptions = filePath
        ? ['HEAD', '--numstat', '--', filePath]
        : ['HEAD', '--numstat'];

      const patchOptions = filePath ? ['HEAD', '--', filePath] : ['HEAD'];

      // Fetch diff stats against HEAD and fetch status for untracked files
      const [numstatRaw, patch, status] = await Promise.all([
        gitClient.diff(diffOptions),
        gitClient.diff(patchOptions),
        gitClient.status(),
      ]);

      // Parse --numstat output (tracked staged + unstaged)
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
            additions: additions === '-' ? 0 : parseInt(additions, 10),
            deletions: deletions === '-' ? 0 : parseInt(deletions, 10),
          });
        });

      // Account for untracked / newly created files
      for (const untrackedFile of status.not_added) {
        if (filePath && untrackedFile !== filePath) {
          continue;
        }

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
            // Binary or unreadable file
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
    const { directory: inputDirectory } = c.req.valid('query');
    const directory = await getGitDirectory(inputDirectory);

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
    const { directory: inputDirectory, message, files } = c.req.valid('json');

    const directory = await getGitDirectory(inputDirectory);
    const gitClient = simpleGit(directory);

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
    const gitClient = simpleGit(directory);

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
