import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { UnfoldMoreIcon } from '@aero/ui/icons';
import { HugeiconsIcon } from '@aero/ui/icons';

import { Button } from '@/components/buttons/button';
import { Description } from '@/components/forms/description';
import { FieldError } from '@/components/forms/field-error';
import { Label } from '@/components/forms/label';

import { NativeSelect } from './index';

const meta = {
  component: NativeSelect,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Forms/NativeSelect',
} satisfies Meta<typeof NativeSelect>;
export default meta;
type Story = StoryObj<typeof meta>;

const statuses = [
  ['', 'Select status'],
  ['todo', 'Todo'],
  ['in-progress', 'In Progress'],
  ['done', 'Done'],
  ['cancelled', 'Cancelled'],
];

function StatusOptions() {
  return statuses.map(([value, label]) => (
    <NativeSelect.Option key={value} value={value}>
      {label}
    </NativeSelect.Option>
  ));
}

export const Default: Story = {
  render: () => (
    <div className='w-full max-w-[220px]'>
      <NativeSelect className='w-full'>
        <NativeSelect.Trigger>
          <StatusOptions />
          <NativeSelect.Indicator />
        </NativeSelect.Trigger>
      </NativeSelect>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className='flex flex-wrap items-start gap-6'>
      {(['primary', 'secondary'] as const).map((variant) => (
        <div className='flex w-[220px] flex-col gap-2' key={variant}>
          <span className='text-muted text-xs'>{variant}</span>
          <NativeSelect className='w-full' variant={variant}>
            <NativeSelect.Trigger>
              <StatusOptions />
              <NativeSelect.Indicator />
            </NativeSelect.Trigger>
          </NativeSelect>
        </div>
      ))}
    </div>
  ),
};

export const WithGroups: Story = {
  render: () => (
    <div className='w-[220px]'>
      <NativeSelect>
        <NativeSelect.Trigger>
          <NativeSelect.Option value=''>Select department</NativeSelect.Option>
          {[
            ['Engineering', ['Frontend', 'Backend', 'DevOps']],
            ['Sales', ['Sales Rep', 'Account Manager', 'Sales Director']],
            [
              'Operations',
              ['Customer Support', 'Product Manager', 'Operations Manager'],
            ],
          ].map(([group, options]) => (
            <NativeSelect.OptGroup
              key={group as string}
              label={group as string}
            >
              {(options as string[]).map((option) => (
                <NativeSelect.Option
                  key={option}
                  value={option.toLowerCase().replaceAll(' ', '-')}
                >
                  {option}
                </NativeSelect.Option>
              ))}
            </NativeSelect.OptGroup>
          ))}
          <NativeSelect.Indicator />
        </NativeSelect.Trigger>
      </NativeSelect>
    </div>
  ),
};

function LabeledStatus({ description = false }: { description?: boolean }) {
  return (
    <NativeSelect fullWidth>
      <Label>Status</Label>
      <NativeSelect.Trigger name='status'>
        <StatusOptions />
        <NativeSelect.Indicator />
      </NativeSelect.Trigger>
      {description ? (
        <Description>Choose the current task status</Description>
      ) : null}
    </NativeSelect>
  );
}

export const WithLabel: Story = {
  render: () => (
    <div className='w-[220px]'>
      <LabeledStatus description />
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div className='w-[220px]'>
      <LabeledStatus description />
    </div>
  ),
};

export const DisabledSelect: Story = {
  render: () => (
    <div className='w-[220px]'>
      <NativeSelect fullWidth>
        <Label>Status</Label>
        <NativeSelect.Trigger disabled defaultValue='done' name='status'>
          <StatusOptions />
          <NativeSelect.Indicator />
        </NativeSelect.Trigger>
      </NativeSelect>
    </div>
  ),
};

export const InvalidState: Story = {
  render: () => (
    <div className='w-[220px]'>
      <NativeSelect aria-invalid='true' className='w-full' data-invalid='true'>
        <Label>Status</Label>
        <NativeSelect.Trigger aria-invalid='true' name='status'>
          <StatusOptions />
          <NativeSelect.Indicator />
        </NativeSelect.Trigger>
        <FieldError>Please select a status</FieldError>
      </NativeSelect>
    </div>
  ),
};

export const FullWidth: Story = {
  render: () => (
    <div className='w-[400px] space-y-4'>
      <LabeledStatus />
    </div>
  ),
};

const states = [
  { id: 'california', name: 'California' },
  { id: 'texas', name: 'Texas' },
  { id: 'florida', name: 'Florida' },
  { id: 'new-york', name: 'New York' },
  { id: 'illinois', name: 'Illinois' },
];

export const Controlled: Story = {
  render: function Demo() {
    const [value, setValue] = useState('california');
    return (
      <div className='w-[220px] space-y-2'>
        <NativeSelect fullWidth>
          <Label>State (controlled)</Label>
          <NativeSelect.Trigger
            name='state'
            value={value}
            onChange={(event) => setValue(event.target.value)}
          >
            <NativeSelect.Option value=''>Select a state</NativeSelect.Option>
            {states.map((state) => (
              <NativeSelect.Option key={state.id} value={state.id}>
                {state.name}
              </NativeSelect.Option>
            ))}
            <NativeSelect.Indicator />
          </NativeSelect.Trigger>
        </NativeSelect>
        <p className='text-muted text-sm'>
          Selected: {states.find((state) => state.id === value)?.name || 'None'}
        </p>
      </div>
    );
  },
};

export const WithDisabledOptions: Story = {
  render: () => (
    <div className='w-[220px]'>
      <NativeSelect fullWidth>
        <Label>Animal</Label>
        <NativeSelect.Trigger name='animal'>
          <NativeSelect.Option value=''>Select an animal</NativeSelect.Option>
          <NativeSelect.Option value='dog'>Dog</NativeSelect.Option>
          <NativeSelect.Option disabled value='cat'>
            Cat (unavailable)
          </NativeSelect.Option>
          <NativeSelect.Option value='bird'>Bird</NativeSelect.Option>
          <NativeSelect.Option disabled value='kangaroo'>
            Kangaroo (unavailable)
          </NativeSelect.Option>
          <NativeSelect.Option value='elephant'>Elephant</NativeSelect.Option>
          <NativeSelect.Indicator />
        </NativeSelect.Trigger>
      </NativeSelect>
    </div>
  ),
};

export const CustomIndicator: Story = {
  render: () => (
    <div className='w-[220px]'>
      <NativeSelect fullWidth>
        <Label>Priority</Label>
        <NativeSelect.Trigger name='priority'>
          {['Select priority', 'Low', 'Medium', 'High', 'Critical'].map(
            (label, index) => (
              <NativeSelect.Option
                key={label}
                value={index ? label.toLowerCase() : ''}
              >
                {label}
              </NativeSelect.Option>
            ),
          )}
          <NativeSelect.Indicator>
            <HugeiconsIcon icon={UnfoldMoreIcon} />
          </NativeSelect.Indicator>
        </NativeSelect.Trigger>
      </NativeSelect>
    </div>
  ),
};

export const FormExample: Story = {
  render: function Demo() {
    const [result, setResult] = useState<Record<string, string> | null>(null);
    return (
      <form
        className='flex w-[300px] flex-col gap-4'
        onSubmit={(event) => {
          event.preventDefault();
          const data: Record<string, string> = {};
          new FormData(event.currentTarget).forEach((value, key) => {
            data[key] = value.toString();
          });
          setResult(data);
        }}
      >
        <NativeSelect fullWidth>
          <Label>Country</Label>
          <NativeSelect.Trigger required name='country'>
            <NativeSelect.Option value=''>Select a country</NativeSelect.Option>
            <NativeSelect.OptGroup label='North America'>
              <NativeSelect.Option value='us'>
                United States
              </NativeSelect.Option>
              <NativeSelect.Option value='ca'>Canada</NativeSelect.Option>
              <NativeSelect.Option value='mx'>Mexico</NativeSelect.Option>
            </NativeSelect.OptGroup>
            <NativeSelect.OptGroup label='Europe'>
              <NativeSelect.Option value='uk'>
                United Kingdom
              </NativeSelect.Option>
              <NativeSelect.Option value='fr'>France</NativeSelect.Option>
              <NativeSelect.Option value='de'>Germany</NativeSelect.Option>
            </NativeSelect.OptGroup>
            <NativeSelect.Indicator />
          </NativeSelect.Trigger>
        </NativeSelect>
        <NativeSelect fullWidth>
          <Label>Role</Label>
          <NativeSelect.Trigger required name='role'>
            <NativeSelect.Option value=''>Select a role</NativeSelect.Option>
            <NativeSelect.Option value='admin'>Admin</NativeSelect.Option>
            <NativeSelect.Option value='editor'>Editor</NativeSelect.Option>
            <NativeSelect.Option value='viewer'>Viewer</NativeSelect.Option>
            <NativeSelect.Indicator />
          </NativeSelect.Trigger>
          <Description>Choose the user's permission level</Description>
        </NativeSelect>
        <Button size='lg' type='submit'>
          Submit
        </Button>
        {result ? (
          <pre className='text-muted bg-surface rounded-lg p-3 text-xs'>
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : null}
      </form>
    );
  },
};
