import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/plugins/')({
  component: () => <div>hi</div>,
});
