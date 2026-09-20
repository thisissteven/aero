import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';

/**
 * Run the CLI under Bun. Never invoke bare `aero` — the default action
 * spawns a daemon server. Always pass `--help`, `--version`, or a
 * specific subcommand.
 */
function run(args: string[], timeoutMs = 10_000) {
  const result = spawnSync(
    process.execPath, // the running Bun binary
    ['src/index.ts', ...args],
    {
      encoding: 'utf-8',
      cwd: process.cwd(),
      timeout: timeoutMs,
      env: {
        ...process.env,
        // Isolate from any real Aero install on the test machine.
        AERO_PORT: '0',
        AERO_HOST: '127.0.0.1',
      },
    },
  );

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
}

describe('aero --help', () => {
  test('exits 0 and prints usage', () => {
    const { stdout, status } = run(['--help']);
    expect(status).toBe(0);
    expect(stdout).toContain('Usage: aero');
  });

  test('lists all top-level commands', () => {
    const { stdout } = run(['--help']);
    for (const cmd of [
      'serve',
      'stop',
      'status',
      'restart',
      'schedule',
      'session',
      'models',
      'projects',
      'control',
      'tunnel',
      'startup',
      'logs',
      'connect-url',
      'update',
    ]) {
      expect(stdout).toContain(cmd);
    }
  });

  test('lists global options', () => {
    const { stdout } = run(['--help']);
    for (const opt of [
      '--port',
      '--host',
      '--lan',
      '--api-only',
      '--foreground',
      '--ui-password',
      '--server',
      '--relay',
    ]) {
      expect(stdout).toContain(opt);
    }
  });
});

describe('aero --version', () => {
  test('exits 0 and prints a version', () => {
    const { stdout, status } = run(['--version']);
    expect(status).toBe(0);
    expect(stdout.trim()).toMatch(/\d+\.\d+\.\d+/);
  });
});

describe('aero status', () => {
  test('reports whether the server is running', () => {
    const { stdout, status } = run(['status']);
    expect(status).toBe(0);
    expect(stdout).toContain('Aero Status');
    // One of: "running on ...", "not responding but PID file exists ...",
    // or "not running".
    expect(stdout).toMatch(/\b(running|not responding|not running)\b/);
  }, 15_000);
});

describe('aero stop', () => {
  test('reports state and exits 0 even with no PID file', () => {
    const { stdout, status } = run(['stop']);
    expect(status).toBe(0);
    expect(stdout).toContain('Aero Stop');
    // One of: "No running instance found", "Removed stale PID file ...",
    // or "Stopped Aero on port ...".
    expect(stdout).toMatch(
      /No running instance|Removed stale PID|Stopped Aero/,
    );
  });
});

describe('placeholder commands', () => {
  const placeholders = [
    'schedule',
    'session',
    'models',
    'projects',
    'control',
    'tunnel',
    'startup',
    'logs',
    'connect-url',
    'update',
  ] as const;

  for (const name of placeholders) {
    test(`aero ${name} reports not-yet-implemented`, () => {
      const { stdout, status } = run([name]);
      expect(status).toBe(0);
      expect(stdout).toContain(`"aero ${name}" is not yet implemented.`);
    });
  }
});

describe('subcommand help', () => {
  test('serve --help describes serve', () => {
    const { stdout, status } = run(['serve', '--help']);
    expect(status).toBe(0);
    expect(stdout).toContain('serve');
  });

  test('restart --help describes restart', () => {
    const { stdout, status } = run(['restart', '--help']);
    expect(status).toBe(0);
    expect(stdout).toContain('restart');
  });
});

describe('unknown command', () => {
  test('exits non-zero and reports the error', () => {
    const { stderr, status } = run(['does-not-exist']);
    expect(status).not.toBe(0);
    // Commander writes "error: unknown command 'does-not-exist'" to stderr.
    expect(stderr.toLowerCase()).toContain('unknown command');
  });
});
