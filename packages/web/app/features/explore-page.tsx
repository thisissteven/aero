import { Card } from '@aero/ui';

const EXPLORE_CATEGORIES = [
  {
    id: 'writing-communication',
    title: 'Writing & Communication',
    subtitle: 'Draft emails, refine documentation, and adjust tone.',
    prompts: [
      {
        id: 'project-update',
        title: 'Draft a project status update',
        description:
          'Summarize key milestones, upcoming deadlines, and current blockers for stakeholders.',
      },
      {
        id: 'tone-adjustment',
        title: 'Refine email tone',
        description:
          'Rewrite a firm boundary-setting message to sound empathetic and professional.',
      },
      {
        id: 'exec-summary',
        title: 'Generate executive summary',
        description:
          'Condense long technical documentation into three actionable bullet points.',
      },
    ],
  },
  {
    id: 'coding-development',
    title: 'Coding & Architecture',
    subtitle: 'Debug issues, optimize code, and generate TypeScript types.',
    prompts: [
      {
        id: 'code-review',
        title: 'Perform code review',
        description:
          'Check a React component for performance bottlenecks and unnecessary re-renders.',
      },
      {
        id: 'type-generation',
        title: 'Generate TypeScript types',
        description:
          'Convert a raw API JSON response into strict TypeScript interface definitions.',
      },
      {
        id: 'sql-optimization',
        title: 'Optimize SQL query',
        description:
          'Refactor a slow query with multiple JOINs for better indexing and throughput.',
      },
    ],
  },
  {
    id: 'strategy-planning',
    title: 'Strategy & Planning',
    subtitle: 'Structure frameworks, plan sprints, and ideate solutions.',
    prompts: [
      {
        id: 'feature-prioritization',
        title: 'Prioritize feature backlog',
        description:
          'Apply the RICE scoring model to evaluate upcoming user feature requests.',
      },
      {
        id: 'sprint-retro',
        title: 'Design sprint retro agenda',
        description:
          'Outline a 45-minute interactive retro format focused on continuous improvement.',
      },
      {
        id: 'user-persona',
        title: 'Define user personas',
        description:
          'Identify core user goals, frustrations, and workflows for a new feature launch.',
      },
    ],
  },
];

export function ExplorePage() {
  return (
    <div className='h-full min-h-0 overflow-y-auto'>
      <div className='mx-auto flex w-full max-w-[960px] flex-col gap-8 px-4 py-8'>
        <header className='flex flex-col gap-2'>
          <h2 className='text-foreground text-2xl font-semibold tracking-tight'>
            Starter prompts for everyday work
          </h2>
          <p className='text-muted max-w-[640px] text-sm'>
            Pick one to see what kinds of conversations this template pattern is
            designed for. Prompts are mock data, nothing is sent to any backend.
          </p>
        </header>

        <div className='flex flex-col gap-8'>
          {EXPLORE_CATEGORIES.map((category) => (
            <section key={category.id} className='flex flex-col gap-3'>
              <div className='flex flex-col gap-1'>
                <h3 className='text-foreground text-lg font-semibold'>
                  {category.title}
                </h3>
                <p className='text-muted text-sm'>{category.subtitle}</p>
              </div>

              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                {category.prompts.map((prompt) => (
                  <Card
                    key={prompt.id}
                    className='flex h-full flex-col gap-2 rounded-2xl'
                  >
                    <Card.Header>
                      <Card.Title className='text-base'>
                        {prompt.title}
                      </Card.Title>
                      <Card.Description className='text-sm'>
                        {prompt.description}
                      </Card.Description>
                    </Card.Header>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
