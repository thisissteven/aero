// server/index.ts

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { initProxyConfig } from './proxy-loader';
import agentRoutes from './routes/agents';
import configRoutes from './routes/config';
import folderPickerRoutes from './routes/folder-picker';
import gitRoutes from './routes/git';
import poolRoutes from './routes/pool';
import previewRoutes from './routes/preview';
import providerRoutes from './routes/providers';
import sessionRoutes from './routes/sessions';
import systemRoutes from './routes/system';
import terminalRoutes from './routes/terminal';
import workspaceRoutes from './routes/workspaces';
import worktreeRoutes from './routes/worktree';

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
  .route('/agents', agentRoutes)
  .route('/providers', providerRoutes)
  .route('/worktree', worktreeRoutes)
  .route('/config', configRoutes)
  .route('/folder-picker', folderPickerRoutes);

app.onError((err, c) => {
  console.error(`[Error] ${c.req.method} ${c.req.url}:`, err);

  // Handle Hono's built-in HTTP Exceptions (e.g., throw new HTTPException(400, { message: 'Invalid ID' }))
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
      // Useful for debugging in development; consider omitting or hiding in production
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
