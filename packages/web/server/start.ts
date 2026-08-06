import { serve } from 'bun';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';

import api from './index';

const app = new Hono();

app.route('/', api);

app.use(
  '/*',
  serveStatic({
    root: './dist',
  }),
);

app.get(
  '*',
  serveStatic({
    path: './dist/index.html',
  }),
);

serve({
  fetch: app.fetch,
  port: 3000,
});

// eslint-disable-next-line no-console
console.log('http://localhost:3000');
