import type { Meta, StoryObj } from '@storybook/react';

import { Card, PromptSuggestion } from './index';
const suggestions = [
  'Draft a weekly project update email for my team',
  'Summarize this meeting transcript into action items',
  'Help me plan a product launch checklist',
  'Write a friendly reply to a customer support ticket',
  'Brainstorm names for a developer tools startup',
  'Explain this error message in plain language',
];
const prompts = [
  {
    description: 'Turn rough notes into a clear weekly update.',
    id: 'weekly-update',
    title: 'Weekly project update',
  },
  {
    description: 'Capture decisions, owners, and next steps.',
    id: 'meeting-summary',
    title: 'Meeting summary',
  },
  {
    description: 'Outline milestones, risks, and launch tasks.',
    id: 'launch-plan',
    title: 'Launch planning',
  },
];
const meta = {
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/AI/PromptSuggestion',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  render: () => (
    <div className='mx-auto w-full max-w-[714px]'>
      <PromptSuggestion>
        <PromptSuggestion.Header>
          <PromptSuggestion.Title>
            What do you want to work on?
          </PromptSuggestion.Title>
          <PromptSuggestion.Description>
            Ask a question or start from one of the suggestions below.
          </PromptSuggestion.Description>
        </PromptSuggestion.Header>
        <PromptSuggestion.Items>
          {suggestions.map((value) => (
            <PromptSuggestion.Item key={value}>{value}</PromptSuggestion.Item>
          ))}
        </PromptSuggestion.Items>
      </PromptSuggestion>
    </div>
  ),
};
export const Cards: Story = {
  render: () => (
    <div className='mx-auto w-full max-w-[960px]'>
      <PromptSuggestion variant='card'>
        <PromptSuggestion.Header>
          <PromptSuggestion.Title>
            Starter prompts for everyday work
          </PromptSuggestion.Title>
          <PromptSuggestion.Description>
            Pick one to see what kinds of conversations this template is
            designed for.
          </PromptSuggestion.Description>
        </PromptSuggestion.Header>
        <PromptSuggestion.Group
          description='Planning, updates, and stakeholder communication.'
          label='At work'
        >
          <PromptSuggestion.Items>
            {prompts.map((prompt) => (
              <PromptSuggestion.Item key={prompt.id}>
                <Card.Header>
                  <PromptSuggestion.ItemTitle>
                    {prompt.title}
                  </PromptSuggestion.ItemTitle>
                  <PromptSuggestion.ItemDescription>
                    {prompt.description}
                  </PromptSuggestion.ItemDescription>
                </Card.Header>
              </PromptSuggestion.Item>
            ))}
          </PromptSuggestion.Items>
        </PromptSuggestion.Group>
      </PromptSuggestion>
    </div>
  ),
};
