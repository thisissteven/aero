import type { Meta, StoryObj } from '@storybook/react';
import { useCallback, useMemo, useState } from 'react';
import type { Selection } from 'react-aria-components';

import { Button } from '@/components/buttons/button';
import {
  DataGrid,
  type DataGridColumn,
} from '@/components/collections/data-grid';
import { ListView } from '@/components/collections/list-view';
import { Avatar } from '@/components/data-display/avatar';
import { Chip } from '@/components/data-display/chip';
import { Separator } from '@/components/layout/separator';
import { Tooltip } from '@/components/overlays/tooltip';

import { Icon } from '@/icon';

import { ActionBar } from './index';

const meta = {
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/Buttons/ActionBar',
} satisfies Meta<typeof ActionBar>;
export default meta;
type Story = StoryObj<any>;

const files = [
  'Project proposal.pdf',
  'Q4 financial report.xlsx',
  'Brand guidelines.fig',
  'Team photo.jpg',
  'Meeting notes.md',
  'API documentation.pdf',
].map((label, index) => ({ id: index + 1, label }));
function Bar({ clear, count }: { clear: () => void; count: number }) {
  return (
    <ActionBar isOpen={count > 0}>
      <ActionBar.Prefix>
        <Chip className='shrink-0 tabular-nums' size='sm'>
          {count}
        </Chip>
      </ActionBar.Prefix>
      <Separator />
      <ActionBar.Content>
        {[
          ['Edit', 'lucide:pencil'],
          ['Export', 'lucide:arrow-up-from-line'],
          ['Archive', 'lucide:archive'],
        ].map(([label, icon]) => (
          <Button aria-label={label} key={label} size='sm' variant='ghost'>
            <Icon icon={icon} />
            <span className='action-bar__label'>{label}</span>
          </Button>
        ))}
        <Separator orientation='vertical' />
        <Button
          aria-label='Delete'
          className='bg-danger/10 text-danger'
          size='sm'
          variant='ghost'
        >
          <Icon icon='lucide:trash-2' />
          <span className='action-bar__label'>Delete</span>
        </Button>
      </ActionBar.Content>
      <Separator />
      <ActionBar.Suffix>
        <Tooltip>
          <Button
            isIconOnly
            aria-label='Clear selection'
            size='sm'
            variant='ghost'
            onPress={clear}
          >
            <Icon icon='lucide:x' />
          </Button>
          <Tooltip.Content>Clear selection</Tooltip.Content>
        </Tooltip>
      </ActionBar.Suffix>
    </ActionBar>
  );
}

function DefaultDemo() {
  const [selected, setSelected] = useState<Selection>(new Set());
  const count = selected === 'all' ? files.length : selected.size;
  return (
    <div className='w-full max-w-lg p-4'>
      <ListView
        aria-label='Files'
        items={files}
        selectedKeys={selected}
        selectionMode='multiple'
        variant='primary'
        onSelectionChange={setSelected}
      >
        {(item) => (
          <ListView.Item id={item.id} textValue={item.label}>
            <ListView.ItemContent>
              <ListView.Title>{item.label}</ListView.Title>
            </ListView.ItemContent>
          </ListView.Item>
        )}
      </ListView>
      <Bar clear={() => setSelected(new Set())} count={count} />
    </div>
  );
}
type Employee = {
  avatar: string;
  department: string;
  email: string;
  id: number;
  joinDate: string;
  name: string;
  status: 'Active' | 'Inactive' | 'Pending';
};
const employees: Employee[] = [
  {
    avatar: 'https://api.dicebear.com/9.x/lorelei/svg',
    department: 'Product',
    email: 'elena.rodriguez@company.com',
    id: 1,
    joinDate: '2024-01-28',
    name: 'Elena Rodriguez',
    status: 'Active',
  },
  {
    avatar: 'https://api.dicebear.com/9.x/lorelei/svg',
    department: 'Design',
    email: 'marcus.chen@company.com',
    id: 2,
    joinDate: '2024-02-03',
    name: 'Marcus Chen',
    status: 'Pending',
  },
  {
    avatar: 'https://api.dicebear.com/9.x/lorelei/svg',
    department: 'Product',
    email: 'priya.patel@company.com',
    id: 3,
    joinDate: '2024-03-04',
    name: 'Priya Patel',
    status: 'Active',
  },
  {
    avatar: 'https://api.dicebear.com/9.x/lorelei/svg',
    department: 'Support',
    email: 'james.o.brien@company.com',
    id: 4,
    joinDate: '2024-04-14',
    name: "James O'Brien",
    status: 'Active',
  },
  {
    avatar: 'https://api.dicebear.com/9.x/lorelei/svg',
    department: 'Support',
    email: 'yuki.tanaka@company.com',
    id: 5,
    joinDate: '2024-05-08',
    name: 'Yuki Tanaka',
    status: 'Inactive',
  },
  {
    avatar: 'https://api.dicebear.com/9.x/lorelei/svg',
    department: 'Sales',
    email: 'amara.okafor@company.com',
    id: 6,
    joinDate: '2024-06-27',
    name: 'Amara Okafor',
    status: 'Pending',
  },
  {
    avatar: 'https://api.dicebear.com/9.x/lorelei/svg',
    department: 'Engineering',
    email: 'luca.bianchi@company.com',
    id: 7,
    joinDate: '2024-07-25',
    name: 'Luca Bianchi',
    status: 'Active',
  },
  {
    avatar: 'https://api.dicebear.com/9.x/lorelei/svg',
    department: 'Design',
    email: 'sofia.andersson@company.com',
    id: 8,
    joinDate: '2024-08-08',
    name: 'Sofia Andersson',
    status: 'Active',
  },
];
const statusColors = {
  Active: 'success',
  Inactive: 'danger',
  Pending: 'warning',
} as const;
const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
const employeeColumns: DataGridColumn<Employee>[] = [
  {
    accessorKey: 'name',
    allowsSorting: true,
    cell: (employee) => (
      <div className='flex items-center gap-3'>
        <Avatar size='sm'>
          <Avatar.Image alt={employee.name} src={employee.avatar} />
          <Avatar.Fallback>
            {employee.name
              .split(' ')
              .map((part) => part[0])
              .join('')}
          </Avatar.Fallback>
        </Avatar>
        <div className='flex flex-col'>
          <span className='text-sm font-medium'>{employee.name}</span>
          <span className='text-muted text-xs'>{employee.email}</span>
        </div>
      </div>
    ),
    header: 'Employee',
    id: 'name',
    isRowHeader: true,
    minWidth: 240,
  },
  {
    accessorKey: 'department',
    allowsSorting: true,
    header: 'Department',
    id: 'department',
  },
  {
    accessorKey: 'status',
    allowsSorting: true,
    cell: (employee) => (
      <Chip color={statusColors[employee.status]} size='sm' variant='soft'>
        <span aria-hidden className='size-1.5 rounded-full bg-current' />
        <Chip.Label>{employee.status}</Chip.Label>
      </Chip>
    ),
    header: 'Status',
    id: 'status',
  },
  {
    accessorKey: 'joinDate',
    allowsSorting: true,
    cell: (employee) => (
      <span className='text-muted text-sm tabular-nums'>
        {formatDate(employee.joinDate)}
      </span>
    ),
    header: 'Joined',
    id: 'joinDate',
  },
];
function WithDataGridDemo() {
  const [data, setData] = useState(employees);
  const [selected, setSelected] = useState<Selection>(new Set());
  const count = selected === 'all' ? data.length : selected.size;
  const selectedKeys = useMemo(
    () =>
      selected === 'all' ? new Set(data.map((item) => item.id)) : selected,
    [data, selected],
  );
  const remove = useCallback(() => {
    setData((current) => current.filter((item) => !selectedKeys.has(item.id)));
    setSelected(new Set());
  }, [selectedKeys]);
  const exportSelected = useCallback(() => {
    const csv = [
      'Name,Email,Department,Status,Join Date',
      ...data
        .filter((item) => selectedKeys.has(item.id))
        .map(
          (item) =>
            `${item.name},${item.email},${item.department},${item.status},${item.joinDate}`,
        ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'employees.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }, [data, selectedKeys]);
  return (
    <div className='w-full max-w-4xl'>
      <DataGrid
        aria-label='Employees'
        columns={employeeColumns}
        data={data}
        defaultSortDescriptor={{ column: 'name', direction: 'ascending' }}
        getRowId={(item) => item.id}
        selectedKeys={selected}
        selectionMode='multiple'
        showSelectionCheckboxes
        onSelectionChange={setSelected}
      />
      <ActionBar aria-label='Bulk actions' isOpen={count > 0}>
        <ActionBar.Prefix>
          <Chip className='shrink-0 tabular-nums' size='sm'>
            {count}
          </Chip>
        </ActionBar.Prefix>
        <Separator />
        <ActionBar.Content>
          <Button aria-label='Edit' size='sm' variant='ghost'>
            <Icon icon='lucide:pencil' />
            <span className='action-bar__label'>Edit</span>
          </Button>
          <Button
            aria-label='Export'
            size='sm'
            variant='ghost'
            onPress={exportSelected}
          >
            <Icon icon='lucide:download' />
            <span className='action-bar__label'>Export</span>
          </Button>
          <Button aria-label='Archive' size='sm' variant='ghost'>
            <Icon icon='lucide:archive' />
            <span className='action-bar__label'>Archive</span>
          </Button>
          <Button
            aria-label='Delete'
            className='bg-danger/10 text-danger'
            size='sm'
            variant='ghost'
            onPress={remove}
          >
            <Icon icon='lucide:trash-2' />
            <span className='action-bar__label'>Delete</span>
          </Button>
        </ActionBar.Content>
        <Separator />
        <ActionBar.Suffix>
          <Tooltip>
            <Button
              isIconOnly
              aria-label='Clear selection'
              size='sm'
              variant='ghost'
              onPress={() => setSelected(new Set())}
            >
              <Icon icon='lucide:x' />
            </Button>
            <Tooltip.Content>Clear selection</Tooltip.Content>
          </Tooltip>
        </ActionBar.Suffix>
      </ActionBar>
    </div>
  );
}

export const Default: Story = { render: () => <DefaultDemo /> };
export const WithDataGrid: Story = { render: () => <WithDataGridDemo /> };
