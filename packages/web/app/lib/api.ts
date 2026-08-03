import { hc } from 'hono/client';

// Import the AppType from your server's entrypoint or router definition
import type { AppType } from '../../server';

/**
 * End-to-end type-safe Hono client instance.
 * Automatically infers input schemas, params, and response types from routes.
 */
export const client = hc<AppType>('/');
