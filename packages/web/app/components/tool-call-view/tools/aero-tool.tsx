import { LayoutHeaderCursor } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import type { AeroToolPart } from '@/app/components/tool-call-view/tools/tool-types';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { formatToolOutput } from '@/app/lib/file-icons/tool-helpers';
import { useTheme } from '@/app/providers';

function AeroToolIcon() {
  const { resolvedTheme } = useTheme();

  return (
    <img
      src={
        resolvedTheme === 'dark' ? '/favicon-dark.svg' : '/favicon-light.svg'
      }
      alt=''
      className='h-3 w-3 object-contain'
    />
  );
}

const ACTION_TITLES: Record<string, string> = {
  'projects.list': 'List configured projects',
  'models.list': 'Show model preferences',
  'session.list': 'List sessions',
  'session.create': 'Create a session',
  'session.send': 'Send a prompt',
  'session.fork': 'Fork a session',
  'session.status': 'Check session status',
  'session.messages': 'Read session messages',
  'schedule.list': 'List scheduled tasks',
  'schedule.create': 'Create a scheduled task',
  'schedule.run': 'Run a scheduled task',
  'schedule.delete': 'Delete a scheduled task',
  'schedule.toggle': 'Enable or disable a scheduled task',
  'browser.open': 'Open a page in the browser panel',
  'browser.snapshot': 'Read the open page',
  'browser.click': 'Click on the open page',
  'browser.type': 'Type into the open page',
  'browser.scroll': 'Scroll the open page',
  'browser.back': 'Go back in the browser panel',
  'browser.forward': 'Go forward in the browser panel',
  'browser.inspect': 'Read how an element renders',
  'browser.capture': 'Save a screenshot of the page',
  'browser.resize': 'Change the page viewport',
};

function actionTitle(action?: string): string {
  if (!action) return 'Aero';
  return ACTION_TITLES[action] ?? action;
}

function readAction(part: AeroToolPart): string | undefined {
  const action = part.input?.action;
  return typeof action === 'string' ? action : undefined;
}

function readParams(part: AeroToolPart): Record<string, unknown> {
  const input = part.input ?? {};
  const { action: _action, parameters, ...rest } = input;
  return { ...rest, ...(parameters ?? {}) };
}

const SUMMARY_KEYS = [
  'url',
  'selector',
  'prompt',
  'sessionId',
  'taskId',
  'name',
  'projectId',
  'direction',
  'viewport',
  'label',
  'text',
  'value',
];

function summarize(params: Record<string, unknown>): string {
  for (const key of SUMMARY_KEYS) {
    const value = params[key];

    if (typeof value === 'string' && value.trim()) {
      const trimmed = value.trim();
      return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
    }
  }

  return '';
}

function parseOutput(output?: string): Record<string, any> | null {
  if (!output) return null;

  try {
    const parsed = JSON.parse(output);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export const AeroToolView = memo(
  ({
    part,
    blockId,
    isStreaming,
  }: {
    part: AeroToolPart;
    blockId: string;
    isStreaming: boolean;
  }) => {
    const action = readAction(part);
    const rawOutput = formatToolOutput(part.output);

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        iconNode={<AeroToolIcon />}
        title={actionTitle(action)}
        preview={summarize(readParams(part))}
        codeTitle={action ?? 'aero'}
        code={rawOutput}
        language='json'
        copyText={rawOutput}
        isStreaming={isStreaming}
      />
    );
  },
);

AeroToolView.displayName = 'AeroToolView';

export const AeroWebToolView = memo(
  ({
    part,
    blockId,
    isStreaming,
  }: {
    part: AeroToolPart;
    blockId: string;
    isStreaming: boolean;
  }) => {
    const action = readAction(part);
    const rawOutput = formatToolOutput(part.output);
    const parsed = parseOutput(rawOutput);
    const directory = useSessionDirectory();

    const relativePath =
      typeof parsed?.relativePath === 'string' ? parsed.relativePath : null;
    const showCapture =
      action === 'browser.capture' &&
      Boolean(relativePath) &&
      Boolean(directory);

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={LayoutHeaderCursor}
        title={actionTitle(action)}
        preview={summarize(readParams(part))}
        codeTitle={action ?? 'aero_web'}
        code={rawOutput}
        language='json'
        copyText={rawOutput}
        isStreaming={isStreaming}
      >
        {showCapture && directory ? (
          <img
            src={`/api/fs/raw?root=${encodeURIComponent(directory)}&path=${encodeURIComponent(
              relativePath as string,
            )}`}
            alt={
              typeof parsed?.pageTitle === 'string'
                ? parsed.pageTitle
                : 'Page screenshot'
            }
            className='border-separator max-h-96 rounded-md border object-contain'
          />
        ) : null}
      </BaseTool>
    );
  },
);

AeroWebToolView.displayName = 'AeroWebToolView';
