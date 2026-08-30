import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import simpleGit, { type SimpleGit, type SimpleGitOptions } from 'simple-git';
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

/**
 * Global Git concurrency limiter.
 *
 * IMPORTANT:
 * simple-git's maxConcurrentProcesses is per simpleGit instance.
 * We also need a global limit because this app creates Git instances
 * for different HTTP requests.
 */
class Semaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      await new Promise<void>((resolve) => {
        this.queue.push(resolve);
      });
    }

    this.active++;

    try {
      return await fn();
    } finally {
      this.active--;

      const next = this.queue.shift();
      next?.();
    }
  }
}

/**
 * Keep the number of simultaneously running Git processes very small.
 *
 * Git itself can be quite memory hungry on large repositories, and spawning
 * many git.exe processes concurrently on Windows can make this especially
 * noticeable.
 */
const gitSemaphore = new Semaphore(2);

/**
 * simple-git options.
 *
 * maxConcurrentProcesses is deliberately 1 because the global semaphore
 * already controls application-wide concurrency.
 */
const GIT_OPTIONS: Partial<SimpleGitOptions> = {
  binary: 'git',
  maxConcurrentProcesses: 1,
  trimmed: true,
};

/**
 * Normalize a filesystem path once.
 */
function normalizeGitPath(inputPath: string): string {
  return path.resolve(inputPath).replace(/\\/g, '/').replace(/\/$/, '');
}

/**
 * Create a simple-git instance.
 *
 * Each instance only gets ONE active Git child process.
 */
function createGit(directory: string): SimpleGit {
  return simpleGit(directory, GIT_OPTIONS);
}

/**
 * Run exactly one Git operation through the global semaphore.
 *
 * This is the important part for preventing Git process explosions.
 */
async function withGit<T>(
  directory: string,
  operation: (git: SimpleGit) => Promise<T>,
): Promise<T> {
  return gitSemaphore.run(async () => {
    const git = createGit(directory);

    return operation(git);
  });
}

/**
 * Resolve and validate the filesystem directory.
 *
 * Normal Git endpoints do NOT call checkIsRepo() here.
 * The actual Git operation is allowed to report repository errors.
 *
 * This avoids spawning an extra Git process on every request.
 */
export async function resolveGitDir(inputPath: string): Promise<string> {
  const directory = normalizeGitPath(inputPath);

  let stat: fs.Stats;

  try {
    stat = await fs.promises.stat(directory);
  } catch {
    throw new DirectoryNotFoundError(directory);
  }

  if (!stat.isDirectory()) {
    throw new DirectoryNotFoundError(directory);
  }

  return directory;
}

/**
 * Check whether a directory is actually a Git repository.
 *
 * This is only used by /error-code because that endpoint explicitly needs
 * repository validation without performing another Git operation.
 */
async function checkGitRepository(directory: string): Promise<boolean> {
  return withGit(directory, async (git) => {
    return git.checkIsRepo();
  });
}

/**
 * Translate Git's "not a repository" failures into our application error.
 */
function isNotGitRepositoryError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes('not a git repository') ||
    message.includes('not a repository') ||
    message.includes('git repository')
  );
}

/**
 * Zod is only responsible for validating request shape.
 * Filesystem / Git validation happens in the functions above.
 */
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

async function getGitDirectory(inputDirectory: string): Promise<string> {
  return resolveGitDir(inputDirectory);
}

const git = new Hono()
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

  /**
   * GET /api/git/error-code?directory=/path/to/repo
   *
   * This endpoint explicitly validates both filesystem and Git repository state.
   */
  .get('/error-code', async (c) => {
    const inputDirectory = c.req.query('directory');

    if (!inputDirectory) {
      return c.json(
        {
          code: 'VALIDATION_ERROR',
        } as const,
        400,
      );
    }

    try {
      const directory = await resolveGitDir(inputDirectory);
      const isRepo = await checkGitRepository(directory);

      if (!isRepo) {
        return c.json({
          code: 'INVALID_GIT_REPOSITORY',
        } as const);
      }

      return c.json({
        code: null,
      } as const);
    } catch (err) {
      if (err instanceof DirectoryNotFoundError) {
        return c.json({
          code: 'DIRECTORY_NOT_FOUND',
        } as const);
      }

      if (isNotGitRepositoryError(err)) {
        return c.json({
          code: 'INVALID_GIT_REPOSITORY',
        } as const);
      }

      throw err;
    }
  })

  /**
   * GET /api/git/current?directory=/path/to/repo
   */
  .get('/current', zValidator('query', gitDirectoryQuerySchema), async (c) => {
    const { directory: inputDirectory } = c.req.valid('query');

    const directory = await getGitDirectory(inputDirectory);

    try {
      const status = await withGit(directory, (git) => git.status());

      return c.json({
        currentBranch: status.current,
      });
    } catch (err) {
      if (isNotGitRepositoryError(err)) {
        throw new InvalidGitRepositoryError(directory);
      }

      throw err;
    }
  })

  /**
   * GET /api/git/status?directory=/path/to/repo
   */
  .get('/status', zValidator('query', gitDirectoryQuerySchema), async (c) => {
    const { directory: inputDirectory } = c.req.valid('query');

    const directory = await getGitDirectory(inputDirectory);

    try {
      const status = await withGit(directory, (git) => git.status());

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
    } catch (err) {
      if (isNotGitRepositoryError(err)) {
        throw new InvalidGitRepositoryError(directory);
      }

      throw err;
    }
  })

  /**
   * GET /api/git/diff?directory=/path/to/repo&filePath=src/index.ts
   */
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

      try {
        /**
         * Everything inside this callback is globally limited to one active
         * Git process for this operation.
         *
         * Because maxConcurrentProcesses === 1, the Promise.all below will
         * queue the three commands instead of spawning three Git processes.
         */
        const result = await withGit(directory, async (git) => {
          const diffOptions = filePath
            ? [
                '--no-ext-diff',
                '--no-textconv',
                'HEAD',
                '--numstat',
                '--',
                filePath,
              ]
            : ['--no-ext-diff', '--no-textconv', 'HEAD', '--numstat'];

          const patchOptions = filePath
            ? ['--no-ext-diff', '--no-textconv', 'HEAD', '--', filePath]
            : ['--no-ext-diff', '--no-textconv', 'HEAD'];

          /**
           * These are queued by simple-git because the instance has
           * maxConcurrentProcesses: 1.
           */
          const [numstatRaw, patch, status] = await Promise.all([
            git.diff(diffOptions),
            git.diff(patchOptions),
            git.status(),
          ]);

          return {
            numstatRaw,
            patch,
            status,
          };
        });

        const { numstatRaw, patch, status } = result;

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

            if (!relPath) {
              return;
            }

            if (filePath && relPath !== filePath) {
              return;
            }

            changedFilesMap.set(relPath, {
              path: relPath,
              additions: additions === '-' ? 0 : parseInt(additions, 10),
              deletions: deletions === '-' ? 0 : parseInt(deletions, 10),
            });
          });

        /**
         * Account for untracked files.
         *
         * Avoid loading arbitrarily huge files completely into memory.
         */
        const MAX_UNTRACKED_FILE_SIZE = 5 * 1024 * 1024;

        for (const untrackedFile of status.not_added) {
          if (filePath && untrackedFile !== filePath) {
            continue;
          }

          if (changedFilesMap.has(untrackedFile)) {
            continue;
          }

          const fullPath = path.resolve(directory, untrackedFile);

          try {
            const stat = await fs.promises.stat(fullPath);

            /**
             * Don't read giant untracked files into Node memory.
             */
            if (!stat.isFile() || stat.size > MAX_UNTRACKED_FILE_SIZE) {
              changedFilesMap.set(untrackedFile, {
                path: untrackedFile,
                additions: 0,
                deletions: 0,
              });

              continue;
            }

            const content = await fs.promises.readFile(fullPath, 'utf8');

            const lineCount =
              content.length === 0 ? 0 : content.split('\n').length;

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
      } catch (err) {
        if (isNotGitRepositoryError(err)) {
          throw new InvalidGitRepositoryError(directory);
        }

        throw err;
      }
    },
  )

  /**
   * GET /api/git/branches?directory=/path/to/repo
   */
  .get('/branches', zValidator('query', gitDirectoryQuerySchema), async (c) => {
    const { directory: inputDirectory } = c.req.valid('query');

    const directory = await getGitDirectory(inputDirectory);

    try {
      const branches = await withGit(directory, (git) => git.branchLocal());

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
    } catch (err) {
      if (isNotGitRepositoryError(err)) {
        throw new InvalidGitRepositoryError(directory);
      }

      throw err;
    }
  })

  /**
   * POST /api/git/commit
   */
  .post('/commit', zValidator('json', commitBodySchema), async (c) => {
    const { directory: inputDirectory, message, files } = c.req.valid('json');

    const directory = await getGitDirectory(inputDirectory);

    try {
      const result = await withGit(directory, async (git) => {
        if (files && files.length > 0) {
          await git.add(files);
        } else {
          await git.add('.');
        }

        return git.commit(message);
      });

      return c.json({
        success: true,
        branch: result.branch,
        commit: result.commit,
        summary: result.summary,
      });
    } catch (err) {
      if (isNotGitRepositoryError(err)) {
        throw new InvalidGitRepositoryError(directory);
      }

      throw err;
    }
  })

  /**
   * POST /api/git/checkout
   */
  .post('/checkout', zValidator('json', checkoutBodySchema), async (c) => {
    const {
      directory: inputDirectory,
      target,
      createBranch,
    } = c.req.valid('json');

    const directory = await getGitDirectory(inputDirectory);

    try {
      await withGit(directory, async (git) => {
        if (createBranch) {
          await git.checkoutLocalBranch(target);
        } else {
          await git.checkout(target);
        }
      });

      return c.json({
        success: true,
        activeTarget: target,
      });
    } catch (err) {
      if (isNotGitRepositoryError(err)) {
        throw new InvalidGitRepositoryError(directory);
      }

      throw err;
    }
  });

export default git;
