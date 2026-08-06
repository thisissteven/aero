import { Card, Chip } from '@aero/ui';

interface LibraryItem {
  id: string;
  title: string;
  description: string;
  tags: string[];
  updatedAt: string;
  threadId?: string;
}

const LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: 'code-reviewer-preset',
    title: 'Senior Code Reviewer',
    description:
      'Structured persona focused on performance, TypeScript strictness, and security best practices.',
    tags: ['Preset', 'Engineering'],
    updatedAt: '2h ago',
    threadId: 'thread-code-reviewer',
  },
  {
    id: 'exec-email-preset',
    title: 'Concise Executive Writing',
    description:
      'Tone rule preset that condenses complex technical updates into bulleted emails for leadership.',
    tags: ['Tone Rule', 'Writing'],
    updatedAt: '1d ago',
    threadId: 'thread-exec-email',
  },
  {
    id: 'api-docs-generator',
    title: 'OpenAPI & Type Generator',
    description:
      'Converts raw JSON payload samples into fully typed OpenAPI 3.0 schemas and TypeScript interfaces.',
    tags: ['Prompt', 'Backend'],
    updatedAt: '3d ago',
  },
  {
    id: 'sql-optimizer',
    title: 'Database Query Optimizer',
    description:
      'Analyzes slow PostgreSQL queries, EXPLAIN outputs, and recommends index strategies.',
    tags: ['Preset', 'Database'],
    updatedAt: '1w ago',
    threadId: 'thread-sql-optimizer',
  },
  {
    id: 'prd-template',
    title: 'Product Requirements Starter',
    description:
      'Reusable prompt structure for drafting PRDs complete with user stories and edge cases.',
    tags: ['Template', 'Product'],
    updatedAt: '2w ago',
  },
  {
    id: 'ux-microcopy',
    title: 'UI Microcopy Assistant',
    description:
      'Generates concise error states, tooltip copy, and empty-state text options for web apps.',
    tags: ['Design', 'Copywriting'],
    updatedAt: '1m ago',
    threadId: 'thread-ux-microcopy',
  },
];

export interface LibraryPageProps {
  basePath?: string;
}

export function LibraryPage({ basePath = '' }: LibraryPageProps) {
  return (
    <div className='h-full min-h-0 overflow-y-auto'>
      <div className='mx-auto flex w-full max-w-[960px] flex-col gap-6 px-4 py-8'>
        <header className='flex flex-col gap-2'>
          <h2 className='text-foreground text-2xl font-semibold tracking-tight'>
            Saved prompts and reusable setups
          </h2>
          <p className='text-muted max-w-[640px] text-sm'>
            A mock workspace of prompt presets, tone rules, and starter threads
            the template ships with. Save your own to pick up where you left
            off.
          </p>
        </header>

        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {LIBRARY_ITEMS.map((item) => {
            const href = item.threadId
              ? `${basePath}/${item.threadId}`
              : undefined;
            const card = (
              <Card className='flex h-full flex-col gap-3 rounded-2xl transition-colors'>
                <Card.Header>
                  <Card.Title className='text-base'>{item.title}</Card.Title>
                  <Card.Description className='text-sm'>
                    {item.description}
                  </Card.Description>
                </Card.Header>
                <Card.Footer className='flex items-center justify-between pt-0'>
                  <div className='flex flex-wrap gap-1.5'>
                    {item.tags.map((tag) => (
                      <Chip key={tag} size='sm' variant='soft'>
                        {tag}
                      </Chip>
                    ))}
                  </div>
                  <span className='text-muted text-xs'>{item.updatedAt}</span>
                </Card.Footer>
              </Card>
            );

            return href ? (
              <a key={item.id} className='block focus:outline-none' href={href}>
                {card}
              </a>
            ) : (
              <div key={item.id}>{card}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
