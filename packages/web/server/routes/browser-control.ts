// server/routes/browser-control.ts
//
// UI-side endpoint of the browser command bus. The browser panel long-polls
// `/poll` for commands and posts each result to `/result`.

import { Hono } from 'hono';

import {
  completeBrowserCommand,
  waitForBrowserCommand,
} from '@/server/services/browser-control';

const POLL_TIMEOUT_MS = 25_000;

const browserControl = new Hono()
  .get('/poll', async (c) => {
    const command = await waitForBrowserCommand(
      POLL_TIMEOUT_MS,
      c.req.raw.signal,
    );

    if (!command) {
      return c.body(null, 204);
    }

    return c.json(command);
  })
  .post('/result', async (c) => {
    const body = await c.req.json().catch(() => null);
    const id = typeof body?.id === 'string' ? body.id : '';

    if (!id) {
      return c.json({ ok: false, error: 'id is required' }, 400);
    }

    const accepted = completeBrowserCommand(id, {
      ok: body?.ok === true,
      data: body?.data,
      error: typeof body?.error === 'string' ? body.error : undefined,
    });

    return c.json({ ok: accepted });
  });

export default browserControl;
