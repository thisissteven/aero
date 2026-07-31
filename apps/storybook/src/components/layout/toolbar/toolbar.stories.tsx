import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Button } from '@/components/buttons/button';
import { ButtonGroup } from '@/components/buttons/button-group';
import { ToggleButton } from '@/components/buttons/toggle-button';
import { ToggleButtonGroup } from '@/components/buttons/toggle-button-group';
import { Separator } from '@/components/layout/separator';

import { Icon } from '@/icon';

import { Toolbar } from './index';

const meta: Meta<typeof Toolbar> = {
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
  },
  component: Toolbar,
  parameters: {
    layout: 'centered',
  },
  title: 'Components/Layout/Toolbar',
};

export default meta;

type Story = StoryObj<typeof Toolbar>;

export const Default: Story = {
  render: () => (
    <Toolbar aria-label='Text formatting'>
      <ToggleButtonGroup aria-label='Text style' selectionMode='multiple'>
        <ToggleButton isIconOnly aria-label='Bold' id='bold'>
          <Icon icon='hugeicons:bold' />
        </ToggleButton>
        <ToggleButton isIconOnly aria-label='Italic' id='italic'>
          <ToggleButtonGroup.Separator />
          <Icon icon='hugeicons:italic' />
        </ToggleButton>
        <ToggleButton isIconOnly aria-label='Underline' id='underline'>
          <ToggleButtonGroup.Separator />
          <Icon icon='hugeicons:underline' />
        </ToggleButton>
      </ToggleButtonGroup>
      <Separator />
      <ButtonGroup>
        <Button isIconOnly aria-label='Copy' variant='secondary'>
          <Icon icon='hugeicons:copy' />
        </Button>
        <ButtonGroup.Separator />
        <Button isIconOnly aria-label='Cut' variant='secondary'>
          <Icon icon='hugeicons:scissors' />
        </Button>
      </ButtonGroup>
    </Toolbar>
  ),
};

export const Vertical: Story = {
  render: () => (
    <Toolbar aria-label='Tools' orientation='vertical'>
      <ToggleButtonGroup aria-label='Text style' selectionMode='multiple'>
        <ToggleButton isIconOnly aria-label='Bold' id='bold'>
          <Icon icon='hugeicons:bold' />
        </ToggleButton>
        <ToggleButton isIconOnly aria-label='Italic' id='italic'>
          <ToggleButtonGroup.Separator />
          <Icon icon='hugeicons:italic' />
        </ToggleButton>
        <ToggleButton isIconOnly aria-label='Underline' id='underline'>
          <ToggleButtonGroup.Separator />
          <Icon icon='hugeicons:underline' />
        </ToggleButton>
      </ToggleButtonGroup>
      <Separator />
      <ButtonGroup>
        <Button isIconOnly aria-label='Undo' variant='secondary'>
          <Icon icon='hugeicons:arrow-uturn-ccw-left' />
        </Button>
        <ButtonGroup.Separator />
        <Button isIconOnly aria-label='Redo' variant='secondary'>
          <Icon icon='hugeicons:arrow-uturn-cw-right' />
        </Button>
      </ButtonGroup>
    </Toolbar>
  ),
};

export const WithButtonGroup: Story = {
  render: () => (
    <Toolbar aria-label='Editor toolbar'>
      <ButtonGroup>
        <Button variant='secondary'>
          <Icon icon='hugeicons:arrow-uturn-ccw-left' />
          Undo
        </Button>
        <ButtonGroup.Separator />
        <Button variant='secondary'>
          <Icon icon='hugeicons:arrow-uturn-cw-right' />
          Redo
        </Button>
      </ButtonGroup>
      <Separator />
      <ToggleButtonGroup aria-label='Text style' selectionMode='multiple'>
        <ToggleButton isIconOnly aria-label='Bold' id='bold'>
          <Icon icon='hugeicons:bold' />
        </ToggleButton>
        <ToggleButton isIconOnly aria-label='Italic' id='italic'>
          <ToggleButtonGroup.Separator />
          <Icon icon='hugeicons:italic' />
        </ToggleButton>
        <ToggleButton isIconOnly aria-label='Underline' id='underline'>
          <ToggleButtonGroup.Separator />
          <Icon icon='hugeicons:underline' />
        </ToggleButton>
      </ToggleButtonGroup>
      <Separator />
      <ButtonGroup>
        <Button isIconOnly aria-label='Align left' variant='secondary'>
          <Icon icon='hugeicons:text-align-left' />
        </Button>
        <ButtonGroup.Separator />
        <Button isIconOnly aria-label='Align center' variant='secondary'>
          <Icon icon='hugeicons:text-align-center' />
        </Button>
        <ButtonGroup.Separator />
        <Button isIconOnly aria-label='Align right' variant='secondary'>
          <Icon icon='hugeicons:text-align-right' />
        </Button>
      </ButtonGroup>
    </Toolbar>
  ),
};

export const Attached: Story = {
  render: () => (
    <Toolbar isAttached aria-label='Attached toolbar'>
      <ToggleButtonGroup aria-label='Text style' selectionMode='multiple'>
        <ToggleButton isIconOnly aria-label='Bold' id='bold'>
          <Icon icon='hugeicons:bold' />
        </ToggleButton>
        <ToggleButton isIconOnly aria-label='Italic' id='italic'>
          <ToggleButtonGroup.Separator />
          <Icon icon='hugeicons:italic' />
        </ToggleButton>
        <ToggleButton isIconOnly aria-label='Underline' id='underline'>
          <ToggleButtonGroup.Separator />
          <Icon icon='hugeicons:underline' />
        </ToggleButton>
      </ToggleButtonGroup>
      <Separator />
      <ButtonGroup>
        <Button isIconOnly aria-label='Copy' variant='secondary'>
          <Icon icon='hugeicons:copy' />
        </Button>
        <ButtonGroup.Separator />
        <Button isIconOnly aria-label='Cut' variant='secondary'>
          <Icon icon='hugeicons:scissors' />
        </Button>
      </ButtonGroup>
    </Toolbar>
  ),
};
