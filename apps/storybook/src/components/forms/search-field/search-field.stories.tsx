import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { CancelCircleIcon, FilterIcon } from '@aero/ui/icons';
import { HugeiconsIcon } from '@aero/ui/icons';

import { Button } from '@/components/buttons/button';
import { Spinner } from '@/components/feedback/spinner';
import { Description } from '@/components/forms/description';
import { FieldError } from '@/components/forms/field-error';
import { Form } from '@/components/forms/form';
import { Label } from '@/components/forms/label';
import { Kbd } from '@/components/typography/kbd';

import { SearchField } from './index';

const meta: Meta<typeof SearchField> = {
  component: SearchField,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Components/Forms/SearchField',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <SearchField name='search'>
      <Label>Search</Label>
      <SearchField.Group>
        <SearchField.SearchIcon />
        <SearchField.Input className='w-[280px]' placeholder='Search...' />
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className='flex flex-col gap-4'>
      <SearchField name='primary-search' variant='primary'>
        <Label>Primary variant</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input className='w-[280px]' placeholder='Search...' />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      <SearchField name='secondary-search' variant='secondary'>
        <Label>Secondary variant</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input className='w-[280px]' placeholder='Search...' />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
    </div>
  ),
};

export const FullWidth: Story = {
  render: () => (
    <div className='w-[400px] space-y-4'>
      <SearchField fullWidth name='search'>
        <Label>Search</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder='Search...' />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div className='flex flex-col gap-4'>
      <SearchField name='search'>
        <Label>Search products</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input
            className='w-[280px]'
            placeholder='Search products...'
          />
          <SearchField.ClearButton />
        </SearchField.Group>
        <Description>Enter keywords to search for products</Description>
      </SearchField>
      <SearchField name='search-users'>
        <Label>Search users</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input
            className='w-[280px]'
            placeholder='Search users...'
          />
          <SearchField.ClearButton />
        </SearchField.Group>
        <Description>Search by name, email, or username</Description>
      </SearchField>
    </div>
  ),
};

export const Required: Story = {
  render: () => (
    <div className='flex flex-col gap-4'>
      <SearchField isRequired name='search'>
        <Label>Search</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input className='w-[280px]' placeholder='Search...' />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      <SearchField isRequired name='search-query'>
        <Label>Search query</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input
            className='w-[280px]'
            placeholder='Enter search query...'
          />
          <SearchField.ClearButton />
        </SearchField.Group>
        <Description>Minimum 3 characters required</Description>
      </SearchField>
    </div>
  ),
};

export const Invalid: Story = {
  render: () => (
    <div className='flex flex-col gap-4'>
      <SearchField isInvalid isRequired name='search' value='ab'>
        <Label>Search</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input className='w-[280px]' placeholder='Search...' />
          <SearchField.ClearButton />
        </SearchField.Group>
        <FieldError>Search query must be at least 3 characters</FieldError>
      </SearchField>
      <SearchField isInvalid name='search-invalid'>
        <Label>Search</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input
            className='w-[280px]'
            placeholder='Search...'
            value='invalid@query'
          />
          <SearchField.ClearButton />
        </SearchField.Group>
        <FieldError>Invalid characters in search query</FieldError>
      </SearchField>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className='flex flex-col gap-4'>
      <SearchField isDisabled name='search' value='Disabled search'>
        <Label>Search</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input className='w-[280px]' placeholder='Search...' />
          <SearchField.ClearButton />
        </SearchField.Group>
        <Description>This search field is disabled</Description>
      </SearchField>
      <SearchField isDisabled name='search-empty'>
        <Label>Search</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input className='w-[280px]' placeholder='Search...' />
          <SearchField.ClearButton />
        </SearchField.Group>
        <Description>This search field is disabled</Description>
      </SearchField>
    </div>
  ),
};

export const Controlled: Story = {
  render: function Story() {
    const [value, setValue] = React.useState('');

    return (
      <div className='flex flex-col gap-4'>
        <SearchField name='search' value={value} onChange={setValue}>
          <Label>Search</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input className='w-[280px]' placeholder='Search...' />
            <SearchField.ClearButton />
          </SearchField.Group>
          <Description>Current value: {value || '(empty)'}</Description>
        </SearchField>
        <div className='flex gap-2'>
          <Button variant='tertiary' onPress={() => setValue('')}>
            Clear
          </Button>
          <Button variant='tertiary' onPress={() => setValue('example query')}>
            Set example
          </Button>
        </div>
      </div>
    );
  },
};

export const WithValidation: Story = {
  render: function Story() {
    const [value, setValue] = React.useState('');
    const isInvalid = value.length > 0 && value.length < 3;

    return (
      <div className='flex flex-col gap-4'>
        <SearchField
          isRequired
          isInvalid={isInvalid}
          name='search'
          value={value}
          onChange={setValue}
        >
          <Label>Search</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input className='w-[280px]' placeholder='Search...' />
            <SearchField.ClearButton />
          </SearchField.Group>
          {isInvalid ? (
            <FieldError>Search query must be at least 3 characters</FieldError>
          ) : (
            <Description>Enter at least 3 characters to search</Description>
          )}
        </SearchField>
      </div>
    );
  },
};

export const CustomIcons: Story = {
  render: () => (
    <div className='flex flex-col gap-4'>
      <SearchField name='search-custom'>
        <Label>Search (Custom Icons)</Label>
        <SearchField.Group>
          <SearchField.SearchIcon>
            <HugeiconsIcon icon={FilterIcon} size={16} />
          </SearchField.SearchIcon>
          <SearchField.Input className='w-[280px]' placeholder='Search...' />
          <SearchField.ClearButton>
            <HugeiconsIcon icon={CancelCircleIcon} size={16} />
          </SearchField.ClearButton>
        </SearchField.Group>
        <Description>Custom icon children</Description>
      </SearchField>
    </div>
  ),
};

export const FormExample: Story = {
  render: function Story() {
    const [value, setValue] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const MIN_LENGTH = 3;
    const isInvalid = value.length > 0 && value.length < MIN_LENGTH;

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      if (value.length < MIN_LENGTH) {
        return;
      }

      setIsSubmitting(true);

      // Simulate API call
      setTimeout(() => {
        // eslint-disable-next-line no-console
        console.log('Search submitted:', { query: value });
        setValue('');
        setIsSubmitting(false);
      }, 1500);
    };

    return (
      <Form className='flex w-[280px] flex-col gap-4' onSubmit={handleSubmit}>
        <SearchField
          isRequired
          isInvalid={isInvalid}
          name='search'
          value={value}
          onChange={setValue}
        >
          <Label>Search products</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              className='w-full'
              placeholder='Search products...'
            />
            <SearchField.ClearButton />
          </SearchField.Group>
          {isInvalid ? (
            <FieldError>
              Search query must be at least {MIN_LENGTH} characters
            </FieldError>
          ) : (
            <Description>
              Enter at least {MIN_LENGTH} characters to search
            </Description>
          )}
        </SearchField>
        <Button
          className='w-full'
          isDisabled={value.length < MIN_LENGTH}
          isPending={isSubmitting}
          type='submit'
          variant='primary'
        >
          {isSubmitting ? (
            <>
              <Spinner color='current' size='sm' />
              Searching...
            </>
          ) : (
            'Search'
          )}
        </Button>
      </Form>
    );
  },
};

export const WithKeyboardShortcut: Story = {
  render: function Story() {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [value, setValue] = React.useState('');

    React.useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Check for CMD+K (Meta+K) or CTRL+K
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          inputRef.current?.focus();
        }
        // Check for ESC key to blur the input
        if (e.key === 'Escape' && document.activeElement === inputRef.current) {
          inputRef.current?.blur();
        }
      };

      // Add global event listener
      window.addEventListener('keydown', handleKeyDown);

      // Cleanup on unmount
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, []);

    return (
      <div className='flex flex-col gap-4'>
        <div>
          <SearchField name='search' value={value} onChange={setValue}>
            <Label>Search</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                ref={inputRef}
                className='w-[280px]'
                placeholder='Search...'
              />
              <SearchField.ClearButton />
            </SearchField.Group>
            <Description>
              Use keyboard shortcut to quickly focus this field
            </Description>
          </SearchField>
        </div>
        <div className='text-default-500 flex items-center gap-2 text-sm'>
          <span>Press</span>
          <Kbd>
            <Kbd.Abbr keyValue='command' />
            <Kbd.Content>K</Kbd.Content>
          </Kbd>
          <span>to focus the search field</span>
        </div>
      </div>
    );
  },
};
