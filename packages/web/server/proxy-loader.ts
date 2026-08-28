import { execSync } from 'child_process';

export function initProxyConfig() {
  const currentNoProxy = process.env.NO_PROXY || process.env.no_proxy || '';

  const entries = new Set(
    currentNoProxy
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );

  for (const host of ['127.0.0.1', 'localhost', '::1']) {
    entries.add(host);
  }

  const noProxy = [...entries].join(',');

  process.env.NO_PROXY = noProxy;
  process.env.no_proxy = noProxy;

  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    return;
  }

  if (process.platform !== 'win32') {
    return;
  }

  try {
    const proxyEnabled = execSync(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable',
      { encoding: 'utf8' },
    );

    if (!proxyEnabled.includes('0x1')) {
      return;
    }

    const proxyServer = execSync(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer',
      { encoding: 'utf8' },
    );

    const match = proxyServer.match(/ProxyServer\s+REG_SZ\s+(.+)/);

    if (!match?.[1]) {
      return;
    }

    const rawProxy = match[1].split(';')[0].trim();

    const proxyUrl = rawProxy.includes('://') ? rawProxy : `http://${rawProxy}`;

    process.env.HTTP_PROXY = proxyUrl;
    process.env.HTTPS_PROXY = proxyUrl;

    console.log(`[Proxy Auto-Detect] Windows proxy enabled -> ${proxyUrl}`);
  } catch {
    // Ignore registry read errors.
  }
}
