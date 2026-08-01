import type { Meta, StoryObj } from '@storybook/react';

import { ChatMessage, ChatTool, ChatToolGroup } from './index';
const meta = {
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/AI/ChatTool',
} satisfies Meta;
export default meta;
type Story = StoryObj<any>;
const Assistant = ({ children }: { children: React.ReactNode }) => (
  <ChatMessage.Assistant>
    <ChatMessage.Avatar show alt='Assistant' fallback='AI' />
    <ChatMessage.Body>{children}</ChatMessage.Body>
  </ChatMessage.Assistant>
);
export const Default: Story = {
  render: () => (
    <Assistant>
      <ChatMessage.Content>
        Completed tool call with JSON args and result.
      </ChatMessage.Content>
      <ChatTool
        argsText='{"city":"Paris"}'
        defaultExpanded={false}
        output={{ summary: '18°C, partly cloudy' }}
        state='output-available'
        toolName='getWeather'
        triggerPrefix='Used tool: '
      />
    </Assistant>
  ),
};
export const Streaming: Story = {
  render: () => (
    <Assistant>
      <ChatTool
        defaultExpanded
        argsText='{"query":"Namespace UIKit'
        state='input-streaming'
        toolName='searchDocs'
        triggerPrefix='Running tool: '
      />
    </Assistant>
  ),
};
export const ErrorState: Story = {
  name: 'Error State',
  render: () => (
    <Assistant>
      <ChatTool
        defaultExpanded
        argsText='{"url":"https://example.com"}'
        errorText='Request timed out after 30s'
        state='output-error'
        toolName='fetchPage'
        triggerPrefix='Failed tool: '
      />
    </Assistant>
  ),
};
export const Approval: Story = {
  render: () => (
    <Assistant>
      <ChatTool
        defaultExpanded
        approveLabel='Approve'
        argsText='{"to":"team@acme.com","subject":"Launch update"}'
        rejectLabel='Reject'
        state='requires-action'
        toolName='sendEmail'
        triggerPrefix='Approval needed: '
        onApprove={() => {}}
        onReject={() => {}}
      />
    </Assistant>
  ),
};
export const Composable: Story = {
  render: () => (
    <Assistant>
      <ChatTool
        defaultExpanded={false}
        state='output-available'
        toolName='getWeather'
      >
        <ChatTool.Trigger>
          <ChatTool.StatusIcon />
          Used tool: <strong>getWeather</strong>
        </ChatTool.Trigger>
        <ChatTool.Content>
          <ChatTool.Args input={{ city: 'Paris' }} label='Parameters' />
          <ChatTool.Result
            label='Result'
            value={{ summary: '18°C, partly cloudy' }}
          />
        </ChatTool.Content>
      </ChatTool>
    </Assistant>
  ),
};
export const Grouped: Story = {
  render: () => (
    <Assistant>
      <ChatToolGroup defaultExpanded={false}>
        <ChatToolGroup.Trigger>2 tool calls</ChatToolGroup.Trigger>
        <ChatToolGroup.Content>
          {['searchDocs', 'fetchPage'].map((toolName) => (
            <ChatTool
              defaultExpanded={false}
              key={toolName}
              state='output-available'
              toolName={toolName}
              triggerPrefix='Used tool: '
            />
          ))}
        </ChatToolGroup.Content>
      </ChatToolGroup>
    </Assistant>
  ),
};
