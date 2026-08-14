import { hc } from 'hono/client';

// Import the AppType from your server's entrypoint or router definition
import type { AppType } from '../../server';

/**
 * End-to-end type-safe Hono client instance.
 * Automatically infers input schemas, params, and response types from routes.
 */
export const client = hc<AppType>('/');

/**
 * Always throws a formatted Error extracted from a non-200 Hono response.
 * Annotated with `Promise<never>` for TypeScript control-flow narrowing.
 */
export async function throwResponseError(res: {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: () => Promise<any>;
  text: () => Promise<string>;
}): Promise<never> {
  let errorMessage = `HTTP ${res.status}: Request failed`;

  try {
    const errorData = await res.json();
    if (errorData && typeof errorData === 'object' && 'message' in errorData) {
      errorMessage = String(errorData.message);
    }
  } catch {
    const text = await res.text().catch(() => '');
    if (text) errorMessage = text;
  }

  throw new Error(errorMessage);
}
