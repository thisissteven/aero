import type { Meta, StoryObj } from '@storybook/react';

import { CodeBlock } from './index';

const code = `function greet(name: string) {
  return \`Hello, \${name}!\`;
}

console.log(greet("Namespace"));`;
const meta = {
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/AI/CodeBlock',
} satisfies Meta;
export default meta;
type Story = StoryObj<any>;
export const Default: Story = {
  render: () => (
    <div className='w-[480px]'>
      <CodeBlock>
        <CodeBlock.Header>
          <span className='text-muted text-xs uppercase'>typescript</span>
          <CodeBlock.CopyButton code={code} />
        </CodeBlock.Header>
        <CodeBlock.Code code={code} language='typescript' />
      </CodeBlock>
    </div>
  ),
};
