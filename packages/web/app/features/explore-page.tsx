import { Card } from '@aero/ui';

import { useI18n } from '@/app/hooks/i18n';
import { BaseTranslation } from '@/app/hooks/i18n/locales/translations';

interface ExplorePrompt {
  id: string;
  title: string;
  description: string;
}

interface ExploreCategory {
  id: string;
  title: string;
  subtitle: string;
  prompts: ExplorePrompt[];
}

function getExploreCategories(t: BaseTranslation): ExploreCategory[] {
  return [
    {
      id: 'writing-communication',
      title: t.explore.writingCommunication,
      subtitle: t.explore.writingCommunicationDescription,
      prompts: [
        {
          id: 'project-update',
          title: t.explore.draftStatusUpdate,
          description: t.explore.draftStatusUpdateDescription,
        },
        {
          id: 'tone-adjustment',
          title: t.explore.refineEmailTone,
          description: t.explore.refineEmailToneDescription,
        },
        {
          id: 'exec-summary',
          title: t.explore.generateExecutiveSummary,
          description: t.explore.generateExecutiveSummaryDescription,
        },
      ],
    },
    {
      id: 'coding-development',
      title: t.explore.codingArchitecture,
      subtitle: t.explore.codingArchitectureDescription,
      prompts: [
        {
          id: 'code-review',
          title: t.explore.performCodeReview,
          description: t.explore.performCodeReviewDescription,
        },
        {
          id: 'type-generation',
          title: t.explore.generateTypeScriptTypes,
          description: t.explore.generateTypeScriptTypesDescription,
        },
        {
          id: 'sql-optimization',
          title: t.explore.optimizeSqlQuery,
          description: t.explore.optimizeSqlQueryDescription,
        },
      ],
    },
    {
      id: 'strategy-planning',
      title: t.explore.strategyPlanning,
      subtitle: t.explore.strategyPlanningDescription,
      prompts: [
        {
          id: 'feature-prioritization',
          title: t.explore.prioritizeBacklog,
          description: t.explore.prioritizeBacklogDescription,
        },
        {
          id: 'sprint-retro',
          title: t.explore.designSprintRetro,
          description: t.explore.designSprintRetroDescription,
        },
        {
          id: 'user-persona',
          title: t.explore.defineUserPersonas,
          description: t.explore.defineUserPersonasDescription,
        },
      ],
    },
  ];
}

export function ExplorePage() {
  const { t } = useI18n();

  const EXPLORE_CATEGORIES = getExploreCategories(t);

  return (
    <div className='h-full min-h-0 overflow-y-auto'>
      <div className='mx-auto flex w-full max-w-[960px] flex-col gap-8 px-4 py-8'>
        <header className='flex flex-col gap-2'>
          <h2 className='text-foreground text-2xl font-semibold tracking-tight'>
            {t.explore.subtitle}
          </h2>
          <p className='text-muted max-w-[640px] text-sm'>
            {t.explore.description}
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
