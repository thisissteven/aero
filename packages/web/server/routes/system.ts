import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { exec, execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// Every subprocess call below MUST carry a timeout. Without one, a hung
// child (macOS Automation permission dialog blocking osascript, a wedged
// Spotlight/mdfind index, a terminal binary that never returns) hangs the
// awaiting request forever — that's what was making the app unresponsive.
const QUICK_TIMEOUT_MS = 3_000; // which/where/test lookups
const ICON_TIMEOUT_MS = 5_000; // osascript/powershell icon extraction
const LAUNCH_TIMEOUT_MS = 8_000; // opening apps/terminals

const killOpts = { killSignal: 'SIGKILL' as const };

export interface OpenInApp {
  id: string;
  label: string;
  appName: string;
  appIconUrl?: string;
  binaries?: string[];
  macAppNames?: string[];
}

function getFileManagerConfig() {
  const platform = os.platform();
  if (platform === 'darwin') {
    return { label: 'Finder', appName: 'Finder' };
  }
  if (platform === 'win32') {
    return { label: 'File Explorer', appName: 'File Explorer' };
  }
  return { label: 'File Manager', appName: 'File Manager' };
}

const fileManager = getFileManagerConfig();

export const OPEN_IN_APPS: OpenInApp[] = [
  // File Explorers
  {
    id: 'finder',
    label: fileManager.label,
    appName: fileManager.appName,
    binaries: [
      'explorer',
      'explorer.exe',
      'open',
      'xdg-open',
      'nautilus',
      'dolphin',
      'thunar',
      'nemo',
    ],
    macAppNames: ['Finder'],
  },

  // Terminals
  {
    id: 'terminal',
    label: 'Terminal',
    appName: 'Terminal',
    binaries: [
      'wt',
      'wt.exe',
      'gnome-terminal',
      'konsole',
      'x-terminal-emulator',
      'xfce4-terminal',
      'alacritty',
      'kitty',
    ],
    macAppNames: ['Terminal'],
  },
  {
    id: 'iterm2',
    label: 'iTerm2',
    appName: 'iTerm',
    binaries: ['iterm2'],
    macAppNames: ['iTerm', 'iTerm2'],
  },
  {
    id: 'ghostty',
    label: 'Ghostty',
    appName: 'Ghostty',
    binaries: ['ghostty'],
    macAppNames: ['Ghostty'],
  },

  // Editors & AI Code Editors
  {
    id: 'vscode',
    label: 'VS Code',
    appName: 'Visual Studio Code',
    binaries: ['code', 'code.cmd', 'code.exe'],
    macAppNames: ['Visual Studio Code'],
  },
  {
    id: 'vscode-insiders',
    label: 'VS Code Insiders',
    appName: 'Visual Studio Code - Insiders',
    binaries: ['code-insiders', 'code-insiders.cmd'],
    macAppNames: ['Visual Studio Code - Insiders'],
  },
  {
    id: 'cursor',
    label: 'Cursor',
    appName: 'Cursor',
    binaries: ['cursor', 'cursor.cmd'],
    macAppNames: ['Cursor'],
  },
  {
    id: 'windsurf',
    label: 'Windsurf',
    appName: 'Windsurf',
    binaries: ['windsurf', 'windsurf.cmd'],
    macAppNames: ['Windsurf'],
  },
  {
    id: 'zed',
    label: 'Zed',
    appName: 'Zed',
    binaries: ['zed', 'zedit', 'cli'],
    macAppNames: ['Zed'],
  },
  {
    id: 'trae',
    label: 'Trae',
    appName: 'Trae',
    binaries: ['trae', 'trae.cmd'],
    macAppNames: ['Trae'],
  },
  {
    id: 'kiro',
    label: 'Kiro',
    appName: 'Kiro',
    binaries: ['kiro', 'kiro.cmd'],
    macAppNames: ['Kiro'],
  },
  {
    id: 'antigravity',
    label: 'Antigravity',
    appName: 'Antigravity',
    binaries: ['antigravity', 'antigravity.cmd'],
    macAppNames: ['Antigravity'],
  },
  {
    id: 'vscodium',
    label: 'VSCodium',
    appName: 'VSCodium',
    binaries: ['codium', 'codium.cmd'],
    macAppNames: ['VSCodium'],
  },
  {
    id: 'sublime-text',
    label: 'Sublime',
    appName: 'Sublime Text',
    binaries: ['subl', 'sublime_text', 'subl.exe'],
    macAppNames: ['Sublime Text'],
  },

  // JetBrains IDEs
  {
    id: 'intellij',
    label: 'IntelliJ',
    appName: 'IntelliJ IDEA',
    binaries: ['idea', 'idea64.exe', 'idea.cmd'],
    macAppNames: ['IntelliJ IDEA', 'IntelliJ IDEA CE'],
  },
  {
    id: 'pycharm',
    label: 'PyCharm',
    appName: 'PyCharm',
    binaries: ['pycharm', 'pycharm64.exe', 'pycharm.cmd'],
    macAppNames: ['PyCharm', 'PyCharm CE'],
  },
  {
    id: 'webstorm',
    label: 'WebStorm',
    appName: 'WebStorm',
    binaries: ['webstorm', 'webstorm64.exe', 'webstorm.cmd'],
    macAppNames: ['WebStorm'],
  },
  {
    id: 'phpstorm',
    label: 'PhpStorm',
    appName: 'PhpStorm',
    binaries: ['phpstorm', 'phpstorm64.exe', 'phpstorm.cmd'],
    macAppNames: ['PhpStorm'],
  },
  {
    id: 'rider',
    label: 'Rider',
    appName: 'Rider',
    binaries: ['rider', 'rider64.exe', 'rider.cmd'],
    macAppNames: ['Rider'],
  },
  {
    id: 'rustrover',
    label: 'RustRover',
    appName: 'RustRover',
    binaries: ['rustrover', 'rustrover64.exe', 'rustrover.cmd'],
    macAppNames: ['RustRover'],
  },

  // Heavy IDEs & Apple Tooling
  {
    id: 'visual-studio',
    label: 'Visual Studio',
    appName: 'Visual Studio',
    binaries: ['devenv', 'devenv.exe'],
    macAppNames: ['Visual Studio'],
  },
  {
    id: 'android-studio',
    label: 'Android Studio',
    appName: 'Android Studio',
    binaries: ['studio', 'studio.sh', 'studio64.exe'],
    macAppNames: ['Android Studio'],
  },
  {
    id: 'xcode',
    label: 'Xcode',
    appName: 'Xcode',
    binaries: ['xcode-select'],
    macAppNames: ['Xcode'],
  },
  {
    id: 'eclipse',
    label: 'Eclipse',
    appName: 'Eclipse',
    binaries: ['eclipse', 'eclipse.exe'],
    macAppNames: ['Eclipse'],
  },
];

function formatPath(inputPath: string): string {
  const resolved = path.resolve(inputPath);
  return os.platform() === 'win32' ? resolved.replace(/\//g, '\\') : resolved;
}

async function isBinaryAvailable(binary: string): Promise<boolean> {
  const isWin = os.platform() === 'win32';
  try {
    await execFileAsync(isWin ? 'where' : 'which', [binary], {
      timeout: QUICK_TIMEOUT_MS,
      ...killOpts,
    });
    return true;
  } catch {
    return false;
  }
}

async function isMacAppAvailable(appName: string): Promise<boolean> {
  if (os.platform() !== 'darwin') return false;

  try {
    const { stdout } = await execFileAsync(
      'mdfind',
      [`kMDItemCFBundleIdentifier == * && kMDItemDisplayName == "${appName}"`],
      { timeout: QUICK_TIMEOUT_MS, ...killOpts },
    );
    if (stdout.trim().length > 0) return true;
  } catch {
    // Fall back to direct folder checks
  }

  const searchPaths = [
    `/Applications/${appName}.app`,
    `/System/Applications/${appName}.app`,
    `/System/Applications/Utilities/${appName}.app`,
    `${os.homedir()}/Applications/${appName}.app`,
  ];

  const checks = await Promise.allSettled(
    searchPaths.map((appPath) =>
      execFileAsync('test', ['-d', appPath], {
        timeout: QUICK_TIMEOUT_MS,
        ...killOpts,
      }),
    ),
  );

  return checks.some((r) => r.status === 'fulfilled');
}

// Zero-dependency native icon extraction logic
async function extractNativeIconUrl(
  app: OpenInApp,
): Promise<string | undefined> {
  const platform = os.platform();

  if (platform === 'darwin') {
    // Map specific macOS system apps to their full bundle paths
    let appPath = app.macAppNames?.[0] || app.appName;
    if (app.id === 'terminal') {
      appPath = '/System/Applications/Utilities/Terminal.app';
    } else if (app.id === 'finder') {
      appPath = '/System/Library/CoreServices/Finder.app';
    }

    const script = `
      use framework "Foundation"
      use framework "AppKit"
      set targetPath to "${appPath}"
      if targetPath does not start with "/" then
        set targetPath to POSIX path of (path to application targetPath)
      end if
      set img to current application's NSWorkspace's sharedWorkspace()'s iconForFile:targetPath
      set rep to current application's NSBitmapImageRep's imageRepWithData:(img's TIFFRepresentation())
      set pngData to rep's representationUsingType:(current application's NSPNGFileType) properties:(missing value)
      return pngData's base64EncodedStringWithOptions:0 as text
    `;
    try {
      const { stdout } = await execFileAsync('osascript', ['-e', script], {
        timeout: ICON_TIMEOUT_MS,
        ...killOpts,
      });
      const base64 = stdout.trim();
      return base64 ? `data:image/png;base64,${base64}` : undefined;
    } catch {
      return undefined;
    }
  }

  if (platform === 'win32') {
    // Determine the executable for PowerShell lookup
    let binary = app.binaries?.[0] || `${app.id}.exe`;
    if (app.id === 'terminal') {
      binary = 'cmd.exe'; // Default Windows command shell
    } else if (app.id === 'finder') {
      binary = 'explorer.exe';
    }

    const psScript = `
      $ErrorActionPreference = 'Stop'
      Add-Type -AssemblyName System.Drawing
      $path = (Get-Command "${binary}" -ErrorAction SilentlyContinue).Source
      if (-not $path -and (Test-Path "${binary}")) { $path = "${binary}" }
      if (-not $path) { exit 1 }
      $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($path)
      $ms = New-Object System.IO.MemoryStream
      $icon.ToBitmap().Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
      [Convert]::ToBase64String($ms.ToArray())
    `;
    try {
      const { stdout } = await execFileAsync(
        'powershell',
        ['-NoProfile', '-Command', psScript],
        { timeout: ICON_TIMEOUT_MS, ...killOpts },
      );
      const base64 = stdout.trim();
      return base64 ? `data:image/png;base64,${base64}` : undefined;
    } catch {
      return undefined;
    }
  }

  if (platform === 'linux') {
    const iconNames = [
      'utilities-terminal',
      'terminal',
      app.id,
      app.appName.toLowerCase().replace(/\s+/g, '-'),
    ];
    const searchDirs = [
      '/usr/share/pixmaps',
      '/usr/share/icons/hicolor/48x48/apps',
      '/usr/share/icons/hicolor/scalable/apps',
    ];

    for (const dir of searchDirs) {
      for (const name of iconNames) {
        for (const ext of ['png', 'svg']) {
          const iconPath = path.join(dir, `${name}.${ext}`);
          try {
            const buffer = await fs.readFile(iconPath);
            const mime = ext === 'svg' ? 'image/svg+xml' : 'image/png';
            return `data:${mime};base64,${buffer.toString('base64')}`;
          } catch {
            // Check next
          }
        }
      }
    }
  }

  return undefined;
}

const openAppSchema = z.object({
  path: z.string().min(1, 'Path is required'),
  appId: z.string().min(1, 'App ID is required'),
});

const system = new Hono()

  .get('/editors', async (c) => {
    const platform = os.platform();
    const isMac = platform === 'darwin';
    const isWin = platform === 'win32';

    const settled = await Promise.allSettled(
      OPEN_IN_APPS.map(async (app) => {
        let available = false;

        // Native System App Overrides
        if (app.id === 'finder') {
          available = true;
        } else if (app.id === 'terminal') {
          if (isMac || isWin) {
            available = true;
          } else {
            const linuxTerms = [
              'gnome-terminal',
              'konsole',
              'x-terminal-emulator',
              'xfce4-terminal',
              'alacritty',
              'kitty',
            ];
            const results = await Promise.allSettled(
              linuxTerms.map((t) => isBinaryAvailable(t)),
            );
            available = results.some(
              (r) => r.status === 'fulfilled' && r.value,
            );
          }
        }

        // Binaries Check across system PATH (parallel, not sequential)
        if (!available && app.binaries) {
          const results = await Promise.allSettled(
            app.binaries.map((bin) => isBinaryAvailable(bin)),
          );
          available = results.some((r) => r.status === 'fulfilled' && r.value);
        }

        // macOS App Bundle Check
        if (!available && isMac) {
          const namesToTest = app.macAppNames || [app.appName, app.label];
          const results = await Promise.allSettled(
            namesToTest.map((n) => isMacAppAvailable(n)),
          );
          available = results.some((r) => r.status === 'fulfilled' && r.value);
        }

        // Extract native icon dynamically if available. Icon extraction
        // is best-effort — never let a stuck/failed icon lookup take
        // down the app's availability result.
        let appIconUrl = app.appIconUrl;
        if (available) {
          try {
            appIconUrl = (await extractNativeIconUrl(app)) || appIconUrl;
          } catch {
            // keep fallback appIconUrl
          }
        }

        return {
          id: app.id,
          label: app.label,
          appName: app.appName,
          appIconUrl,
          available,
        };
      }),
    );

    // Any single app check that rejected (shouldn't happen now that every
    // subprocess call has a timeout, but belt-and-suspenders) degrades to
    // "unavailable" instead of failing the whole endpoint.
    const editors = settled.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      const app = OPEN_IN_APPS[i];
      return {
        id: app.id,
        label: app.label,
        appName: app.appName,
        appIconUrl: app.appIconUrl,
        available: false,
      };
    });

    return c.json({ editors });
  })

  .post('/open-app', zValidator('json', openAppSchema), async (c) => {
    const { path: rawPath, appId } = c.req.valid('json');
    const targetPath = formatPath(rawPath);
    const platform = os.platform();
    const appConfig = OPEN_IN_APPS.find((a) => a.id === appId);

    if (!appConfig) {
      throw new HTTPException(400, { message: `Unsupported app ID: ${appId}` });
    }

    try {
      // 1. File Explorer Handler
      if (appId === 'finder') {
        if (platform === 'win32') {
          // await execFileAsync('explorer', [targetPath], {
          //   timeout: LAUNCH_TIMEOUT_MS,
          //   ...killOpts,
          // });
          exec(`explorer "${targetPath}"`, () => {});
        } else if (platform === 'darwin') {
          await execFileAsync('open', [targetPath], {
            timeout: LAUNCH_TIMEOUT_MS,
            ...killOpts,
          });
        } else {
          await execFileAsync('xdg-open', [targetPath], {
            timeout: LAUNCH_TIMEOUT_MS,
            ...killOpts,
          });
        }
        return c.json({ success: true, appId, path: targetPath });
      }

      // 2. Native Terminal Handler
      if (appId === 'terminal') {
        if (platform === 'win32') {
          await execFileAsync('wt', ['-d', targetPath], {
            timeout: LAUNCH_TIMEOUT_MS,
            ...killOpts,
          }).catch(() =>
            execAsync(`start cmd /k "cd /d ${targetPath}"`, {
              timeout: LAUNCH_TIMEOUT_MS,
              ...killOpts,
            }),
          );
        } else if (platform === 'darwin') {
          const script = `tell application "Terminal" to do script "cd ${targetPath.replace(/"/g, '\\"')}"`;
          await execFileAsync(
            'osascript',
            ['-e', script, '-e', 'tell application "Terminal" to activate'],
            { timeout: LAUNCH_TIMEOUT_MS, ...killOpts },
          );
        } else {
          await execFileAsync(
            'x-terminal-emulator',
            [`--working-directory=${targetPath}`],
            { timeout: LAUNCH_TIMEOUT_MS, ...killOpts },
          )
            .catch(() =>
              execFileAsync(
                'gnome-terminal',
                [`--working-directory=${targetPath}`],
                { timeout: LAUNCH_TIMEOUT_MS, ...killOpts },
              ),
            )
            .catch(() =>
              execFileAsync('konsole', ['--workdir', targetPath], {
                timeout: LAUNCH_TIMEOUT_MS,
                ...killOpts,
              }),
            );
        }
        return c.json({ success: true, appId, path: targetPath });
      }

      // 3. macOS App / Binary Launcher
      if (platform === 'darwin') {
        const namesToTest = appConfig.macAppNames || [
          appConfig.appName,
          appConfig.label,
        ];
        let launched = false;

        for (const macName of namesToTest) {
          try {
            await execFileAsync('open', ['-a', macName, targetPath], {
              timeout: LAUNCH_TIMEOUT_MS,
              ...killOpts,
            });
            launched = true;
            break;
          } catch {
            // App name failed, try next alias
          }
        }

        if (!launched && appConfig.binaries) {
          for (const bin of appConfig.binaries) {
            try {
              await execFileAsync(bin, [targetPath], {
                timeout: LAUNCH_TIMEOUT_MS,
                ...killOpts,
              });
              launched = true;
              break;
            } catch {
              // Binary failed, continue
            }
          }
        }

        if (!launched) {
          throw new Error(`Could not launch ${appConfig.label} on macOS`);
        }
      }
      // 4. Windows Launcher
      else if (platform === 'win32') {
        let launched = false;

        if (appConfig.binaries) {
          for (const bin of appConfig.binaries) {
            try {
              await execAsync(`cmd.exe /c start "" ${bin} "${targetPath}"`, {
                timeout: LAUNCH_TIMEOUT_MS,
                ...killOpts,
              });
              launched = true;
              break;
            } catch {
              // Binary failed
            }
          }
        }

        if (!launched) {
          throw new Error(`Could not launch ${appConfig.label} on Windows`);
        }
      }
      // 5. Linux Launcher
      else {
        let launched = false;

        if (appConfig.binaries) {
          for (const bin of appConfig.binaries) {
            try {
              await execFileAsync(bin, [targetPath], {
                timeout: LAUNCH_TIMEOUT_MS,
                ...killOpts,
              });
              launched = true;
              break;
            } catch {
              // Binary failed
            }
          }
        }

        if (!launched) {
          throw new Error(`Could not launch ${appConfig.label} on Linux`);
        }
      }

      return c.json({ success: true, appId, path: targetPath });
    } catch (err: unknown) {
      console.error(`Failed to open app ${appId}:`, err);
      throw new HTTPException(500, {
        message: `Failed to open ${appConfig.label}`,
      });
    }
  });

export default system;
