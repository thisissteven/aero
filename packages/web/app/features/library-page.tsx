import { Card, Chip } from '@aero/ui';

import { useI18n } from '@/app/hooks/i18n';
import { BaseTranslation } from '@/app/hooks/i18n/locales/translations';

interface LibraryItem {
  id: string;
  title: string;
  description: string;
  tags: string[];
  updatedAt: string;
  sessionId?: string;
}

function getLibraryItems(t: BaseTranslation): LibraryItem[] {
  return [
    {
      id: 'code-reviewer-preset',
      title: t.library.seniorCodeReviewer,
      description: t.library.seniorCodeReviewerDescription,
      tags: [t.library.preset, t.library.engineering],
      updatedAt: '2h ago',
      sessionId: 'session-code-reviewer',
    },
    {
      id: 'exec-email-preset',
      title: t.library.conciseExecutiveWriting,
      description: t.library.conciseExecutiveWritingDescription,
      tags: [t.library.toneRule, t.library.writing],
      updatedAt: '1d ago',
      sessionId: 'session-exec-email',
    },
    {
      id: 'api-docs-generator',
      title: t.library.openApiTypeGenerator,
      description: t.library.openApiTypeGeneratorDescription,
      tags: [t.library.prompt, t.library.backend],
      updatedAt: '3d ago',
    },
    {
      id: 'sql-optimizer',
      title: t.library.databaseQueryOptimizer,
      description: t.library.databaseQueryOptimizerDescription,
      tags: [t.library.preset, t.library.database],
      updatedAt: '1w ago',
      sessionId: 'session-sql-optimizer',
    },
    {
      id: 'prd-template',
      title: t.library.productRequirementsStarter,
      description: t.library.productRequirementsStarterDescription,
      tags: [t.library.template, t.library.product],
      updatedAt: '2w ago',
    },
    {
      id: 'ux-microcopy',
      title: t.library.uiMicrocopyAssistant,
      description: t.library.uiMicrocopyAssistantDescription,
      tags: [t.library.design, t.library.copywriting],
      updatedAt: '1m ago',
      sessionId: 'session-ux-microcopy',
    },
  ];
}

const _items = Array.from({ length: 10000 }, (_, i) => ({
  number: i,
  height: Math.random() * 100,
}));

export function LibraryPage() {
  const { t } = useI18n();

  const LIBRARY_ITEMS = getLibraryItems(t);

  return (
    <div className='h-full min-h-0 overflow-y-auto'>
      <div className='mx-auto flex w-full max-w-[960px] flex-col gap-6 px-4 py-8'>
        <header className='flex flex-col gap-2'>
          <h2 className='text-foreground text-2xl font-semibold tracking-tight'>
            {t.library.subtitle}
          </h2>
          <p className='text-muted max-w-[640px] text-sm'>
            {t.library.description}
          </p>
        </header>

        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {LIBRARY_ITEMS.map((item) => {
            const href = item.sessionId ? `/${item.sessionId}` : undefined;
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

      {/* <ListView virtualized className='h-96 w-80 overflow-y-auto' items={items}>
        {({ number, height }) => {
          return (
            <ListViewItem key={number} style={{ height }}>
              Hello {number}
            </ListViewItem>
          );
        }}
      </ListView> */}
    </div>
  );
}
