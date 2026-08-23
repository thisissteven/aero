// server/routes/pool.ts

import { Hono } from 'hono';

import { opencodePoolV1, opencodePoolV2 } from '../adapters/opencode/pool';

const pool = new Hono()

  // GET /api/pool -> Inspect pool size, healthy nodes, and active requests
  .get('/', async (c) => {
    const [v1Stats, v2Stats] = await Promise.all([
      opencodePoolV1.getStats(),
      opencodePoolV2.getStats(),
    ]);

    return c.json({
      v1: v1Stats,
      v2: v2Stats,
      combinedNodesCount: v1Stats.healthyNodesCount + v2Stats.healthyNodesCount,
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
    await Promise.all([opencodePoolV1.shutdown(), opencodePoolV2.shutdown()]);
    await Promise.all([opencodePoolV1.init(), opencodePoolV2.init()]);

    const [v1Stats, v2Stats] = await Promise.all([
      opencodePoolV1.getStats(),
      opencodePoolV2.getStats(),
    ]);

    if (v1Stats.poolSize === 0 && v2Stats.poolSize === 0) {
      return c.json({ error: 'Failed to restart pool nodes' }, 500);
    }

    return c.json({
      message: 'All pools restarted successfully',
      stats: { v1: v1Stats, v2: v2Stats },
    });
  });

export default pool;
export type PoolRoutes = typeof pool;
