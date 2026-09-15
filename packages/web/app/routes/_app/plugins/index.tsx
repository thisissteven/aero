import { EditProvider } from '@pierre/diffs/react';
import { createFileRoute } from '@tanstack/react-router';
import { DemoTreeApp } from '@/app/components/chat-aside/files/temp/_components/DemoTreeApp';
import { createEditor } from '@/app/components/chat-aside/files/temp/lib/editFactory';

export const Route = createFileRoute('/_app/plugins/')({
  component: PluginsPage,
});

function PluginsPage() {
  return (
    <EditProvider createEditor={createEditor as any}>
      <div className='h-screen w-full bg-slate-950 text-slate-200 antialiased'>
        <DemoTreeApp />
      </div>
    </EditProvider>
  );
}
