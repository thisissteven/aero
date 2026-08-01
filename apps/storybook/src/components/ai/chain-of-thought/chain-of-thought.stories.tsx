import type { Meta, StoryObj } from '@storybook/react';
import { type ReactNode, useState } from 'react';

import { Icon } from '@/icon';

import { ChainOfThought } from './index';

const meta = {
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/AI/ChainOfThought',
} satisfies Meta;

export default meta;
type Story = StoryObj<any>;

function CollapsibleStep({
  children,
  defaultOpen = true,
  icon,
  title,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
  title: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <ChainOfThought.Step
      label={
        <button
          aria-expanded={open}
          className='hover:text-foreground inline-flex cursor-[var(--cursor-interactive)] items-center gap-2 text-left transition-colors'
          type='button'
          onClick={() => setOpen((value) => !value)}
        >
          <Icon
            className={`size-3 transition-transform ${open ? '' : '-rotate-90'}`}
            icon='lucide:chevron-down'
          />
          {icon ? <span>{icon}</span> : null}
          <span>{title}</span>
        </button>
      }
    >
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-150 ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
        style={{ transitionTimingFunction: 'var(--ease-out-quad)' }}
      >
        <div className='overflow-hidden'>{children}</div>
      </div>
    </ChainOfThought.Step>
  );
}

function TraceSection({
  children,
  defaultExpanded = true,
  isStreaming = false,
  title,
}: {
  children: ReactNode;
  defaultExpanded?: boolean;
  isStreaming?: boolean;
  title: string;
}) {
  return (
    <ChainOfThought defaultExpanded={defaultExpanded} isStreaming={isStreaming}>
      <ChainOfThought.Trigger>{title}</ChainOfThought.Trigger>
      <ChainOfThought.Content>
        <ChainOfThought.Steps className='gap-2'>
          {children}
        </ChainOfThought.Steps>
      </ChainOfThought.Content>
    </ChainOfThought>
  );
}

function ReadFile({ children }: { children: ReactNode }) {
  return (
    <div className='text-muted flex items-center gap-2'>
      <Icon className='size-3.5' icon='lucide:file-code-2' />
      <span>{children}</span>
    </div>
  );
}

function AgentTraceDemo({ isStreaming = false }: { isStreaming?: boolean }) {
  return (
    <div className='flex w-[420px] flex-col gap-2'>
      <TraceSection isStreaming={isStreaming} title='Thought for 2s'>
        <ChainOfThought.Step>
          <p>
            The user wants a simple login page. This is a straightforward UI
            task - I should create a clean login form. Let me generate some
            design inspiration first to ensure it looks good, then build the
            page.
          </p>
        </ChainOfThought.Step>
      </TraceSection>

      <TraceSection isStreaming={isStreaming} title='Generated design'>
        <ChainOfThought.Step>
          <img
            alt='Generated area chart design'
            className='border-default bg-surface w-full max-w-sm rounded-xl border'
            src='/assets/docs/charts/light-area-chart.png'
          />
        </ChainOfThought.Step>
      </TraceSection>

      <TraceSection isStreaming={isStreaming} title='Explore • 2 Files'>
        <CollapsibleStep title='Read layout'>
          <ChainOfThought.Steps className='gap-2'>
            <ChainOfThought.Step>
              <ReadFile>Read app/layout.tsx</ReadFile>
            </ChainOfThought.Step>
          </ChainOfThought.Steps>
        </CollapsibleStep>
        <CollapsibleStep title='Read globals'>
          <ChainOfThought.Steps className='gap-2'>
            <ChainOfThought.Step>
              <ReadFile>Read app/globals.css</ReadFile>
            </ChainOfThought.Step>
          </ChainOfThought.Steps>
        </CollapsibleStep>
      </TraceSection>

      <TraceSection isStreaming={isStreaming} title='Found UI components'>
        <ChainOfThought.Step>
          <p>Now let me check the existing UI components available:</p>
        </ChainOfThought.Step>
        <ChainOfThought.Step>
          <p className='text-muted'>Scanning 56 files</p>
        </ChainOfThought.Step>
      </TraceSection>

      <TraceSection isStreaming={isStreaming} title='Explore • 4 Files'>
        <ChainOfThought.Step>
          <p>
            I have all the components I need. Let me read the button, input,
            card, and label components to understand their APIs:
          </p>
        </ChainOfThought.Step>
        {[
          ['button', 'Read components/ui/button.tsx'],
          ['input', 'Read components/ui/input.tsx'],
          ['card', 'Read components/ui/card.tsx'],
          ['label', 'Read components/ui/label.tsx'],
        ].map(([name, file]) => (
          <CollapsibleStep key={name} title={`Read ${name}`}>
            <ChainOfThought.Steps className='gap-2'>
              <ChainOfThought.Step>
                <ReadFile>{file}</ReadFile>
              </ChainOfThought.Step>
            </ChainOfThought.Steps>
          </CollapsibleStep>
        ))}
      </TraceSection>

      <TraceSection isStreaming={isStreaming} title='Updated layout'>
        <ChainOfThought.Step>
          <p>
            Now I have all the information I need. Let me create a clean, simple
            login page using the existing design system components:
          </p>
        </ChainOfThought.Step>
        <CollapsibleStep title='login-form.tsx'>
          <ChainOfThought.Steps className='gap-2'>
            <ChainOfThought.Step>
              <ReadFile>Updated components/login-form.tsx</ReadFile>
            </ChainOfThought.Step>
          </ChainOfThought.Steps>
        </CollapsibleStep>
        <CollapsibleStep title='layout.tsx'>
          <ChainOfThought.Steps className='gap-2'>
            <ChainOfThought.Step>
              <ReadFile>Updated app/layout.tsx</ReadFile>
            </ChainOfThought.Step>
          </ChainOfThought.Steps>
        </CollapsibleStep>
      </TraceSection>
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <div className='w-full max-w-[640px]'>
      <ChainOfThought defaultExpanded={false}>
        <ChainOfThought.Trigger>Thought for 4 seconds</ChainOfThought.Trigger>
        <ChainOfThought.Content>
          <ChainOfThought.Steps>
            <ChainOfThought.Step label='Search'>
              Looked up Namespace UIKit chat template patterns for message
              layout and composer spacing.
            </ChainOfThought.Step>
            <ChainOfThought.Step label='Plan'>
              Mapped the template structure to SDK-agnostic compound components.
            </ChainOfThought.Step>
          </ChainOfThought.Steps>
        </ChainOfThought.Content>
      </ChainOfThought>
    </div>
  ),
};

export const Streaming: Story = {
  render: () => (
    <div className='w-full max-w-[640px]'>
      <ChainOfThought isExpanded isStreaming>
        <ChainOfThought.Trigger>Thinking...</ChainOfThought.Trigger>
        <ChainOfThought.Content>
          <ChainOfThought.Steps>
            <ChainOfThought.Step label='Analyze'>
              Breaking the request into presentation-only UIKit components.
            </ChainOfThought.Step>
          </ChainOfThought.Steps>
        </ChainOfThought.Content>
      </ChainOfThought>
    </div>
  ),
};

export const AgentTrace: Story = {
  name: 'Agent Trace',
  render: () => <AgentTraceDemo />,
};

export const AgentTraceStreaming: Story = {
  name: 'Agent Trace Streaming',
  render: () => <AgentTraceDemo isStreaming />,
};
