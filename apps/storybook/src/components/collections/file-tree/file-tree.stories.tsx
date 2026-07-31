import { useTreeData } from '@react-stately/data';
import type { Meta, StoryObj } from '@storybook/react';
import { useMemo, useState } from 'react';
import { Collection, type Selection } from 'react-aria-components';

import { Button } from '@/components/buttons/button';
import { Dropdown } from '@/components/collections/dropdown';
import { Label } from '@/components/forms/label';
import { SearchField } from '@/components/forms/search-field';
import { Separator } from '@/components/layout/separator';
import { Header } from '@/components/typography/header';

import { Icon } from '@/icon';

import {
  FileTree,
  type FileTreeItemRenderProps,
  useFileTree,
  useFileTreeDrag,
} from './index';

const meta = {
  component: FileTree,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Collections/FileTree',
} satisfies Meta<typeof FileTree>;
export default meta;
type Story = StoryObj<typeof meta>;

const FolderIcon = ({ isExpanded }: FileTreeItemRenderProps) => (
  <Icon icon={isExpanded ? 'lucide:folder-open' : 'lucide:folder'} />
);
const FileIcon = () => <Icon icon='lucide:file-code-2' />;
interface ProjectNode {
  children?: ProjectNode[];
  id: string;
  name: string;
}
const project: ProjectNode[] = [
  {
    children: [
      {
        children: [
          { id: 'button', name: 'button.tsx' },
          { id: 'card', name: 'card.tsx' },
          { id: 'button-css', name: 'button.css' },
        ],
        id: 'components',
        name: 'components',
      },
      {
        children: [
          { id: 'compose', name: 'compose.ts' },
          { id: 'cn', name: 'cn.ts' },
        ],
        id: 'utils',
        name: 'utils',
      },
      { id: 'index', name: 'index.ts' },
    ],
    id: 'src',
    name: 'src',
  },
  { id: 'package', name: 'package.json' },
  { id: 'tsconfig', name: 'tsconfig.json' },
  { id: 'readme', name: 'README.md' },
  { id: 'env', name: '.env' },
];
const dragProject: ProjectNode[] = [
  {
    children: [
      {
        children: [
          { id: 'drag-button', name: 'button.tsx' },
          { id: 'drag-card', name: 'card.tsx' },
          { id: 'drag-modal', name: 'modal.tsx' },
        ],
        id: 'drag-components',
        name: 'components',
      },
      {
        children: [
          { id: 'drag-compose', name: 'compose.ts' },
          { id: 'drag-cn', name: 'cn.ts' },
        ],
        id: 'drag-utils',
        name: 'utils',
      },
      { id: 'drag-index', name: 'index.ts' },
    ],
    id: 'drag-src',
    name: 'src',
  },
  { id: 'drag-package', name: 'package.json' },
  { id: 'drag-tsconfig', name: 'tsconfig.json' },
  { id: 'drag-readme', name: 'README.md' },
];

const defaultProject: ProjectNode[] = [
  {
    children: [
      {
        children: [
          { id: 'frontend-package', name: 'package.json' },
          { id: 'frontend-tsconfig', name: 'tsconfig.json' },
          {
            children: [
              {
                children: [
                  { id: 'frontend-layout', name: 'layout.tsx' },
                  { id: 'frontend-page', name: 'page.tsx' },
                ],
                id: 'frontend-app',
                name: 'app',
              },
            ],
            id: 'frontend-src',
            name: 'src',
          },
        ],
        id: 'frontend',
        name: 'frontend',
      },
      {
        children: [
          { id: 'api-package', name: 'package.json' },
          {
            children: [
              { id: 'api-index', name: 'index.ts' },
              { id: 'api-routes', name: 'routes.ts' },
            ],
            id: 'api-src',
            name: 'src',
          },
        ],
        id: 'api',
        name: 'api',
      },
    ],
    id: 'apps',
    name: 'apps',
  },
  {
    children: [
      {
        children: [
          { id: 'react-package', name: 'package.json' },
          {
            children: [
              {
                children: [{ id: 'react-index', name: 'index.ts' }],
                id: 'react-components',
                name: 'components',
              },
            ],
            id: 'react-src',
            name: 'src',
          },
        ],
        id: 'react',
        name: 'react',
      },
    ],
    id: 'packages',
    name: 'packages',
  },
  {
    children: [
      {
        children: [
          {
            children: [{ id: 'skill-file', name: 'SKILL.md' }],
            id: 'heroui-react',
            name: 'heroui-react',
          },
        ],
        id: 'skills',
        name: 'skills',
      },
    ],
    id: 'claude',
    name: '.claude',
  },
  { id: 'root-readme', name: 'README.md' },
  { id: 'agents', name: 'AGENTS.md' },
  { id: 'root-package', name: 'package.json' },
  { id: 'root-tsconfig', name: 'tsconfig.json' },
];

const renderStaticNode = (node: ProjectNode): React.JSX.Element => (
  <FileTree.Item
    id={node.id}
    key={node.id}
    textValue={node.name}
    title={node.name}
  >
    {node.children?.map(renderStaticNode)}
  </FileTree.Item>
);

function DefaultTree({
  className = 'w-[300px]',
  reduceMotion,
}: {
  className?: string;
  reduceMotion?: boolean;
}) {
  return (
    <FileTree
      aria-label='Project structure'
      className={className}
      defaultExpandedKeys={[
        'apps',
        'frontend',
        'api',
        'packages',
        'react',
        'claude',
      ]}
      reduceMotion={reduceMotion}
    >
      {defaultProject.map(renderStaticNode)}
    </FileTree>
  );
}

function StaticTree({
  className = 'w-[300px]',
  icons = false,
  reduceMotion,
  showGuideLines,
  size,
}: {
  className?: string;
  icons?: boolean;
  reduceMotion?: boolean;
  showGuideLines?: boolean | 'hover';
  size?: 'lg' | 'md' | 'sm';
}) {
  const renderNode = (node: ProjectNode): React.JSX.Element => (
    <FileTree.Item
      icon={icons ? node.children ? FolderIcon : <FileIcon /> : undefined}
      id={node.id}
      key={node.id}
      textValue={node.name}
      title={node.name}
    >
      {node.children?.map(renderNode)}
    </FileTree.Item>
  );
  return (
    <FileTree
      aria-label={icons ? 'Project with icons' : 'Project structure'}
      className={className}
      defaultExpandedKeys={['src', 'components', 'utils']}
      reduceMotion={reduceMotion}
      showGuideLines={showGuideLines}
      size={size}
    >
      {project.map(renderNode)}
    </FileTree>
  );
}

export const Default: Story = { render: () => <DefaultTree /> };
export const WithIcons: Story = { render: () => <StaticTree icons /> };

function MultipleSelectionDemo() {
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());
  return (
    <div className='flex flex-col items-center gap-4'>
      <FileTree
        aria-label='Selectable file tree'
        className='w-[280px]'
        defaultExpandedKeys={['src', 'components']}
        selectedKeys={selectedKeys}
        selectionMode='multiple'
        onSelectionChange={setSelectedKeys}
      >
        <FileTree.Item id='src' textValue='src' title='src'>
          <FileTree.Item
            id='components'
            textValue='components'
            title='components'
          >
            <FileTree.Item
              id='button'
              textValue='button.tsx'
              title='button.tsx'
            />
            <FileTree.Item id='card' textValue='card.tsx' title='card.tsx' />
            <FileTree.Item id='modal' textValue='modal.tsx' title='modal.tsx' />
          </FileTree.Item>
          <FileTree.Item id='utils' textValue='utils' title='utils'>
            <FileTree.Item
              id='helpers'
              textValue='helpers.ts'
              title='helpers.ts'
            />
          </FileTree.Item>
        </FileTree.Item>
        <FileTree.Item id='readme' textValue='README.md' title='README.md' />
      </FileTree>
      <p className='text-muted text-sm'>
        Selected:{' '}
        {selectedKeys === 'all'
          ? 'all'
          : [...selectedKeys].join(', ') || 'none'}
      </p>
    </div>
  );
}
export const MultipleSelection: Story = {
  render: () => <MultipleSelectionDemo />,
};
export const Sizes: Story = {
  render: () => (
    <div className='flex items-start gap-6'>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div className='flex flex-col gap-2' key={size}>
          <span className='text-muted text-xs'>{size}</span>
          <StaticTree className='w-[260px]' icons size={size} />
        </div>
      ))}
    </div>
  ),
};

const renderDynamicNode = (node: ProjectNode): React.JSX.Element => (
  <FileTree.Item id={node.id} textValue={node.name} title={node.name}>
    {node.children ? (
      <Collection items={node.children}>{renderDynamicNode}</Collection>
    ) : null}
  </FileTree.Item>
);
const dynamicProject: ProjectNode[] = [
  {
    children: [
      {
        children: [
          { id: 'dynamic-layout', name: 'layout.tsx' },
          { id: 'dynamic-page', name: 'page.tsx' },
          { id: 'dynamic-css', name: 'globals.css' },
        ],
        id: 'dynamic-frontend',
        name: 'frontend',
      },
      {
        children: [
          { id: 'dynamic-api-index', name: 'index.ts' },
          { id: 'dynamic-api-routes', name: 'routes.ts' },
        ],
        id: 'dynamic-api',
        name: 'api',
      },
    ],
    id: 'dynamic-apps',
    name: 'apps',
  },
  {
    children: [
      {
        children: [
          { id: 'dynamic-react-index', name: 'index.ts' },
          { id: 'dynamic-react-package', name: 'package.json' },
        ],
        id: 'dynamic-react',
        name: 'react',
      },
    ],
    id: 'dynamic-packages',
    name: 'packages',
  },
  { id: 'dynamic-readme', name: 'README.md' },
  { id: 'dynamic-agents', name: 'AGENTS.md' },
  { id: 'dynamic-package', name: 'package.json' },
];
function DynamicCollectionDemo() {
  return (
    <FileTree
      aria-label='Dynamic file tree'
      className='max-h-[380px] w-[300px]'
      defaultExpandedKeys={[
        'dynamic-apps',
        'dynamic-frontend',
        'dynamic-packages',
        'dynamic-react',
      ]}
      items={dynamicProject}
    >
      {renderDynamicNode}
    </FileTree>
  );
}
export const DynamicCollection: Story = {
  render: () => <DynamicCollectionDemo />,
};
export const CustomIndicator: Story = {
  render: () => (
    <FileTree
      aria-label='Custom indicator'
      className='w-[300px]'
      defaultExpandedKeys={['src', 'components']}
    >
      <FileTree.Item icon={FolderIcon} id='src' textValue='src' title='src'>
        <FileTree.Indicator>
          <Icon icon='heroicons:play-16-solid' />
        </FileTree.Indicator>
        <FileTree.Item
          icon={FolderIcon}
          id='components'
          textValue='components'
          title='components'
        >
          <FileTree.Indicator>
            <Icon icon='heroicons:play-16-solid' />
          </FileTree.Indicator>
          <FileTree.Item
            icon={<FileIcon />}
            id='button'
            textValue='button.tsx'
            title='button.tsx'
          />
          <FileTree.Item
            icon={<FileIcon />}
            id='card'
            textValue='card.tsx'
            title='card.tsx'
          />
        </FileTree.Item>
        <FileTree.Item
          icon={<FileIcon />}
          id='index'
          textValue='index.ts'
          title='index.ts'
        />
      </FileTree.Item>
      <FileTree.Item
        icon={<Icon icon='lucide:braces' />}
        id='pkg'
        textValue='package.json'
        title='package.json'
      />
      <FileTree.Item
        icon={<Icon icon='lucide:file-text' />}
        id='readme'
        textValue='README.md'
        title='README.md'
      />
    </FileTree>
  ),
};
export const GuideLines: Story = {
  render: () => (
    <div className='flex items-start gap-6'>
      {([true, 'hover', false] as const).map((value) => (
        <div className='flex flex-col gap-2' key={String(value)}>
          <span className='text-muted text-xs'>
            {value === true ? 'always' : value === false ? 'none' : 'hover'}
          </span>
          <StaticTree className='w-[260px]' icons showGuideLines={value} />
        </div>
      ))}
    </div>
  ),
};

interface ReviewNode {
  children?: ReviewNode[];
  ext?: string;
  id: string;
  name: string;
}
const reviewExtensions = ['.jsonc', '.ts', '.tsx'];
const reviewTree: ReviewNode[] = [
  {
    id: 'apps',
    name: 'apps',
    children: [
      {
        id: 'api',
        name: 'api',
        children: [
          {
            id: 'api-src',
            name: 'src',
            children: [
              { id: 'api-lib', name: 'lib' },
              { id: 'api-routes', name: 'routes' },
              {
                id: 'api-tests',
                name: 'tests',
                children: [
                  {
                    id: 'api-tests-middlewares',
                    name: 'middlewares',
                    children: [
                      {
                        ext: '.ts',
                        id: 'cli-auth-middleware-spec',
                        name: 'cliAuthMiddleware.spec.ts',
                      },
                    ],
                  },
                  {
                    id: 'api-tests-routes',
                    name: 'routes',
                    children: [
                      {
                        ext: '.ts',
                        id: 'license-key-spec',
                        name: 'license-key.spec.ts',
                      },
                    ],
                  },
                  {
                    id: 'api-tests-services',
                    name: 'services',
                    children: [
                      {
                        ext: '.ts',
                        id: 'project-service-spec',
                        name: 'projectService.spec.ts',
                      },
                    ],
                  },
                  {
                    id: 'api-tests-utils',
                    name: 'utils',
                    children: [
                      { ext: '.ts', id: 'email-spec', name: 'email.spec.ts' },
                    ],
                  },
                ],
              },
              { id: 'auth', name: 'auth.ts', ext: '.ts' },
              { id: 'api-index-review', name: 'index.ts', ext: '.ts' },
              { id: 'openapi', name: 'openapi.ts', ext: '.ts' },
            ],
          },
          { ext: '.jsonc', id: 'wrangler', name: 'wrangler.jsonc' },
        ],
      },
      {
        id: 'frontend',
        name: 'frontend/src',
        children: [
          {
            children: [
              { id: 'frontend-dashboard', name: 'dashboard' },
              { id: 'frontend-invite-token', name: 'invite/[token]' },
            ],
            id: 'frontend-app-review',
            name: 'app',
          },
          {
            children: [
              {
                children: [
                  {
                    ext: '.tsx',
                    id: 'dashboard-sidebar',
                    name: 'dashboard-sidebar.tsx',
                  },
                ],
                id: 'frontend-components-dashboard',
                name: 'dashboard',
              },
              {
                children: [
                  {
                    ext: '.tsx',
                    id: 'create-license-key-modal',
                    name: 'create-license-key-modal.tsx',
                  },
                ],
                id: 'frontend-components-license-keys',
                name: 'license-keys',
              },
              {
                children: [
                  {
                    ext: '.tsx',
                    id: 'team-name-editor',
                    name: 'team-name-editor.tsx',
                  },
                ],
                id: 'frontend-components-teams',
                name: 'teams',
              },
            ],
            id: 'frontend-components-review',
            name: 'components',
          },
          {
            children: [
              {
                ext: '.ts',
                id: 'license-key-api',
                name: 'license-key-api.ts',
              },
            ],
            id: 'frontend-lib-review',
            name: 'lib',
          },
        ],
      },
    ],
  },
];
function PRFileReviewDemo() {
  const { expandableKeys, filterTree, leaves } = useFileTree({
    items: reviewTree,
  });
  const extensions = useMemo(
    () =>
      reviewExtensions.filter((extension) =>
        leaves.some((leaf) => leaf.ext === extension),
      ),
    [leaves],
  );
  const [query, setQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Selection>(
    new Set(['.jsonc', '.ts', '.tsx']),
  );
  const enabled = useMemo(
    () =>
      selectedFilters === 'all'
        ? new Set(extensions)
        : new Set(
            [...selectedFilters].filter((key): key is string =>
              extensions.includes(key),
            ),
          ),
    [extensions, selectedFilters],
  );
  const filtered = useMemo(
    () =>
      filterTree(
        (node) =>
          (!node.ext || enabled.has(node.ext)) &&
          node.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [enabled, filterTree, query],
  );
  const renderNode = (node: ReviewNode): React.JSX.Element => (
    <FileTree.Item
      icon={node.children ? FolderIcon : <FileIcon />}
      id={node.id}
      textValue={node.name}
      title={node.name}
    >
      {node.children ? (
        <Collection items={node.children}>{renderNode}</Collection>
      ) : null}
    </FileTree.Item>
  );
  return (
    <div className='flex w-[360px] flex-col gap-3'>
      <div className='flex items-center gap-2'>
        <SearchField
          aria-label='Filter files'
          className='min-w-0 flex-1'
          value={query}
          onChange={setQuery}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder='Filter files' />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <Dropdown>
          <Button aria-label='File extensions' isIconOnly variant='tertiary'>
            <Icon icon='lucide:list-filter' />
          </Button>
          <Dropdown.Popover className='min-w-[220px]'>
            <Dropdown.Menu
              aria-label='File extensions'
              selectedKeys={selectedFilters}
              selectionMode='multiple'
              onSelectionChange={setSelectedFilters}
            >
              <Dropdown.Section>
                <Header>File extensions</Header>
                {extensions.map((extension) => (
                  <Dropdown.Item
                    id={extension}
                    key={extension}
                    textValue={extension}
                  >
                    <Dropdown.ItemIndicator />
                    <Label>{extension}</Label>
                  </Dropdown.Item>
                ))}
              </Dropdown.Section>
              <Separator />
              <Dropdown.Section>
                <Dropdown.Item id='deleted' textValue='Deleted files'>
                  <Dropdown.ItemIndicator />
                  <Label>Deleted files</Label>
                </Dropdown.Item>
                <Dropdown.Item id='viewed' textValue='Viewed files'>
                  <Dropdown.ItemIndicator />
                  <Label>Viewed files</Label>
                </Dropdown.Item>
              </Dropdown.Section>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
      <FileTree
        aria-label='PR changed files'
        defaultExpandedKeys={expandableKeys}
        items={filtered}
        showGuideLines='hover'
      >
        {renderNode}
      </FileTree>
    </div>
  );
}
export const PRFileReview: Story = {
  name: 'PR File Review',
  render: () => <PRFileReviewDemo />,
};
export const ReducedMotion: Story = {
  render: () => <DefaultTree className='max-h-[420px] w-80' reduceMotion />,
};

interface IncludedNode extends ProjectNode {
  included?: number;
}
function WithCheckboxesDemo() {
  const [selectedKeys, setSelectedKeys] = useState<Selection>(
    new Set(['root']),
  );
  const nodes: IncludedNode[] = [
    { id: 'cursor-check', name: '.cursor', included: 5 },
    { id: 'github-check', name: '.github' },
    { id: 'husky-check', name: '.husky' },
    { id: 'vscode-check', name: '.vscode' },
    {
      id: 'apps-check',
      name: 'apps',
      included: 812,
      children: [
        { id: 'api-check', name: 'api', included: 104 },
        { id: 'campaigns-check', name: 'campaigns', included: 23 },
        {
          id: 'docs-check',
          name: 'docs',
          included: 248,
          children: [
            { id: 'content-check', name: 'content', included: 99 },
            { id: 'public-check', name: 'public' },
            { id: 'scripts-check', name: 'scripts' },
            { id: 'skills-check', name: 'skills' },
            { id: 'src-check', name: 'src', included: 145 },
          ],
        },
      ],
    },
    { id: 'packages-check', name: 'packages', included: 416 },
  ];
  const renderNode = (node: IncludedNode): React.JSX.Element => (
    <FileTree.Item
      icon={node.children ? FolderIcon : <Icon icon='lucide:folder' />}
      id={node.id}
      key={node.id}
      textValue={node.name}
      title={
        <span className='inline-flex w-full justify-between'>
          <span>{node.name}</span>
          {node.included != null ? (
            <span className='text-muted text-xs'>{node.included} included</span>
          ) : null}
        </span>
      }
    >
      {node.children?.map((child) => renderNode(child as IncludedNode))}
    </FileTree.Item>
  );
  return (
    <FileTree
      aria-label='Repository file tree'
      className='w-[460px]'
      defaultExpandedKeys={['root', 'apps-check', 'docs-check']}
      selectedKeys={selectedKeys}
      selectionBehavior='toggle'
      selectionMode='multiple'
      onSelectionChange={setSelectedKeys}
    >
      <FileTree.Item
        icon={FolderIcon}
        id='root'
        textValue='heroui-inc/heroui.pro'
        title={
          <span className='inline-flex w-full justify-between'>
            <span>heroui-inc/heroui.pro</span>
            <span className='text-muted text-xs'>1664 included</span>
          </span>
        }
      >
        {nodes.map(renderNode)}
      </FileTree.Item>
    </FileTree>
  );
}
export const WithCheckboxes: Story = { render: () => <WithCheckboxesDemo /> };

function DragAndDropDemo() {
  const tree = useTreeData({ initialItems: dragProject });
  const { dragAndDropHooks } = useFileTreeDrag({ tree });
  const renderNode = (node: (typeof tree.items)[number]): React.JSX.Element => {
    const hasChildren = Boolean(node.children?.length);
    return (
      <FileTree.Item
        icon={hasChildren ? FolderIcon : <FileIcon />}
        id={node.key}
        textValue={node.value.name}
        title={node.value.name}
      >
        {hasChildren ? (
          <Collection items={node.children}>{renderNode}</Collection>
        ) : null}
      </FileTree.Item>
    );
  };
  return (
    <FileTree
      aria-label='Draggable file tree'
      className='w-[300px]'
      defaultExpandedKeys={['drag-src', 'drag-components', 'drag-utils']}
      dragAndDropHooks={dragAndDropHooks}
      items={tree.items}
      renderEmptyState={() => <div>No files</div>}
      selectionMode='multiple'
    >
      {renderNode}
    </FileTree>
  );
}
export const DragAndDrop: Story = {
  name: 'Drag And Drop',
  render: () => <DragAndDropDemo />,
};
