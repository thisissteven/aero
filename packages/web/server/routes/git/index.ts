// git.routes.ts
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { parseWorktreePorcelainBrief } from '@/server/helper';
import {
  DirectoryNotFoundError,
  InvalidGitRepositoryError,
  NestedRepositoryError,
  PathNotFoundError,
  UntrackedDirectoryError,
} from './errors';
import {
  abortMerge,
  abortRebase,
  checkoutBodySchema,
  commit,
  commitBodySchema,
  continueMerge,
  continueRebase,
  deleteBranch,
  deleteBranchBodySchema,
  diffQuerySchema,
  fetch,
  fetchBodySchema,
  fileDiffQuerySchema,
  getBranches,
  getDiffSummary,
  getFileDiff,
  getGitClient,
  getGitDirectory,
  getPathDiff,
  getRangeDiff,
  getRemotes,
  getStatus,
  gitDirectoryQuerySchema,
  isGitRepository,
  listStashes,
  merge,
  mergeBodySchema,
  pull,
  pullBodySchema,
  push,
  pushBodySchema,
  rangeDiffQuerySchema,
  rebase,
  rebaseBodySchema,
  removeRemote,
  removeRemoteBodySchema,
  stashPushBodySchema,
  stashRefBodySchema,
} from './service';

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const git = new Hono()
  .onError((err, c) => {
    if (err instanceof DirectoryNotFoundError) {
      return c.json({ code: err.code, message: err.message }, 404);
    }
    if (err instanceof InvalidGitRepositoryError) {
      return c.json({ code: err.code, message: err.message }, 400);
    }
    if (err instanceof PathNotFoundError) {
      return c.json({ code: err.code, message: err.message }, 404);
    }
    if (err instanceof NestedRepositoryError) {
      return c.json({ code: err.code, message: err.message }, 422);
    }
    if (err instanceof UntrackedDirectoryError) {
      return c.json({ code: err.code, message: err.message }, 422);
    }
    console.error('[git]', err);
    return c.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Git operation failed' },
      500,
    );
  })

  // ----- Repository Validation -----
  .get('/error-code', async (c) => {
    const directory = c.req.query('directory');
    if (!directory) {
      return c.json({ code: 'VALIDATION_ERROR' } as const, 400);
    }
    const resolved = directory.replace(/\\/g, '/').replace(/\/$/, '');
    const fs = await import('node:fs');
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      return c.json({ code: 'DIRECTORY_NOT_FOUND' } as const, 404);
    }
    const isRepo = await isGitRepository(resolved);
    return c.json({ code: isRepo ? null : 'INVALID_GIT_REPOSITORY' } as const);
  })

  // ----- Status & Current -----
  .get('/current', zValidator('query', gitDirectoryQuerySchema), async (c) => {
    const { directory: inputDirectory } = c.req.valid('query');
    const directory = await getGitDirectory(inputDirectory);
    const status = await getGitClient(directory).status();
    return c.json({ currentBranch: status.current });
  })
  .get('/status', zValidator('query', gitDirectoryQuerySchema), async (c) => {
    const { directory: inputDirectory } = c.req.valid('query');
    const directory = await getGitDirectory(inputDirectory);
    const status = await getStatus(directory);
    return c.json(status);
  })

  // ----- Worktrees -----
  .get(
    '/worktrees',
    zValidator('query', gitDirectoryQuerySchema),
    async (c) => {
      const { directory: inputDirectory } = c.req.valid('query');
      const directory = await getGitDirectory(inputDirectory);
      const raw = await getGitClient(directory).raw([
        'worktree',
        'list',
        '--porcelain',
      ]);
      const worktrees = parseWorktreePorcelainBrief(raw);
      return c.json(worktrees);
    },
  )

  // ----- Diff Operations -----
  .get('/diff', zValidator('query', diffQuerySchema), async (c) => {
    const {
      directory: inputDirectory,
      path,
      staged,
      context,
    } = c.req.valid('query');
    const directory = await getGitDirectory(inputDirectory);
    const result = await getPathDiff(directory, {
      path,
      staged,
      contextLines: context,
    });
    return c.json(result);
  })
  .get('/file-diff', zValidator('query', fileDiffQuerySchema), async (c) => {
    const { directory: inputDirectory, path, staged } = c.req.valid('query');
    const directory = await getGitDirectory(inputDirectory);
    const result = await getFileDiff(directory, { path, staged });
    return c.json(result);
  })
  .get('/range-diff', zValidator('query', rangeDiffQuerySchema), async (c) => {
    const {
      directory: inputDirectory,
      base,
      head,
      path,
      context,
      includeWorkingTree,
    } = c.req.valid('query');
    const directory = await getGitDirectory(inputDirectory);
    const result = await getRangeDiff(directory, {
      base,
      head,
      path,
      contextLines: context,
      includeWorkingTree,
    });
    return c.json(result);
  })

  // ----- Branches -----
  .get('/branches', zValidator('query', gitDirectoryQuerySchema), async (c) => {
    const { directory: inputDirectory } = c.req.valid('query');
    const directory = await getGitDirectory(inputDirectory);
    const branches = await getBranches(directory);
    return c.json(branches);
  })
  .post('/checkout', zValidator('json', checkoutBodySchema), async (c) => {
    const {
      directory: inputDirectory,
      target,
      createBranch,
    } = c.req.valid('json');
    const directory = await getGitDirectory(inputDirectory);
    const client = getGitClient(directory);
    if (createBranch) {
      await client.checkoutLocalBranch(target);
    } else {
      await client.checkout(target);
    }
    return c.json({ success: true, activeTarget: target });
  })
  .delete(
    '/branches',
    zValidator('query', gitDirectoryQuerySchema),
    zValidator('json', deleteBranchBodySchema),
    async (c) => {
      const { directory: inputDirectory } = c.req.valid('query');
      const options = c.req.valid('json');
      const directory = await getGitDirectory(inputDirectory);
      const result = await deleteBranch(directory, options);
      return c.json(result);
    },
  )

  // ----- Commit -----
  .post('/commit', zValidator('json', commitBodySchema), async (c) => {
    const {
      directory: inputDirectory,
      message,
      files,
      addAll,
      stageFiles,
    } = c.req.valid('json');
    const directory = await getGitDirectory(inputDirectory);
    const result = await commit(directory, message, {
      addAll,
      files,
      stageFiles,
    });
    return c.json(result);
  })

  // ----- Pull / Push / Fetch -----
  .post(
    '/pull',
    zValidator('query', gitDirectoryQuerySchema),
    zValidator('json', pullBodySchema),
    async (c) => {
      const { directory: inputDirectory } = c.req.valid('query');
      const directory = await getGitDirectory(inputDirectory);
      const result = await pull(directory, c.req.valid('json'));
      return c.json(result);
    },
  )
  .post(
    '/push',
    zValidator('query', gitDirectoryQuerySchema),
    zValidator('json', pushBodySchema),
    async (c) => {
      const { directory: inputDirectory } = c.req.valid('query');
      const directory = await getGitDirectory(inputDirectory);
      const result = await push(directory, c.req.valid('json'));
      return c.json(result);
    },
  )
  .post(
    '/fetch',
    zValidator('query', gitDirectoryQuerySchema),
    zValidator('json', fetchBodySchema),
    async (c) => {
      const { directory: inputDirectory } = c.req.valid('query');
      const directory = await getGitDirectory(inputDirectory);
      const result = await fetch(directory, c.req.valid('json'));
      return c.json(result);
    },
  )

  // ----- Stashes -----
  .get('/stashes', zValidator('query', gitDirectoryQuerySchema), async (c) => {
    const { directory: inputDirectory } = c.req.valid('query');
    const directory = await getGitDirectory(inputDirectory);
    const stashes = await listStashes(directory);
    return c.json({ stashes });
  })
  .post(
    '/stash',
    zValidator('query', gitDirectoryQuerySchema),
    zValidator('json', stashPushBodySchema),
    async (c) => {
      const { directory: inputDirectory } = c.req.valid('query');
      const directory = await getGitDirectory(inputDirectory);
      const { message } = c.req.valid('json');
      const client = getGitClient(directory);
      const result = await client.stash([
        'push',
        '--include-untracked',
        message ?? '',
      ]);
      return c.json({ success: true, result });
    },
  )
  .post(
    '/stash/apply',
    zValidator('query', gitDirectoryQuerySchema),
    zValidator('json', stashRefBodySchema),
    async (c) => {
      const { directory: inputDirectory } = c.req.valid('query');
      const directory = await getGitDirectory(inputDirectory);
      const { ref } = c.req.valid('json');
      const client = getGitClient(directory);
      await client.stash(['apply', ref ?? 'stash@{0}']);
      return c.json({ success: true });
    },
  )
  .post(
    '/stash/pop',
    zValidator('query', gitDirectoryQuerySchema),
    zValidator('json', stashRefBodySchema),
    async (c) => {
      const { directory: inputDirectory } = c.req.valid('query');
      const directory = await getGitDirectory(inputDirectory);
      const { ref } = c.req.valid('json');
      const client = getGitClient(directory);
      await client.stash(['pop', ref ?? 'stash@{0}']);
      return c.json({ success: true });
    },
  )
  .post(
    '/stash/drop',
    zValidator('query', gitDirectoryQuerySchema),
    zValidator('json', stashRefBodySchema),
    async (c) => {
      const { directory: inputDirectory } = c.req.valid('query');
      const directory = await getGitDirectory(inputDirectory);
      const { ref } = c.req.valid('json');
      const client = getGitClient(directory);
      await client.stash(['drop', ref ?? 'stash@{0}']);
      return c.json({ success: true });
    },
  )

  // ----- Remotes -----
  .get('/remotes', zValidator('query', gitDirectoryQuerySchema), async (c) => {
    const { directory: inputDirectory } = c.req.valid('query');
    const directory = await getGitDirectory(inputDirectory);
    const remotes = await getRemotes(directory);
    return c.json(remotes);
  })
  .delete(
    '/remotes',
    zValidator('query', gitDirectoryQuerySchema),
    zValidator('json', removeRemoteBodySchema),
    async (c) => {
      const { directory: inputDirectory } = c.req.valid('query');
      const directory = await getGitDirectory(inputDirectory);
      const { remote } = c.req.valid('json');
      const result = await removeRemote(directory, { remote });
      return c.json(result);
    },
  )

  // ----- Rebase -----
  .post(
    '/rebase',
    zValidator('query', gitDirectoryQuerySchema),
    zValidator('json', rebaseBodySchema),
    async (c) => {
      const { directory: inputDirectory } = c.req.valid('query');
      const directory = await getGitDirectory(inputDirectory);
      const result = await rebase(directory, c.req.valid('json'));
      return c.json(result);
    },
  )
  .post(
    '/rebase/abort',
    zValidator('query', gitDirectoryQuerySchema),
    async (c) => {
      const { directory: inputDirectory } = c.req.valid('query');
      const directory = await getGitDirectory(inputDirectory);
      const result = await abortRebase(directory);
      return c.json(result);
    },
  )
  .post(
    '/rebase/continue',
    zValidator('query', gitDirectoryQuerySchema),
    async (c) => {
      const { directory: inputDirectory } = c.req.valid('query');
      const directory = await getGitDirectory(inputDirectory);
      const result = await continueRebase(directory);
      return c.json(result);
    },
  )

  // ----- Merge -----
  .post(
    '/merge',
    zValidator('query', gitDirectoryQuerySchema),
    zValidator('json', mergeBodySchema),
    async (c) => {
      const { directory: inputDirectory } = c.req.valid('query');
      const directory = await getGitDirectory(inputDirectory);
      const result = await merge(directory, c.req.valid('json'));
      return c.json(result);
    },
  )
  .post(
    '/merge/abort',
    zValidator('query', gitDirectoryQuerySchema),
    async (c) => {
      const { directory: inputDirectory } = c.req.valid('query');
      const directory = await getGitDirectory(inputDirectory);
      const result = await abortMerge(directory);
      return c.json(result);
    },
  )
  .post(
    '/merge/continue',
    zValidator('query', gitDirectoryQuerySchema),
    async (c) => {
      const { directory: inputDirectory } = c.req.valid('query');
      const directory = await getGitDirectory(inputDirectory);
      const result = await continueMerge(directory);
      return c.json(result);
    },
  )
  .get('/summary', zValidator('query', gitDirectoryQuerySchema), async (c) => {
    const { directory: inputDirectory } = c.req.valid('query');
    const directory = await getGitDirectory(inputDirectory);
    const summary = await getDiffSummary(directory);
    return c.json({ summary });
  });

export default git;
