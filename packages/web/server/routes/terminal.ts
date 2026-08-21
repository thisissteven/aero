import { Hono } from 'hono';

import { validateTokenRequest } from '../lib/terminal/auth';
import { AUTH_CONFIG } from '../lib/terminal/config';

const terminal = new Hono().get('/token', (c) => {
  const decision = validateTokenRequest(AUTH_CONFIG, {
    host: c.req.header('host'),
    origin: c.req.header('origin'),
  });

  if (!decision.ok) {
    return c.text(decision.reason, decision.status as 400 | 403);
  }

  c.header('Cache-Control', 'no-store');
  c.header('X-Content-Type-Options', 'nosniff');
  return c.json({ token: AUTH_CONFIG.token });
});

export default terminal;
