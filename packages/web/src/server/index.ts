import { Hono } from 'hono';

const app = new Hono();

app.get('/api/hello', (c) =>
  c.json({
    message: 'Hello Aero',
  }),
);

export default app;
