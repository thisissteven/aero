import { describe, expect, it } from 'bun:test';

import {
  completeBrowserCommand,
  requestBrowserAction,
  waitForBrowserCommand,
} from '@/server/services/browser-control';

describe('browser-control command bus', () => {
  it('rejects when no browser panel is connected', async () => {
    await expect(requestBrowserAction('browser.snapshot', {})).rejects.toThrow(
      'No Aero browser panel is connected',
    );
  });

  it('resolves a poll with null when nothing is queued', async () => {
    await expect(waitForBrowserCommand(50)).resolves.toBeNull();
  });

  it('delivers a command to an active long-poll and resolves the result', async () => {
    const poll = waitForBrowserCommand(2_000);
    const action = requestBrowserAction('browser.snapshot', {
      selector: '#app',
    });

    const command = await poll;
    expect(command?.action).toBe('browser.snapshot');
    expect(command?.params).toEqual({ selector: '#app' });

    completeBrowserCommand(command!.id, { ok: true, data: { hello: 'world' } });
    await expect(action).resolves.toEqual({ hello: 'world' });
  });

  it('rejects a command when the client reports a failure', async () => {
    const poll = waitForBrowserCommand(2_000);
    const action = requestBrowserAction('browser.click', {});

    const command = await poll;
    completeBrowserCommand(command!.id, { ok: false, error: 'nope' });

    await expect(action).rejects.toThrow('nope');
  });

  it('rejects a command whose request is aborted', async () => {
    const controller = new AbortController();
    const action = requestBrowserAction(
      'browser.scroll',
      {},
      { signal: controller.signal },
    );

    controller.abort();

    await expect(action).rejects.toThrow('aborted');
  });

  it('rejects an unknown completion id', () => {
    expect(completeBrowserCommand('missing', { ok: true })).toBe(false);
  });
});
