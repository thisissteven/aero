import { ArrowUpRightFromSquare, Globe } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { WebSearchPart } from '@/app/components/tool-call-view/tools/tool-types';

type SearchResult = {
  url: string;
  title: string;
  publish_date: string | null;
  excerpts: string[];
};

type SearchOutput = {
  results?: SearchResult[];
};

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getExcerpt(result: SearchResult) {
  const excerpt = result.excerpts?.[0]?.replace(/\s+/g, ' ').trim();

  if (!excerpt) {
    return null;
  }

  return excerpt.length > 180 ? `${excerpt.slice(0, 180)}…` : excerpt;
}

function SearchResults({
  query,
  output,
}: {
  query: string;
  output: SearchOutput | null;
}) {
  const results = output?.results ?? [];

  return (
    <div className='w-full min-w-0'>
      {/* Search header */}
      <div className='mb-2.5 flex items-center gap-2 px-0.5'>
        <div className='bg-surface-secondary text-muted flex size-6 shrink-0 items-center justify-center rounded-md'>
          <Icon data={Globe} size={13} />
        </div>

        <div className='min-w-0 flex-1'>
          <div className='text-foreground truncate text-xs font-medium'>
            {query || 'Web search'}
          </div>
        </div>

        {results.length > 0 && (
          <span className='bg-surface-secondary text-muted shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums'>
            {results.length}
          </span>
        )}
      </div>

      {results.length > 0 ? (
        <div className='divide-separator border-border bg-surface divide-y overflow-hidden rounded-xl border'>
          {results.slice(0, 5).map((result, index) => {
            const domain = getDomain(result.url);
            const excerpt = getExcerpt(result);

            return (
              <a
                key={`${result.url}-${index}`}
                href={result.url}
                target='_blank'
                rel='noopener noreferrer'
                className='group/result hover:bg-surface-secondary relative block px-3 py-3 transition-colors'
              >
                <div className='flex min-w-0 gap-3'>
                  <div className='border-border bg-surface-secondary mt-0.5 flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-lg border'>
                    <img
                      src={`https://${domain}/favicon.ico`}
                      alt=''
                      width={16}
                      height={16}
                      className='size-4'
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>

                  <div className='min-w-0 flex-1'>
                    <div className='flex min-w-0 items-center gap-1.5'>
                      <span className='text-foreground min-w-0 flex-1 truncate text-[12px] leading-4 font-medium'>
                        {result.title || domain}
                      </span>

                      <Icon
                        data={ArrowUpRightFromSquare}
                        size={12}
                        className='text-muted shrink-0 opacity-0 transition-all duration-150 group-hover/result:translate-x-px group-hover/result:-translate-y-px group-hover/result:opacity-100'
                      />
                    </div>

                    <div className='text-muted mt-1 flex min-w-0 items-center gap-1.5 text-[10px] leading-none'>
                      <span className='truncate'>{domain}</span>

                      {result.publish_date && (
                        <>
                          <span className='text-muted/50'>·</span>
                          <span className='shrink-0'>
                            {result.publish_date}
                          </span>
                        </>
                      )}
                    </div>

                    {excerpt && (
                      <p className='text-muted mt-1.5 line-clamp-2 text-[11px] leading-[1.45]'>
                        {excerpt}
                      </p>
                    )}
                  </div>
                </div>
              </a>
            );
          })}

          {results.length > 5 && (
            <div className='bg-surface-secondary text-muted px-3 py-2 text-[10px] font-medium'>
              +{results.length - 5} more results
            </div>
          )}
        </div>
      ) : (
        <div className='border-border bg-surface text-muted rounded-xl border px-3 py-3 text-[11px]'>
          No results found
        </div>
      )}
    </div>
  );
}

export const WebSearchToolView = memo(
  ({
    part,
    blockId,
    isStreaming,
  }: {
    part: WebSearchPart;
    blockId: string;
    isStreaming: boolean;
  }) => {
    const query = part.input.query || '';

    let output: SearchOutput | null = null;

    try {
      output =
        typeof part.output === 'string' ? JSON.parse(part.output) : part.output;
    } catch {
      output = null;
    }

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={Globe}
        title='Web Search'
        preview={part.input.query}
        code=''
        copyText=''
        isStreaming={isStreaming}
      >
        <SearchResults query={query} output={output} />
      </BaseTool>
    );
  },
);
