import { $individualSession } from '@/app/hooks/api/sessions';

export async function compactSession({
  harnessId,
  sessionId,
  modelId,
  providerId,
}: {
  harnessId: string | undefined;
  sessionId: string;
  modelId?: string;
  providerId?: string;
}) {
  const res = await $individualSession.compact.$post({
    param: { id: sessionId },
    query: { harnessId },
    json: {
      modelId,
      providerId,
    },
  });
  if (!res.ok) throw new Error('Failed to compact session');
  const data = await res.json();
  return data;
}
