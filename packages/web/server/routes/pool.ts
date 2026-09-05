// server/routes/pool.ts

import { Hono } from 'hono';

import { opencodePoolV2 } from '../adapters/opencode/pool';

const pool = new Hono()

  // GET /api/pool -> Inspect pool size, healthy nodes, and active requests
  .get('/', async (c) => {
    const [v2Stats] = await Promise.all([opencodePoolV2.getStats()]);

    return c.json({
      v2: v2Stats,
      combinedNodesCount: v2Stats.healthyNodesCount,
    });
  })

  // GET /api/pool/version -> Retrieve opencode binary version
  .get('/version', async (c) => {
    try {
      const versionInfo = await opencodePoolV2.getVersion();
      return c.json(versionInfo);
    } catch (err) {
      return c.json(
        {
          error: 'Failed to query OpenCode binary version',
          details: String(err),
        },
        500,
      );
    }
  })

  // POST /api/pool/restart -> Force restart all pool nodes
  .post('/restart', async (c) => {
    await Promise.all([opencodePoolV2.shutdown()]);
    await Promise.all([opencodePoolV2.init()]);

    const [v2Stats] = await Promise.all([opencodePoolV2.getStats()]);

    if (v2Stats.poolSize === 0) {
      return c.json({ error: 'Failed to restart pool nodes' }, 500);
    }

    return c.json({
      message: 'All pools restarted successfully',
      stats: { v2: v2Stats },
    });
  });

export default pool;
export type PoolRoutes = typeof pool;
