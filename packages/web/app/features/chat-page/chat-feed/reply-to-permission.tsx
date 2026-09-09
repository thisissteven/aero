import { Kbd } from '@heroui/react';
import { useParams } from '@tanstack/react-router';
import React, { useEffect, useMemo, useRef } from 'react';

import { Button } from '@aero/ui';

import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import {
  useReplyToPermission,
  useSessionPermissions,
} from '@/app/hooks/api/sessions';
import { useAnimatedAction } from '@/app/hooks/useAnimatedAction';
import { normalizePath } from '@/server/shared';

export type EditToolNames =
  'edit' | 'multiedit' | 'str_replace' | 'str_replace_based_edit_tool';
export type WriteToolNames = 'write' | 'create' | 'file_write';
export type ReadToolNames = 'read' | 'view' | 'file_read' | 'cat';
export type BashToolNames = 'bash' | 'shell' | 'cmd' | 'terminal';

export const ReplyToPermission = React.memo(() => {
  const { sessionId: activeSessionId } = useParams({
    strict: false,
  });

  const { isExiting, execute } = useAnimatedAction({ animationDuration: 500 });

  // 1. Get latest permission from chat store
  const storePermission = useChatStore((state) => {
    if (!activeSessionId) {
      return null;
    }

    const runtime = state.sessions[activeSessionId];
    if (!runtime || !runtime.permissions || runtime.permissions.length === 0) {
      return null;
    }

    return runtime.permissions[runtime.permissions.length - 1];
  });

  // 2. Fetch server permissions for sync
  const {
    data: sessionPermissions = [],
    isLoading: isPermissionsLoading,
    refetch: refetchPermissions,
  } = useSessionPermissions(undefined, activeSessionId ?? '');

  const { mutateAsync: reply, isPending: isPendingReply } =
    useReplyToPermission(undefined);

  // 3. Resolve active permission request
  const currentPermissionRequest = useMemo(() => {
    if (storePermission) {
      return storePermission;
    }

    if (sessionPermissions.length > 0) {
      return sessionPermissions[sessionPermissions.length - 1];
    }

    return null;
  }, [storePermission, sessionPermissions]);

  // Prevent flicker by retaining the request reference during exit animations
  const cachedPermissionRef = useRef(currentPermissionRequest);
  if (currentPermissionRequest) {
    cachedPermissionRef.current = currentPermissionRequest;
  }

  const permissionRequest = isExiting
    ? cachedPermissionRef.current
    : currentPermissionRequest;

  // 4. Find matching tool call from store using callID
  const targetToolCall = useChatStore((state) => {
    if (!activeSessionId || !permissionRequest) {
      return null;
    }

    const runtime = state.sessions[activeSessionId];
    if (!runtime || !runtime.turns || runtime.turns.length === 0) {
      return null;
    }

    const callID = permissionRequest?.tool?.callID ?? permissionRequest.id;

    for (
      let turnIndex = runtime.turns.length - 1;
      turnIndex >= 0;
      turnIndex--
    ) {
      const turn = runtime.turns[turnIndex];

      for (let partIndex = turn.parts.length - 1; partIndex >= 0; partIndex--) {
        const part = turn.parts[partIndex];

        if (
          part.type === 'tool' &&
          (part.callID === callID || part.id === callID)
        ) {
          return part;
        }
      }
    }

    return null;
  });

  const handleReply = (replyValue: 'once' | 'always' | 'reject') => {
    if (isPendingReply || !permissionRequest || isExiting) {
      return;
    }

    const isReject = replyValue === 'reject';
    const requestId = permissionRequest.id;

    void execute({
      action: () =>
        reply({
          sessionId: activeSessionId,
          requestId,
          reply: replyValue,
        }),
      refetch: refetchPermissions,
      messages: {
        loading: isReject ? 'Rejecting request...' : 'Authorizing request...',
        success: isReject ? 'Permission denied' : 'Permission granted',
      },
    });
  };

  // Keyboard shortcut handler
  useEffect(() => {
    if (!permissionRequest || isPendingReply || isExiting) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleReply('reject');
      } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleReply('always');
      } else if (event.key === 'Enter') {
        event.preventDefault();
        handleReply('once');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [permissionRequest, isPendingReply, isExiting]);

  const shouldRender =
    Boolean(permissionRequest) &&
    (!isPermissionsLoading || Boolean(storePermission));

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
    actionTitle = command ? `Run ${command}` : 'Run command';
    codeSnippet = command || null;
  } else if (
    ['read', 'view', 'file_read', 'cat'].includes(toolName as ReadToolNames)
  ) {
    const filePath = normalizePath(
      typeof input.filePath === 'string' ? input.filePath : '',
    );
    actionTitle = filePath ? `Read ${filePath}` : 'Read file';
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
    actionTitle = filePath ? `Edit ${filePath}` : 'Edit file';
    codeSnippet =
      typeof input.newString === 'string' ? input.newString : filePath || null;
  } else if (
    ['write', 'create', 'file_write'].includes(toolName as WriteToolNames)
  ) {
    const filePath = normalizePath(
      typeof input.filePath === 'string' ? input.filePath : '',
    );
    actionTitle = filePath ? `Write ${filePath}` : 'Write file';
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
      className={`@container mx-auto grid w-full px-3 transition-[grid-template-rows,opacity] duration-200 ease-in-out md:max-w-[720px] ${
        isExiting
          ? 'grid-rows-[0fr] opacity-0'
          : 'animate-in fade-in slide-in-from-bottom-2 grid-rows-[1fr] opacity-100 duration-200'
      }`}
    >
      <div className='overflow-hidden pb-3'>
        <div className='bg-surface text-surface-foreground border-separator flex flex-col gap-3 rounded-xl border p-4'>
          {/* Permission Header */}
          <div className='text-foreground text-sm leading-5 font-medium'>
            Allow Agent to <span className='font-semibold'>{actionTitle}</span>?
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
              className='flex items-center gap-0 rounded-lg pr-0 pl-2'
            >
              Deny
              <Kbd variant='light'>
                <Kbd.Content>Esc</Kbd.Content>
              </Kbd>
            </Button>

            {/* Always Allow Button */}
            <Button
              variant='outline'
              size='sm'
              isDisabled={isPendingReply || isExiting}
              onPress={() => handleReply('always')}
              className='flex items-center gap-0 rounded-lg pr-0 pl-2'
            >
              Always allow for session
              <Kbd variant='light'>
                <Kbd.Abbr keyValue='command' />
                <Kbd.Abbr keyValue='enter' />
              </Kbd>
            </Button>

            {/* Allow Once Button */}
            <Button
              size='sm'
              variant='outline'
              isDisabled={isPendingReply || isExiting}
              onPress={() => handleReply('once')}
              className='flex items-center gap-0 rounded-lg pr-0 pl-2'
            >
              Allow once
              <Kbd variant='light'>
                <Kbd.Abbr keyValue='enter' />
              </Kbd>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});
