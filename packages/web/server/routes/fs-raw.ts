import { Hono } from 'hono';
import {
  type FsSession,
  handleStream,
  resolveRoot,
} from '@/server/lib/fs-ws/fs-core';

const fsRawRoutes = new Hono();

fsRawRoutes.get('/raw', async (c) => {
  const root = c.req.query('root');
  const p = c.req.query('path');

  if (!root || p == null) {
    return c.text('missing root or path', 400);
  }

  let session: FsSession;
  try {
    session = { root: await resolveRoot(root) };
  } catch {
    return c.text('invalid root', 400);
  }

  try {
    // handleStream returns a Fetch Response — Hono accepts it directly.
    return await handleStream(
      session,
      p,
      c.req.header('range') ?? null,
      c.req.header('if-none-match') ?? null,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'stream failed';
    const status = message.includes('escapes')
      ? 403
      : message.includes('ENOENT')
        ? 404
        : 500;
    return c.text(message, status);
  }
});

export default fsRawRoutes;
