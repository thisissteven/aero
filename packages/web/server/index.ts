// server/index.ts

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { opencodePool } from '@/server/adapters/opencode/pool';
import { initProxyConfig } from '@/server/proxy-loader';
import { automationsRuntime } from '@/server/services/automations/runtime';
import { sessionGoalRuntime } from '@/server/services/goal/runtime';

import activityRoutes from './routes/activity';
import agentToolRoutes from './routes/agent-tool';
import automationRoutes from './routes/automations';
import browserControlRoutes from './routes/browser-control';
import capabilityRoutes from './routes/capabilities';
import configRoutes from './routes/config';
import discoveryRoutes from './routes/discovery';
import folderPickerRoutes from './routes/folder-picker';
import fsRawRoutes from './routes/fs-raw';
import gitRoutes from './routes/git/index';
import githubRoutes from './routes/github/index';
import goalRoutes from './routes/goals';
import mcpRoutes from './routes/mcp';
import poolRoutes from './routes/pool';
import previewRoutes from './routes/preview';
import projectContextRoutes from './routes/project-context';
import providerRoutes from './routes/providers';
import sessionRoutes from './routes/sessions';
import snippetRoutes from './routes/snippets';
import systemRoutes from './routes/system';
import terminalRoutes from './routes/terminal';
import workspaceRoutes from './routes/workspaces';
import worktreeRoutes from './routes/worktrees';

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

initProxyConfig();

const app = new Hono()
  .basePath('/api')
  .route('/activity', activityRoutes)
  .route('/aero/agent-tool', agentToolRoutes)
  .route('/automations', automationRoutes)
  .route('/browser-control', browserControlRoutes)
  .route('/sessions', sessionRoutes)
  .route('/workspaces', workspaceRoutes)
  .route('/pool', poolRoutes)
  .route('/terminal', terminalRoutes)
  .route('/preview', previewRoutes)
  .route('/system', systemRoutes)
  .route('/git', gitRoutes)
  .route('/github', githubRoutes)
  .route('/goals', goalRoutes)
  .route('/capabilities', capabilityRoutes)
  .route('/mcp', mcpRoutes)
  .route('/providers', providerRoutes)
  .route('/worktrees', worktreeRoutes)
  .route('/config', configRoutes)
  .route('/folder-picker', folderPickerRoutes)
  .route('/discovery', discoveryRoutes)
  .route('/fs', fsRawRoutes)
  .route('/snippets', snippetRoutes)
  .route('/project-context', projectContextRoutes);

// Ensure the pool is initialized before any incoming API request proceeds
let poolInitPromise: Promise<void> | null = null;

// Start the session-goal control loop once the OpenCode pool is up. This lives
// here (not only in start.ts) so it also runs under the Vite dev server, which
// imports this module directly. `start()` is idempotent.
let goalRuntimeStarted = false;
let automationsRuntimeStarted = false;

app.use('*', async (c, next) => {
  if (!poolInitPromise) {
    poolInitPromise = opencodePool.init();
  }

  try {
    await poolInitPromise;
  } catch (err) {
    poolInitPromise = null; // Reset on error so subsequent requests can retry
    return c.json(
      { success: false, message: 'OpenCode pool unavailable' },
      503,
    );
  }

  if (!goalRuntimeStarted) {
    goalRuntimeStarted = true;
    void sessionGoalRuntime.start();
  }

  // Same reasoning for the automations scheduler: dev imports this module
  // directly, so start it here too (idempotent with start.ts).
  if (!automationsRuntimeStarted) {
    automationsRuntimeStarted = true;
    void automationsRuntime.start();
  }

  await next();
});

app.onError((err, c) => {
  console.error(`[Error] ${c.req.method} ${c.req.url}:`, err);

  // Handle Hono's built-in HTTP Exceptions
  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        message: err.message,
      },
      err.status,
    );
  }

  // Handle standard thrown Errors or unexpected crashes
  return c.json(
    {
      success: false,
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
    500,
  );
});

export default app;
export const server = {
  fetch: app.fetch,
};

export type AppType = typeof app;
