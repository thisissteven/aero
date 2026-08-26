// app/hooks/agents.ts

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { honoClient } from '@/app/lib';

const $agents = honoClient.api.agents;

export const agentKeys = {
  all: (harnessId?: string, directory?: string) =>
    ['agents', harnessId ?? 'default', directory ?? 'root'] as const,
  allCompact: (harnessId?: string, directory?: string) =>
    ['agents', 'compact', harnessId ?? 'default', directory ?? 'root'] as const,
  skills: (harnessId?: string, directory?: string) =>
    ['agents', 'skills', harnessId ?? 'default', directory ?? 'root'] as const,
  commands: (harnessId?: string, directory?: string) =>
    [
      'agents',
      'commands',
      harnessId ?? 'default',
      directory ?? 'root',
    ] as const,
  tools: (
    provider: string,
    model: string,
    harnessId?: string,
    directory?: string,
  ) =>
    [
      'agents',
      'tools',
      provider,
      model,
      harnessId ?? 'default',
      directory ?? 'root',
    ] as const,
};

interface UseAgentsOptions {
  harnessId?: string;
  directory?: string;
}

export function useAgents({ harnessId, directory }: UseAgentsOptions = {}) {
  return useQuery({
    queryKey: agentKeys.all(harnessId, directory),
    queryFn: async () => {
      const res = await $agents.$get({
        query: { harnessId, directory },
      });
      if (!res.ok) throw new Error('Failed to fetch agents');
      return res.json();
    },
    placeholderData: keepPreviousData,
  });
}

export function useAgentsCompact({
  harnessId,
  directory,
}: UseAgentsOptions = {}) {
  return useQuery({
    queryKey: agentKeys.allCompact(harnessId, directory),
    queryFn: async () => {
      const res = await $agents.compact.$get({
        query: { harnessId, directory },
      });
      if (!res.ok) throw new Error('Failed to fetch agents');
      return res.json();
    },
    placeholderData: keepPreviousData,
  });
}

export function useSkills({ harnessId, directory }: UseAgentsOptions = {}) {
  return useQuery({
    queryKey: agentKeys.skills(harnessId, directory),
    queryFn: async () => {
      const res = await $agents.skills.$get({
        query: { harnessId, directory },
      });
      if (!res.ok) throw new Error('Failed to fetch skills');
      return res.json();
    },
    placeholderData: keepPreviousData,
  });
}

export function useCommands({ harnessId, directory }: UseAgentsOptions = {}) {
  return useQuery({
    queryKey: agentKeys.commands(harnessId, directory),
    queryFn: async () => {
      const res = await $agents.commands.$get({
        query: { harnessId, directory },
      });
      if (!res.ok) throw new Error('Failed to fetch commands');
      return res.json();
    },
    placeholderData: keepPreviousData,
  });
}

interface UseToolsOptions extends UseAgentsOptions {
  provider: string;
  model: string;
}

export function useTools({
  provider,
  model,
  harnessId,
  directory,
}: UseToolsOptions) {
  return useQuery({
    queryKey: agentKeys.tools(provider, model, harnessId, directory),
    queryFn: async () => {
      const res = await $agents.tools.$get({
        query: { provider, model, harnessId, directory },
      });
      if (!res.ok) throw new Error('Failed to fetch tools');
      return res.json();
    },
    enabled: Boolean(provider && model),
    placeholderData: keepPreviousData,
  });
}
