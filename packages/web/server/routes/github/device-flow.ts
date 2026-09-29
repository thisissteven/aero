// github/device-flow.ts
//
// GitHub's OAuth device flow: the server asks for a code, the user enters it in
// a browser, and the server polls until GitHub hands back an access token.
//
// Device flow needs no client secret, which is why a desktop-style local app
// can use it at all. GitHub responds 200 with an `error` field (not an HTTP
// error) while authorization is pending, so `exchangeDeviceCode` resolves with
// that error rather than throwing.

const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const DEVICE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';

export interface DeviceFlowStart {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval: number;
  scope?: string;
}

export interface DeviceFlowToken {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

function encodeForm(params: Record<string, string | undefined>): string {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    body.set(key, String(value));
  }
  return body.toString();
}

async function postForm<T>(
  url: string,
  params: Record<string, string | undefined>,
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: encodeForm(params),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (payload as { error_description?: string; error?: string })
        ?.error_description ||
      (payload as { error?: string })?.error ||
      response.statusText;
    const error = new Error(message || 'GitHub request failed') as Error & {
      status?: number;
      payload?: unknown;
    };
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload as T;
}

export function startDeviceFlow(params: {
  clientId: string;
  scope: string;
}): Promise<DeviceFlowStart> {
  return postForm<DeviceFlowStart>(DEVICE_CODE_URL, {
    client_id: params.clientId,
    scope: params.scope,
  });
}

export function exchangeDeviceCode(params: {
  clientId: string;
  deviceCode: string;
}): Promise<DeviceFlowToken> {
  return postForm<DeviceFlowToken>(ACCESS_TOKEN_URL, {
    client_id: params.clientId,
    device_code: params.deviceCode,
    grant_type: DEVICE_GRANT_TYPE,
  });
}
