// packages/web/server/proxy-loader.ts
import { execSync } from 'child_process';
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici';

/**
 * Automatically configures localhost bypass and detects system proxies on Windows/macOS.
 */
export function initProxyConfig() {
  // Always guarantee internal localhost calls bypass any proxy
  const currentNoProxy = process.env.NO_PROXY || process.env.no_proxy || '';
  const localBypass = '127.0.0.1,localhost,::1,0.0.0.0';

  process.env.NO_PROXY = currentNoProxy
    ? `${currentNoProxy},${localBypass}`
    : localBypass;
  process.env.no_proxy = process.env.NO_PROXY; // Set lowercase variant for compatibility

  // If HTTP/HTTPS proxies are already explicitly defined in environment, use EnvHttpProxyAgent
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    setGlobalDispatcher(new EnvHttpProxyAgent());
    return;
  }

  // Windows Registry proxy auto-detect (zero external dependency)
  if (process.platform === 'win32') {
    try {
      const regOutput = execSync(
        'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable',
        { encoding: 'utf8' },
      );

      if (regOutput.includes('0x1')) {
        const serverOutput = execSync(
          'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer',
          { encoding: 'utf8' },
        );

        const match = serverOutput.match(/ProxyServer\s+REG_SZ\s+(.+)/);
        if (match && match[1]) {
          const rawProxy = match[1].split(';')[0]; // Handle separate protocols if present
          const proxyUrl = rawProxy.includes('://')
            ? rawProxy
            : `http://${rawProxy}`;

          process.env.HTTP_PROXY = proxyUrl;
          process.env.HTTPS_PROXY = proxyUrl;
          console.log(
            `[Proxy Auto-Detect] Windows proxy enabled -> ${proxyUrl}`,
          );
        }
      }

      const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
      if (proxyUrl) {
        // EnvHttpProxyAgent automatically parses process.env.NO_PROXY / process.env.no_proxy
        setGlobalDispatcher(new EnvHttpProxyAgent());
      }
    } catch {
      // Ignore registry read errors
    }
  }
}
