import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Button } from '@aero/ui';

import { Icon } from '@/icon';

import { Stepper } from './index';

const meta = {
  component: Stepper,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Navigation/Stepper',
} satisfies Meta<typeof Stepper>;
export default meta;
type Story = StoryObj<typeof meta>;
const basic = ['Cart', 'Shipping', 'Payment', 'Confirmation'];
const detailed = [
  ['Account', 'Create your account'],
  ['Profile', 'Set up your profile'],
  ['Settings', 'Configure preferences'],
  ['Review', 'Review and confirm'],
] as const;
const icons = ['lucide:user', 'lucide:bell', 'lucide:lock', 'lucide:thumbs-up'];

function steps({
  descriptions = false,
  withIcons = false,
}: {
  descriptions?: boolean;
  withIcons?: boolean;
}) {
  const data = descriptions
    ? detailed
    : basic.map((title) => [title, ''] as const);
  return data.map(([title, description], index) => (
    <Stepper.Step key={title}>
      <Stepper.Indicator>
        {withIcons ? (
          <Stepper.Icon>
            <Icon icon={icons[index]!} />
          </Stepper.Icon>
        ) : null}
      </Stepper.Indicator>
      <Stepper.Content>
        <Stepper.Title>{title}</Stepper.Title>
        {description ? (
          <Stepper.Description>{description}</Stepper.Description>
        ) : null}
      </Stepper.Content>
      <Stepper.Separator />
    </Stepper.Step>
  ));
}
function Demo({
  descriptions = false,
  orientation = 'horizontal',
  size = 'md',
  withIcons = false,
}: {
  descriptions?: boolean;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  withIcons?: boolean;
}) {
  const [step, setStep] = useState(1);
  return (
    <div className={orientation === 'horizontal' ? 'w-[600px]' : 'w-[280px]'}>
      <Stepper
        currentStep={step}
        onStepChange={setStep}
        orientation={orientation}
        size={size}
      >
        {steps({ descriptions, withIcons })}
      </Stepper>
    </div>
  );
}
export const Default: Story = { render: () => <Demo /> };
export const WithDescriptions: Story = { render: () => <Demo descriptions /> };
export const Vertical: Story = {
  render: () => <Demo descriptions orientation='vertical' />,
};
export const WithIcons: Story = {
  render: () => <Demo descriptions withIcons />,
};
export const VerticalWithIcons: Story = {
  render: () => <Demo descriptions orientation='vertical' withIcons />,
};
export const Sizes: Story = {
  render: () => (
    <div className='flex w-[600px] flex-col gap-8'>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Demo key={size} size={size} />
      ))}
    </div>
  ),
};
export const VerticalSizes: Story = {
  render: () => (
    <div className='flex gap-12'>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Demo key={size} orientation='vertical' size={size} />
      ))}
    </div>
  ),
};

function ControlledDemo({
  orientation = 'horizontal',
}: {
  orientation?: 'horizontal' | 'vertical';
}) {
  const [step, setStep] = useState(1);
  return (
    <div className='flex flex-col gap-6'>
      <div className={orientation === 'horizontal' ? 'w-[600px]' : 'w-[280px]'}>
        <Stepper
          currentStep={step}
          onStepChange={setStep}
          orientation={orientation}
        >
          {steps({ descriptions: orientation === 'vertical' })}
        </Stepper>
      </div>
      <div className='flex gap-2'>
        <Button
          isDisabled={step === 0}
          onPress={() => setStep((value) => value - 1)}
          variant='secondary'
        >
          Previous
        </Button>
        <Button
          isDisabled={step === basic.length - 1}
          onPress={() => setStep((value) => value + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
export const Controlled: Story = { render: () => <ControlledDemo /> };
export const ControlledVertical: Story = {
  render: () => <ControlledDemo orientation='vertical' />,
};
function DynamicIconDemo() {
  const [step, setStep] = useState(1);
  return (
    <div className='w-[600px]'>
      <Stepper currentStep={step} onStepChange={setStep}>
        {basic.map((title, index) => (
          <Stepper.Step key={title}>
            <Stepper.Indicator>
              <Stepper.Icon>
                <Icon icon={index < step ? 'lucide:check' : icons[index]!} />
              </Stepper.Icon>
            </Stepper.Indicator>
            <Stepper.Content>
              <Stepper.Title>{title}</Stepper.Title>
            </Stepper.Content>
            <Stepper.Separator />
          </Stepper.Step>
        ))}
      </Stepper>
    </div>
  );
}
export const DynamicIcon: Story = { render: () => <DynamicIconDemo /> };
export const DisplayOnly: Story = {
  render: () => (
    <div className='w-[600px]'>
      <Stepper currentStep={2}>{steps({ descriptions: true })}</Stepper>
    </div>
  ),
};
function BulletDemo() {
  const [step, setStep] = useState(1);
  return (
    <div className='flex flex-col gap-8'>
      <div className='w-[500px]'>
        <Stepper currentStep={step} onStepChange={setStep}>
          {basic.map((title) => (
            <Stepper.Step key={title}>
              <Stepper.Indicator className='size-3 border-0'>
                <Stepper.Icon>
                  <Icon icon='lucide:circle' />
                </Stepper.Icon>
              </Stepper.Indicator>
              <Stepper.Content>
                <Stepper.Title>{title}</Stepper.Title>
              </Stepper.Content>
              <Stepper.Separator />
            </Stepper.Step>
          ))}
        </Stepper>
      </div>
      <div className='w-[280px]'>
        <Stepper
          currentStep={step}
          onStepChange={setStep}
          orientation='vertical'
        >
          {steps({ descriptions: true })}
        </Stepper>
      </div>
    </div>
  );
}
export const BulletSteps: Story = { render: () => <BulletDemo /> };
function CompletedIcon() {
  const { status } = Stepper.useStep();
  return status === 'complete' ? <Icon icon='lucide:circle-check-big' /> : null;
}
export const CustomCompletedIcon: Story = {
  render: () => (
    <div className='w-[600px]'>
      <Stepper currentStep={2}>
        {basic.map((title) => (
          <Stepper.Step key={title}>
            <Stepper.Indicator>
              <Stepper.Icon>
                <CompletedIcon />
              </Stepper.Icon>
            </Stepper.Indicator>
            <Stepper.Content>
              <Stepper.Title>{title}</Stepper.Title>
            </Stepper.Content>
            <Stepper.Separator />
          </Stepper.Step>
        ))}
      </Stepper>
    </div>
  ),
};
function RenderedStep({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  const { status } = Stepper.useStep();
  return (
    <>
      <Stepper.Indicator />
      <Stepper.Content>
        <Stepper.Title>{title}</Stepper.Title>
        <Stepper.Description>
          {status === 'active' ? description : status}
        </Stepper.Description>
      </Stepper.Content>
      <Stepper.Separator />
    </>
  );
}
export const RenderFunction: Story = {
  render: () => (
    <div className='w-[600px]'>
      <Stepper currentStep={1}>
        {detailed.map(([title, description]) => (
          <Stepper.Step key={title}>
            <RenderedStep description={description} title={title} />
          </Stepper.Step>
        ))}
      </Stepper>
    </div>
  ),
};

function Timeline({ kind }: { kind: 'onboarding' | 'package' | 'trial' }) {
  const data =
    kind === 'package'
      ? [
          ['Order placed', 'We received your order'],
          ['Shipped', 'Package left the warehouse'],
          ['In transit', 'Arriving tomorrow'],
          ['Delivered', 'Pending delivery'],
        ]
      : kind === 'trial'
        ? [
            ['Start free trial', 'Today'],
            ['Trial reminder', 'In 10 days'],
            ['Trial ends', 'In 14 days'],
            ['First payment', 'Only if you continue'],
          ]
        : [
            ['Create account', 'Add your details'],
            ['Choose a workspace', 'Invite your team'],
            ['Connect tools', 'Link your workflow'],
            ["You're ready", 'Start building'],
          ];
  return (
    <div className='border-border bg-surface w-[360px] rounded-xl border p-6'>
      <h3 className='mb-5 font-semibold capitalize'>
        {kind === 'package' ? 'Package tracking' : kind}
      </h3>
      <Stepper
        currentStep={kind === 'package' ? 1.5 : 1}
        orientation='vertical'
      >
        {data.map(([title, description]) => (
          <Stepper.Step key={title}>
            <Stepper.Indicator />
            <Stepper.Content>
              <Stepper.Title>{title}</Stepper.Title>
              <Stepper.Description>{description}</Stepper.Description>
            </Stepper.Content>
            <Stepper.Separator />
          </Stepper.Step>
        ))}
      </Stepper>
    </div>
  );
}
export const FreeTrialTimeline: Story = {
  render: () => <Timeline kind='trial' />,
};
export const OnboardingTimeline: Story = {
  render: () => <Timeline kind='onboarding' />,
};
export const CustomColor: Story = {
  render: () => (
    <div className='w-[600px]'>
      <Stepper
        className='[--stepper-active-color:#f97316] [--stepper-complete-color:#f97316] [--stepper-complete-fg:white]'
        currentStep={2}
      >
        {steps({ descriptions: true })}
      </Stepper>
    </div>
  ),
};
export const PackageTracking: Story = {
  render: () => <Timeline kind='package' />,
};
export const CustomColorVertical: Story = {
  render: () => (
    <div className='w-[280px]'>
      <Stepper
        className='[--stepper-active-color:#8b5cf6] [--stepper-complete-color:#8b5cf6] [--stepper-complete-fg:white]'
        currentStep={2}
        orientation='vertical'
      >
        {steps({ descriptions: true, withIcons: true })}
      </Stepper>
    </div>
  ),
};
