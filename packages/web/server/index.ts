// server/index.ts

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { opencodePool } from '@/server/adapters/opencode/pool';
import { initProxyConfig } from '@/server/proxy-loader';

import capabilityRoutes from './routes/capabilities';
import configRoutes from './routes/config';
import discoveryRoutes from './routes/discovery';
import folderPickerRoutes from './routes/folder-picker';
import gitRoutes from './routes/git';
import poolRoutes from './routes/pool';
import previewRoutes from './routes/preview';
import providerRoutes from './routes/providers';
import sessionRoutes from './routes/sessions';
import systemRoutes from './routes/system';
import terminalRoutes from './routes/terminal';
import workspaceRoutes from './routes/workspaces';
import worktreeRoutes from './routes/worktrees';

initProxyConfig();

const app = new Hono()
  .basePath('/api')
  .route('/sessions', sessionRoutes)
  .route('/workspaces', workspaceRoutes)
  .route('/pool', poolRoutes)
  .route('/terminal', terminalRoutes)
  .route('/preview', previewRoutes)
  .route('/system', systemRoutes)
  .route('/git', gitRoutes)
  .route('/capabilities', capabilityRoutes)
  .route('/providers', providerRoutes)
  .route('/worktrees', worktreeRoutes)
  .route('/config', configRoutes)
  .route('/folder-picker', folderPickerRoutes)
  .route('/discovery', discoveryRoutes);

// Ensure the pool is initialized before any incoming API request proceeds
let poolInitPromise: Promise<void> | null = null;

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
