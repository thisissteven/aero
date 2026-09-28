import { Button } from '@aero/ui';
import { Kbd } from '@heroui/react';
import React, { useMemo, useRef } from 'react';
import {
  useChatStore,
  useSessionRuntime,
} from '@/app/features/chat-page/chat-feed/chat-store';
import {
  purgePermissionRequest,
  useReplyToPermission,
  useSessionPermissions,
} from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';
import { useAnimatedAction } from '@/app/hooks/useAnimatedAction';
import { useKeyPress } from '@/app/hooks/useKeyPress';
import { queryClient } from '@/app/providers';
import { useSessionId } from '@/app/providers/SessionIdProvider';
import {
  AeroPermission,
  AeroPermissionRequest,
} from '@/server/services/harness/types';
import { normalizePath } from '@/server/shared';

export type EditToolNames =
  | 'edit'
  | 'multiedit'
  | 'str_replace'
  | 'str_replace_based_edit_tool';
export type WriteToolNames = 'write' | 'create' | 'file_write';
export type ReadToolNames = 'read' | 'view' | 'file_read' | 'cat';
export type BashToolNames = 'bash' | 'shell' | 'cmd' | 'terminal';

type PermissionRequestEntry = AeroPermissionRequest[number];

/**
 * The store holds `AeroPermission` (event shape, camelCase `sessionId`,
 * `tool.messageId`) while the REST list holds the SDK `PermissionRequest`
 * (camelCase `sessionID`, `tool.messageID`). Normalize both so a request
 * coming from either source renders and resolves identically.
 */
type NormalizedPermission = {
  id: string;
  sessionId: string;
  permission: string;
  patterns: string[];
  metadata?: Record<string, unknown>;
  always?: string[];
  tool?: { messageId?: string; callID: string };
};

function normalizePermission(
  entry: AeroPermission | PermissionRequestEntry,
): NormalizedPermission {
  const sessionId = 'sessionId' in entry ? entry.sessionId : entry.sessionID;

  const tool = entry.tool
    ? {
        callID: entry.tool.callID,
        messageId:
          'messageID' in entry.tool
            ? entry.tool.messageID
            : entry.tool.messageId,
      }
    : undefined;

  return {
    id: entry.id,
    sessionId,
    permission: entry.permission,
    patterns: entry.patterns ?? [],
    metadata: entry.metadata,
    always: entry.always,
    tool,
  };
}

/**
 * A single permission can be mirrored in both the parent feed and a subagent
 * feed at once. Guard replies by request id so the global Enter/Esc shortcuts
 * (registered per mounted banner) can't fire the same reply twice.
 */
const inFlightPermissions = new Set<string>();

export const ReplyToPermission = React.memo(() => {
  const activeSessionId = useSessionId();
  const { t } = useI18n();

  const { isExiting, execute } = useAnimatedAction({ animationDuration: 500 });

  // Keep polling while anything is streaming so a subagent's prompt reaches
  // the parent view even though the parent's own stream never sees it.
  const isAnySessionRunning = useChatStore(
    (state) => state.runningSessions.length > 0,
  );

  // 1. Store overlay for the active session (instant, event-driven).
  const storePermissions = useSessionRuntime(
    activeSessionId,
    (runtime) => runtime.permissions,
  );

  // 2. Subtree-scoped source of truth (this session + its subagents).
  const { data: sessionPermissions = [] } = useSessionPermissions(
    undefined,
    activeSessionId ?? '',
    { refetchInterval: isAnySessionRunning ? 1500 : false },
  );

  const { mutateAsync: reply, isPending: isPendingReply } =
    useReplyToPermission(undefined);

  // 3. A subagent's request is in both its own and its parent's subtree, so
  //    both feeds render the same request from their respective lists.
  const pool = useMemo(() => {
    const byId = new Map<string, NormalizedPermission>();

    for (const entry of sessionPermissions) {
      const normalized = normalizePermission(entry);
      byId.set(normalized.id, normalized);
    }

    for (const entry of storePermissions) {
      const normalized = normalizePermission(entry);
      byId.set(normalized.id, normalized);
    }

    return Array.from(byId.values());
  }, [sessionPermissions, storePermissions]);

  const currentPermissionRequest = pool.at(-1) ?? null;

  // Prevent flicker by retaining the request reference during exit animations
  const cachedPermissionRef = useRef(currentPermissionRequest);
  if (currentPermissionRequest) {
    cachedPermissionRef.current = currentPermissionRequest;
  }

  const permissionRequest = isExiting
    ? cachedPermissionRef.current
    : currentPermissionRequest;

  // 4. Find the matching tool call across ALL sessions (the request may
  //    belong to a subagent whose turn lives in a different runtime).
  const targetToolCall = useChatStore((state) => {
    const request = currentPermissionRequest;
    if (!request) return null;

    const callID = request.tool?.callID ?? request.id;

    for (const runtime of Object.values(state.sessions)) {
      for (
        let turnIndex = runtime.turns.length - 1;
        turnIndex >= 0;
        turnIndex--
      ) {
        const parts = runtime.turns[turnIndex].parts;

        for (let partIndex = parts.length - 1; partIndex >= 0; partIndex--) {
          const part = parts[partIndex];

          if (
            part.type === 'tool' &&
            (part.callID === callID || part.id === callID)
          ) {
            return part;
          }
        }
      }
    }

    return null;
  });

  const removePermissionEverywhere = useChatStore(
    (s) => s.removePermissionEverywhere,
  );

  const handleReply = (replyValue: 'once' | 'always' | 'reject') => {
    if (isPendingReply || !permissionRequest || isExiting) {
      return;
    }

    const isReject = replyValue === 'reject';
    const requestId = permissionRequest.id;
    const sessionId = permissionRequest.sessionId || activeSessionId || '';

    if (inFlightPermissions.has(requestId)) return;
    inFlightPermissions.add(requestId);

    void execute({
      action: async () => {
        try {
          await reply({
            sessionId,
            requestId,
            reply: replyValue,
          });

          // Clear it from every session runtime and every cached subtree
          // list so the parent and subagent views update together.
          removePermissionEverywhere(requestId);
          purgePermissionRequest(queryClient, requestId);
        } finally {
          inFlightPermissions.delete(requestId);
        }
      },
      messages: {
        loading: isReject
          ? t.permission.rejectingRequest
          : t.permission.authorizingRequest,
        success: isReject
          ? t.permission.permissionDenied
          : t.permission.permissionGranted,
      },
    });
  };

  useKeyPress(
    'Escape',
    () => {
      if (!permissionRequest || isPendingReply || isExiting) return;
      handleReply('reject');
    },
    { stopPropagation: false },
  );

  useKeyPress(
    'Enter',
    () => {
      if (!permissionRequest || isPendingReply || isExiting) return;
      handleReply('always');
    },
    {
      modifiers: { mod: true },
      preventDefault: false,
      stopPropagation: false,
    },
  );

  useKeyPress(
    'Enter',
    () => {
      if (!permissionRequest || isPendingReply || isExiting) return;
      handleReply('once');
    },
    {
      modifiers: { mod: false, ctrl: false, meta: false },
      preventDefault: false,
      stopPropagation: false,
    },
  );

  const shouldRender = Boolean(permissionRequest);

  if (!shouldRender && !isExiting) {
    return null;
  }

  // Process Tool Inputs across categories
  const rawToolName =
    targetToolCall?.toolName ?? permissionRequest?.permission ?? 'action';
  const toolName = rawToolName.toLowerCase();
  const input = targetToolCall?.input ?? {};

  let actionTitle = rawToolName;
  let codeSnippet: string | null = null;

  if (
    ['bash', 'shell', 'cmd', 'terminal'].includes(toolName as BashToolNames)
  ) {
    const command = typeof input.command === 'string' ? input.command : '';
    actionTitle = command ? `Run ${command}` : t.permission.runCommand;
    codeSnippet = command || null;
  } else if (
    ['read', 'view', 'file_read', 'cat'].includes(toolName as ReadToolNames)
  ) {
    const filePath = normalizePath(
      typeof input.filePath === 'string' ? input.filePath : '',
    );
    actionTitle = filePath ? `Read ${filePath}` : t.permission.readFile;
    codeSnippet = filePath || null;
  } else if (
    [
      'edit',
      'multiedit',
      'str_replace',
      'str_replace_based_edit_tool',
    ].includes(toolName as EditToolNames)
  ) {
    const filePath = normalizePath(
      typeof input.filePath === 'string' ? input.filePath : '',
    );
    actionTitle = filePath ? `Edit ${filePath}` : t.permission.editFile;
    codeSnippet =
      typeof input.newString === 'string' ? input.newString : filePath || null;
  } else if (
    ['write', 'create', 'file_write'].includes(toolName as WriteToolNames)
  ) {
    const filePath = normalizePath(
      typeof input.filePath === 'string' ? input.filePath : '',
    );
    actionTitle = filePath ? `Write ${filePath}` : t.permission.writeFile;
    codeSnippet =
      typeof input.content === 'string' ? input.content : filePath || null;
  } else {
    codeSnippet =
      typeof input.command === 'string'
        ? input.command
        : typeof input.filePath === 'string'
          ? input.filePath
          : Object.keys(input).length > 0
            ? JSON.stringify(input, null, 2)
            : null;
  }

  return (
    <div
      className={`@container mx-auto grid w-full px-3 transition-[grid-template-rows,opacity] duration-200 ease-in-out ${
        isExiting
          ? 'grid-rows-[0fr] opacity-0'
          : 'animate-in fade-in slide-in-from-bottom-2 grid-rows-[1fr] opacity-100 duration-200'
      }`}
    >
      <div className='overflow-hidden pb-3'>
        <div className='bg-surface text-surface-foreground border-separator flex flex-col gap-3 rounded-xl border p-4'>
          {/* Permission Header */}
          <div className='text-foreground text-sm leading-5 font-medium line-clamp-3'>
            {t.permission.allowAgentTo(actionTitle)}
          </div>

          {/* Code Snippet Box */}
          {codeSnippet && (
            <div className='bg-default/50 border-separator max-h-40 overflow-auto rounded-lg border p-2.5 font-mono text-xs break-all whitespace-pre-wrap'>
              <code>{codeSnippet}</code>
            </div>
          )}

          {/* Shortcut Action Buttons */}
          <div className='flex flex-wrap items-center justify-end gap-2 pt-1 @max-md:justify-start'>
            {/* Deny Button */}
            <Button
              variant='outline'
              size='sm'
              isDisabled={isPendingReply || isExiting}
              onPress={() => handleReply('reject')}
              className='flex items-center gap-1 rounded-lg pr-0.75 pl-2'
            >
              {t.permission.deny}
              <Kbd variant='light' className='rounded-md text-xs'>
                <Kbd.Content>Esc</Kbd.Content>
              </Kbd>
            </Button>

            {/* Always Allow Button */}
            <Button
              variant='outline'
              size='sm'
              isDisabled={isPendingReply || isExiting}
              onPress={() => handleReply('always')}
              className='flex items-center gap-1 rounded-lg pr-0.75 pl-2'
            >
              {t.permission.alwaysAllowForSession}
              <Kbd variant='light' className='rounded-md text-xs'>
                <Kbd.Abbr keyValue='command' />
                <Kbd.Abbr keyValue='enter' className='text-sm' />
              </Kbd>
            </Button>

            {/* Allow Once Button */}
            <Button
              size='sm'
              variant='outline'
              isDisabled={isPendingReply || isExiting}
              onPress={() => handleReply('once')}
              className='flex items-center gap-1 rounded-lg pr-0.75 pl-2'
            >
              {t.permission.allowOnce}
              <Kbd variant='light' className='rounded-md text-xs'>
                <Kbd.Abbr keyValue='enter' className='text-sm' />
              </Kbd>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});
