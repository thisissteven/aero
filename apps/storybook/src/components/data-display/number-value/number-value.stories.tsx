import type { Meta, StoryObj } from '@storybook/react';

import { NumberValue } from './index';

const meta = {
  component: NumberValue,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Data Display/NumberValue',
} satisfies Meta<typeof NumberValue>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Currency: Story = {
  render: () => (
    <div className='flex flex-col gap-3 rounded-2xl p-6'>
      {[
        { currency: 'USD', maximumFractionDigits: undefined },
        { currency: 'EUR', maximumFractionDigits: undefined },
        { currency: 'JPY', maximumFractionDigits: 0 },
        { currency: 'GBP', maximumFractionDigits: undefined },
      ].map((item) => (
        <div className='flex items-baseline gap-4' key={item.currency}>
          <span className='text-muted w-12 text-xs'>{item.currency}</span>
          <NumberValue
            className='text-foreground text-2xl font-semibold'
            currency={item.currency}
            maximumFractionDigits={item.maximumFractionDigits}
            style='currency'
            value={228441}
          />
        </div>
      ))}
    </div>
  ),
};

export const Percent: Story = {
  render: () => (
    <div className='flex flex-col gap-3 rounded-2xl p-6'>
      <NumberValue
        className='text-foreground text-2xl font-semibold'
        maximumFractionDigits={1}
        style='percent'
        value={0.033}
      />
      <NumberValue
        className='text-foreground text-2xl font-semibold'
        maximumFractionDigits={1}
        style='percent'
        value={0.985}
      />
      <NumberValue
        className='text-foreground text-2xl font-semibold'
        signDisplay='exceptZero'
        style='percent'
        value={-0.021}
      />
    </div>
  ),
};

export const Compact: Story = {
  render: () => (
    <div className='flex flex-col gap-3 rounded-2xl p-6'>
      {[
        { label: '1,234', value: 1234 },
        { label: '45,678', value: 45678 },
        { label: '1,234,567', value: 1234567 },
        { label: '9,876,543,210', value: 9876543210 },
      ].map((item) => (
        <div className='flex items-baseline gap-4' key={item.value}>
          <span className='text-muted w-20 text-xs'>{item.label}</span>
          <NumberValue
            className='text-foreground text-2xl font-semibold'
            notation='compact'
            value={item.value}
          />
        </div>
      ))}
    </div>
  ),
};

export const SignDisplay: Story = {
  render: () => (
    <div className='flex flex-col gap-3 rounded-2xl p-6'>
      {(['auto', 'always', 'exceptZero', 'never'] as const).map(
        (signDisplay) => (
          <div className='flex items-baseline gap-4' key={signDisplay}>
            <span className='text-muted w-24 text-xs'>{signDisplay}</span>
            <div className='flex gap-4'>
              {[42, 0, -42].map((value) => (
                <NumberValue
                  className='text-foreground font-semibold'
                  key={value}
                  signDisplay={signDisplay}
                  value={value}
                />
              ))}
            </div>
          </div>
        ),
      )}
    </div>
  ),
};

export const WithPrefixSuffix: Story = {
  render: () => (
    <div className='flex flex-col gap-4 rounded-2xl p-6'>
      <NumberValue
        className='text-foreground text-2xl font-semibold'
        maximumFractionDigits={0}
        value={228441}
      >
        <NumberValue.Suffix>
          <span className='text-muted ml-1 text-sm font-normal'>revenue</span>
        </NumberValue.Suffix>
      </NumberValue>
      <NumberValue
        className='text-foreground text-2xl font-semibold'
        notation='compact'
        value={1234567}
      >
        <NumberValue.Suffix>
          <span className='text-muted ml-1 text-sm font-normal'>users</span>
        </NumberValue.Suffix>
      </NumberValue>
      <NumberValue
        className='text-foreground text-2xl font-semibold'
        currency='USD'
        style='currency'
        value={99.99}
      >
        <NumberValue.Suffix>
          <span className='text-muted ml-1 text-sm font-normal'>/month</span>
        </NumberValue.Suffix>
      </NumberValue>
    </div>
  ),
};

export const TabularNums: Story = {
  render: () => (
    <div className='flex flex-col items-end gap-1 rounded-2xl p-6'>
      {[228441, 71887, 156540, 1234, 98234].map((value) => (
        <NumberValue
          className='text-foreground text-xl font-semibold'
          currency='USD'
          key={value}
          style='currency'
          value={value}
        />
      ))}
    </div>
  ),
};

export const FormatOptions: Story = {
  render: () => (
    <div className='flex flex-col gap-3 rounded-2xl p-6'>
      <div className='flex items-baseline gap-4'>
        <span className='text-muted w-32 text-xs'>Compact currency</span>
        <NumberValue
          className='text-foreground text-2xl font-semibold'
          formatOptions={{
            currency: 'USD',
            maximumFractionDigits: 1,
            notation: 'compact',
            style: 'currency',
          }}
          value={1234567}
        />
      </div>
      <div className='flex items-baseline gap-4'>
        <span className='text-muted w-32 text-xs'>Accounting</span>
        <NumberValue
          className='text-foreground text-2xl font-semibold'
          formatOptions={{
            currency: 'USD',
            currencySign: 'accounting',
            style: 'currency',
          }}
          value={-1234.56}
        />
      </div>
    </div>
  ),
};
