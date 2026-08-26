import { File, Folder, Microphone, Picture, Plus } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import { cn, PromptInput, TextShimmer, toast } from '@aero/ui';

import { CollapsibleActions } from '@/app/components/collapsible-actions';
import { useCreateSession } from '@/app/hooks/api/sessions';
import { useIsMounted } from '@/app/hooks/useIsMounted';
import { useKeyPress } from '@/app/hooks/useKeyPress';
import { useWindowSize } from '@/app/hooks/useWindowSize';

export function NewChatPage() {
  const [value, setValue] = useState('');
  const isMounted = useIsMounted();

  const navigate = useNavigate();

  const { mutate: createSession, isPending } = useCreateSession();

  const handleSubmit = (text: string) =>
    createSession(
      {
        parts: [
          {
            type: 'text',
            text,
          },
        ],
      },
      {
        onSuccess: (session) =>
          navigate({
            to: `/sessions/${session.id}`,
          }),
        onError: () => toast.danger('Failed to create session'),
      },
    );

  const isMobile = useWindowSize((size) => size.width < 768);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useKeyPress(
    'i',
    () => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    },
    {
      modifiers: { mod: true },
    },
  );

  useEffect(() => {
    if (textareaRef.current && !isMobile) {
      textareaRef.current.focus();
    }
  }, [isMobile]);

  return (
    <div
      className={cn(
        'relative flex h-[calc(100svh-var(--chat-navbar-height,64px))] flex-col justify-center overflow-hidden',
        'motion-safe:transition motion-safe:duration-200 motion-safe:ease-in',
        isMounted ? 'blur-0 opacity-100' : 'opacity-0 blur-sm',
      )}
    >
      <div className='mx-auto flex min-h-[520px] w-full max-w-[920px] flex-col items-center justify-center gap-6 px-4'>
        <div className='flex flex-col items-center gap-2 text-center'>
          <h2 className='text-foreground text-3xl font-normal tracking-tight'>
            Build something useful with{' '}
            <TextShimmer className='shimmer-accent font-medium tracking-normal'>
              Aero
            </TextShimmer>
          </h2>
          <p className='text-muted text-sm'>
            Start with a prompt, add files, or pick a suggestion to shape the
            first response.
          </p>
        </div>

        <PromptInput
          className='w-full max-w-[780px]'
          value={value}
          onValueChange={setValue}
          onSubmit={() => handleSubmit(value)}
          isDisabled={isPending}
        >
          <PromptInput.Shell className='shadow'>
            <PromptInput.Content>
              <PromptInput.TextArea
                ref={textareaRef}
                className='min-h-18'
                placeholder='@ for files/agents; / for commands and skills; ! for shell; # for snippets'
              />
            </PromptInput.Content>
            <PromptInput.Toolbar>
              <PromptInput.ToolbarStart className='items-end justify-start'>
                <CollapsibleActions
                  expandBehavior='horizontal'
                  expandOrigin='trigger-right'
                  gap={isMobile ? 44 : 40}
                  distance={isMobile ? 44 : 40}
                >
                  <CollapsibleActions.Trigger>
                    <PromptInput.Action aria-label='Add context'>
                      <Icon aria-hidden data={Plus} />
                    </PromptInput.Action>
                  </CollapsibleActions.Trigger>
                  <CollapsibleActions.Contents>
                    <PromptInput.Action aria-label='Attach Files'>
                      <Icon aria-hidden data={File} />
                    </PromptInput.Action>
                    <PromptInput.Action aria-label='Attach Images'>
                      <Icon aria-hidden data={Picture} />
                    </PromptInput.Action>
                    <PromptInput.Action aria-label='Attach Folders'>
                      <Icon aria-hidden data={Folder} />
                    </PromptInput.Action>
                  </CollapsibleActions.Contents>
                </CollapsibleActions>
              </PromptInput.ToolbarStart>
              <PromptInput.ToolbarEnd>
                <PromptInput.Action aria-label='Use voice'>
                  <Icon aria-hidden data={Microphone} />
                </PromptInput.Action>
                <PromptInput.Send />
              </PromptInput.ToolbarEnd>
            </PromptInput.Toolbar>
          </PromptInput.Shell>
        </PromptInput>
      </div>
    </div>
  );
}
