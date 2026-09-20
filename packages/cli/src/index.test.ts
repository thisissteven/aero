import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';

function run(args: string[] = []) {
  const result = spawnSync('bun', ['src/index.ts', ...args], {
    encoding: 'utf-8',
    cwd: process.cwd(),
  });
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status,
  };
}

describe('cli commands', () => {
  test('--help shows usage', () => {
    const { stdout, status } = run(['--help']);
    expect(status).toBe(0);
    expect(stdout).toContain('Usage: aero');
    expect(stdout).toContain('serve');
  });

  test('status checks server', () => {
    const { stdout, status } = run(['status']);
    expect(status).toBe(0);
    expect(stdout).toContain('Server');
  });

  test('models prints placeholder', () => {
    const { stdout, status } = run(['models']);
    expect(status).toBe(0);
    expect(stdout).toContain('opencode');
  });

  test('control lists commands', () => {
    const { stdout, status } = run(['control']);
    expect(status).toBe(0);
    expect(stdout).toContain('serve');
  });

  test('connect-url generates url', () => {
    const { stdout, status } = run(['connect-url']);
    expect(status).toBe(0);
    expect(stdout).toContain('Connect URL');
  });
});
