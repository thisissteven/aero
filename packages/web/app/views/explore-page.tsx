'use client';

import { Card } from '@aero/ui';

import { EXPLORE_CATEGORIES } from '../data/chat';

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
