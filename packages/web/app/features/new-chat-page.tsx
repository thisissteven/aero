import {
  Database,
  Microphone,
  MusicNote,
  Paintbrush,
  Plus,
  Text,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import {
  cn,
  PromptInput,
  PromptSuggestion,
  TextShimmer,
  toast,
} from '@aero/ui';

import { useCreateSession } from '@/app/hooks/api/sessions';
import { useIsMounted } from '@/app/hooks/useIsMounted';

const suggestionItems = [
  { icon: Paintbrush, label: 'Design a launch page' },
  { icon: Text, label: 'Summarize meeting notes' },
  { icon: MusicNote, label: 'Generate a sound brief' },
  { icon: Database, label: 'Plan a data model' },
];

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
                className='min-h-19'
                placeholder='Describe an app, workflow, or interface...'
              />
            </PromptInput.Content>
            <PromptInput.Toolbar>
              <PromptInput.ToolbarStart>
                <PromptInput.Action aria-label='Use voice' tooltip='Use voice'>
                  <Icon aria-hidden data={Microphone} />
                </PromptInput.Action>
                <PromptInput.Action
                  aria-label='Add context'
                  tooltip='Add context'
                >
                  <Icon aria-hidden data={Plus} />
                </PromptInput.Action>
              </PromptInput.ToolbarStart>
              <PromptInput.ToolbarEnd>
                <PromptInput.Send />
              </PromptInput.ToolbarEnd>
            </PromptInput.Toolbar>
          </PromptInput.Shell>
        </PromptInput>

        <PromptSuggestion className='w-full max-w-[560px]'>
          <PromptSuggestion.Items className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
            {suggestionItems.map((suggestion) => (
              <PromptSuggestion.Item
                key={suggestion.label}
                className='bg-primary items-center justify-start'
                showEndIcon={false}
                onPress={() => handleSubmit(suggestion.label)}
                isDisabled={isPending}
              >
                <span className='inline-flex min-w-0 items-center gap-2'>
                  <Icon data={suggestion.icon} />
                  <span className='truncate'>{suggestion.label}</span>
                </span>
              </PromptSuggestion.Item>
            ))}
          </PromptSuggestion.Items>
        </PromptSuggestion>
      </div>
    </div>
  );
}
