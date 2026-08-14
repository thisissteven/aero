// server/adapters/opencode/unwrap.ts
//
// @opencode-ai/sdk's default responseStyle is "fields", so every client
// call returns { data, error, request, response } instead of the resource
// directly. This throws on `error` and otherwise narrows to `data`, so call
// sites in index.ts stay one-liners instead of repeating the same check.
//
// Alternative: pass { responseStyle: "data", throwOnError: true } when
// constructing the client, which makes calls return T directly and throw
// on failure — but createOpencode() (used in client.ts) doesn't expose
// client options per the docs, only createOpencodeClient() does. If you
// switch client.ts to createOpencodeClient() against an already-running
// `opencode serve`, you can drop this helper entirely.

export function unwrap<T>(result: { data?: T; error?: unknown }): T {
  if (result.error) {
    let message: string;

    if (typeof result.error === 'object' && result.error !== null) {
      if ('message' in result.error) {
        const msgProp = (result.error as { message: unknown }).message;
        // If message is an object or array, stringify it; otherwise cast to string
        message =
          typeof msgProp === 'object' && msgProp !== null
            ? JSON.stringify(msgProp)
            : String(msgProp);
      } else {
        // Fallback if there is no message property but it is an object
        message = JSON.stringify(result.error);
      }
    } else {
      message = String(result.error);
    }

    throw new Error(`opencode request failed: ${message}`);
  }

  if (result.data === undefined) {
    throw new Error('opencode request returned no data and no error');
  }
  return result.data;
}

export function unwrapResponse<T extends { data: unknown }>(
  result: (T & { error?: undefined }) | { data: undefined; error: unknown },
): T {
  if ('error' in result && result.error) {
    const message =
      typeof result.error === 'object' &&
      result.error !== null &&
      'message' in result.error
        ? String((result.error as { message: unknown }).message)
        : String(result.error);

    throw new Error(`opencode request failed: ${message}`);
  }

  if (result.data === undefined) {
    throw new Error('opencode request returned no data and no error');
  }

  return result as T;
}
