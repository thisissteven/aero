import { customCommandsNonSession } from '@/app/components/smart-composer/custom-commands';

export function PromptSuggestions() {
  return (
    <div className='flex flex-wrap justify-center gap-2 max-w-[640px] mx-auto @max-md:hidden'>
      {customCommandsNonSession.map((command) => {
        return (
          <button className='rounded-full px-3 py-1 border border-separator bg-surface text-sm'>
            {command.name}
          </button>
        );
      })}
    </div>
  );
}
