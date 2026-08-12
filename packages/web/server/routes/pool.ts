// server/routes/pool.ts

import { Hono } from 'hono';

import { opencodePool } from '../adapters/opencode/pool';

const pool = new Hono()
  // GET /api/pool -> Inspect pool size, healthy nodes, and active requests
  .get('/', async (c) => {
    const stats = await opencodePool.getStats();
    return c.json(stats);
  })

  // POST /api/pool/restart -> Force restart all pool nodes
  .post('/restart', async (c) => {
    await opencodePool.shutdown();
    await opencodePool.init();
    const stats = await opencodePool.getStats();
    return c.json({ message: 'Pool restarted successfully', stats });
  });

export default pool;
export type PoolRoutes = typeof pool;
