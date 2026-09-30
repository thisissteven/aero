// app/components/chat-aside/browser/browser-agent-client.tsx
//
// Always-on client of the browser command bus. It receives `aero_web` actions
// over SSE, drives the browser panel (store + live preview bridge), and posts
// each result back to the server. Mounted once per app session.

import { useEffect } from 'react';

import { getBrowserPaneController } from '@/app/components/chat-aside/browser/browser-agent-controller';
import {
  normalizeBrowserUrl,
  openUrl,
} from '@/app/components/chat-aside/browser/browser-helpers';
import {
  type BrowserViewport,
  useBrowserStore,
} from '@/app/components/chat-aside/browser/browser-store';
import { useSidePanelStore } from '@/app/stores/side-panel-store';

interface BrowserCommand {
  id: string;
  action: string;
  params: Record<string, unknown>;
}

type CommandOutcome =
  | { ok: true; data?: unknown }
  | { ok: false; error: string };

function isViewport(value: unknown): value is BrowserViewport {
  return (
    value === 'fill' ||
    value === 'mobile' ||
    value === 'tablet' ||
    value === 'desktop'
  );
}

function toSize(value: unknown): number | null {
  const size = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(size) || size <= 0) {
    return null;
  }

  return Math.round(Math.min(size, 10_000));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForController(tabId: string | null, timeoutMs = 4_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const controller = getBrowserPaneController(tabId);
    if (controller) return controller;
    await sleep(100);
  }

  return null;
}

async function runCommand(command: BrowserCommand): Promise<CommandOutcome> {
  const { action, params } = command;
  const store = useBrowserStore.getState();
  const actions = store.actions;

  if (action === 'browser.open') {
    const url = typeof params.url === 'string' ? params.url : '';
    if (!url) return { ok: false, error: 'url is required' };

    if (isViewport(params.viewport)) {
      const existing = store.activeTabId;
      if (existing) actions.setViewport(existing, params.viewport);
    }

    useSidePanelStore.getState().setActiveNavItem('browser');

    const tabId = openUrl(url);

    if (isViewport(params.viewport)) {
      actions.setViewport(tabId, params.viewport);
    }

    return { ok: true, data: { tabId, url: normalizeBrowserUrl(url) } };
  }

  if (action === 'browser.resize') {
    useSidePanelStore.getState().setActiveNavItem('browser');

    const tabId = store.activeTabId ?? actions.addTab();

    const width = toSize(params.width);
    const height = toSize(params.height);

    // An exact size (independent of the panel) takes precedence over presets.
    if (width && height) {
      actions.setCustomSize(tabId, { width, height });
      return { ok: true, data: { tabId, width, height } };
    }

    if (!isViewport(params.viewport)) {
      return {
        ok: false,
        error: 'viewport, or both width and height, is required',
      };
    }

    actions.setViewport(tabId, params.viewport);
    return { ok: true, data: { tabId, viewport: params.viewport } };
  }

  useSidePanelStore.getState().setActiveNavItem('browser');

  const controller = await waitForController(
    useBrowserStore.getState().activeTabId,
  );

  if (!controller) {
    return {
      ok: false,
      error: 'The Aero browser panel is not ready. Open it and try again.',
    };
  }

  switch (action) {
    case 'browser.snapshot':
      return { ok: true, data: await controller.snapshot(params) };
    case 'browser.click':
      return { ok: true, data: await controller.click(params) };
    case 'browser.type':
      return { ok: true, data: await controller.type(params) };
    case 'browser.scroll':
      return { ok: true, data: await controller.scroll(params) };
    case 'browser.inspect':
      return { ok: true, data: await controller.inspect(params) };
    case 'browser.capture':
      return { ok: true, data: await controller.capture(params) };
    case 'browser.back':
      await controller.back();
      return { ok: true, data: {} };
    case 'browser.forward':
      await controller.forward();
      return { ok: true, data: {} };
    default:
      return { ok: false, error: `Unsupported browser action: ${action}` };
  }
}

export function BrowserAgentClient() {
  useEffect(() => {
    let stopped = false;
    let controller: AbortController | null = null;

    const postResult = async (id: string, outcome: CommandOutcome) => {
      try {
        await fetch('/api/browser-control/result', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id,
            ok: outcome.ok,
            ...(outcome.ok ? { data: outcome.data } : { error: outcome.error }),
          }),
        });
      } catch {
        // The server will time out the command; nothing more to do.
      }
    };

    const runOne = async (command: BrowserCommand) => {
      let outcome: CommandOutcome;

      try {
        outcome = await runCommand(command);
      } catch (error) {
        outcome = {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }

      await postResult(command.id, outcome);
    };

    const loop = async () => {
      while (!stopped) {
        controller = new AbortController();
        const timeout = window.setTimeout(() => controller?.abort(), 30_000);

        try {
          const response = await fetch('/api/browser-control/poll', {
            signal: controller.signal,
          });

          window.clearTimeout(timeout);

          if (stopped) return;
          if (response.status === 204) {
            // Long-poll deadline elapsed with no command. Pause briefly so a
            // server that answers immediately can never cause a tight loop.
            await sleep(250);
            continue;
          }

          if (!response.ok) {
            await sleep(1_000);
            continue;
          }

          const command = (await response.json()) as BrowserCommand;
          await runOne(command);
        } catch {
          window.clearTimeout(timeout);
          if (stopped) return;
          await sleep(500);
        }
      }
    };

    void loop();

    return () => {
      stopped = true;
      controller?.abort();
    };
  }, []);

  return null;
}
