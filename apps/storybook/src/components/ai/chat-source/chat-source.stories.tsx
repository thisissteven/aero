import type { Meta, StoryObj } from '@storybook/react';

import { ChatMessage, ChatSource, ChatSources } from './index';
const favicon = (url: string) =>
  `/assets/favicons/${new URL(url).hostname.replaceAll('.', '-')}.png`;
const Assistant = ({ children }: { children: React.ReactNode }) => (
  <ChatMessage.Assistant>
    <ChatMessage.Avatar show alt='Assistant' fallback='AI' />
    <ChatMessage.Body>{children}</ChatMessage.Body>
  </ChatMessage.Assistant>
);
const meta = {
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/AI/ChatSource',
} satisfies Meta;
export default meta;
type Story = StoryObj<any>;
export const Default: Story = {
  render: () => (
    <Assistant>
      <ChatMessage.Content>
        Here is an answer backed by a single web source.
      </ChatMessage.Content>
      <ChatSource
        description='Aero ships presentation-only AI chat compounds for React.'
        faviconUrl={favicon('https://aero.ui')}
        href='https://aero.ui'
        title='Aero'
      />
    </Assistant>
  ),
};
export const Document: Story = {
  render: () => (
    <Assistant>
      <ChatMessage.Content>
        Referenced an uploaded document.
      </ChatMessage.Content>
      <ChatSource sourceType='document' title='Q3-launch-brief.pdf' />
    </Assistant>
  ),
};
export const Grouped: Story = {
  render: () => (
    <Assistant>
      <ChatMessage.Content>
        Answer synthesized from multiple sources.
      </ChatMessage.Content>
      <ChatSources defaultExpanded={false}>
        <ChatSources.Trigger>3 sources</ChatSources.Trigger>
        <ChatSources.Content>
          <ChatSources.List>
            <ChatSource
              faviconUrl={favicon('https://aero.ui')}
              href='https://aero.ui'
              title='Aero'
            />
            <ChatSource
              description='Tailwind Variants powers slot-based styling in UIKit components.'
              faviconUrl={favicon('https://tailwind-variants.org')}
              href='https://tailwind-variants.org'
              title='Tailwind Variants'
            />
            <ChatSource sourceType='document' title='design-system-audit.pdf' />
          </ChatSources.List>
        </ChatSources.Content>
      </ChatSources>
    </Assistant>
  ),
};
export const Composable: Story = {
  render: () => (
    <Assistant>
      <ChatMessage.Content>
        React&apos;s documentation has a clear explanation of component
        composition and state-driven rendering. The source chip below uses
        custom trigger content with a fetched favicon.
      </ChatMessage.Content>
      <ChatSource enablePreview href='https://react.dev'>
        <ChatSource.Trigger>
          <ChatSource.Icon faviconUrl={favicon('https://react.dev')} />
          <ChatSource.Title>React docs</ChatSource.Title>
        </ChatSource.Trigger>
        <ChatSource.Preview>
          <div className='flex max-w-72 flex-col gap-2'>
            <div className='flex items-center gap-2'>
              <ChatSource.Icon faviconUrl={favicon('https://react.dev')} />
              <span className='text-foreground text-sm font-medium'>
                react.dev
              </span>
            </div>
            <p className='text-muted text-sm'>
              Official React documentation for learning modern React patterns.
            </p>
          </div>
        </ChatSource.Preview>
      </ChatSource>
    </Assistant>
  ),
};
export const StackedFavicons: Story = {
  name: 'Stacked Favicons',
  render: function Story() {
    const sources = [
      { href: 'https://www.reuters.com', label: 'Reuters' },
      { href: 'https://nypost.com', label: 'New York Post' },
      { href: 'https://www.foxsports.com', label: 'Fox Sports' },
    ];

    return (
      <Assistant>
        <ChatMessage.Content>
          Answer synthesized from multiple sources.
        </ChatMessage.Content>
        <ChatSources defaultExpanded={false}>
          <ChatSources.Trigger>
            <span className='inline-flex -space-x-1.5'>
              {sources.map((source) => (
                <img
                  alt=''
                  className='border-background size-5 rounded-full border object-cover'
                  key={source.href}
                  src={favicon(source.href)}
                />
              ))}
            </span>
            <span>Sources</span>
          </ChatSources.Trigger>
          <ChatSources.Content>
            <ChatSources.List>
              {sources.map((source) => (
                <ChatSource
                  faviconUrl={favicon(source.href)}
                  href={source.href}
                  key={source.href}
                  title={source.label}
                />
              ))}
            </ChatSources.List>
          </ChatSources.Content>
        </ChatSources>
      </Assistant>
    );
  },
};
