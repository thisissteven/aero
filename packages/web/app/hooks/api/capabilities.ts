// app/hooks/agents.ts

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { honoClient } from '@/app/lib';

const $capabilities = honoClient.api.capabilities;

export const capabilityKeys = {
  all: (harnessId?: string, directory?: string) =>
    [
      'capabilities',
      'all',
      harnessId ?? 'default',
      directory ?? 'root',
    ] as const,
  agents: (harnessId?: string, directory?: string) =>
    [
      'capabilities',
      'agents',
      harnessId ?? 'default',
      directory ?? 'root',
    ] as const,
  agentsCompact: (harnessId?: string, directory?: string) =>
    [
      'capabilities',
      'agents',
      'compact',
      harnessId ?? 'default',
      directory ?? 'root',
    ] as const,
  skills: (harnessId?: string, directory?: string) =>
    [
      'capabilities',
      'skills',
      harnessId ?? 'default',
      directory ?? 'root',
    ] as const,
  skillsCompact: (harnessId?: string, directory?: string) =>
    [
      'capabilities',
      'skills',
      'compact',
      harnessId ?? 'default',
      directory ?? 'root',
    ] as const,
  commands: (harnessId?: string, directory?: string) =>
    [
      'capabilities',
      'commands',
      harnessId ?? 'default',
      directory ?? 'root',
    ] as const,
  commandsCompact: (harnessId?: string, directory?: string) =>
    [
      'capabilities',
      'commands',
      'compact',
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
      'capabilities',
      'tools',
      provider,
      model,
      harnessId ?? 'default',
      directory ?? 'root',
    ] as const,
};

interface UseCapabilitiesOptions {
  harnessId?: string;
  directory?: string;
}

export function useCapabilities({
  harnessId,
  directory,
}: UseCapabilitiesOptions = {}) {
  return useQuery({
    queryKey: capabilityKeys.all(harnessId, directory),
    queryFn: async () => {
      const res = await $capabilities.$get({
        query: { harnessId, directory },
      });
      if (!res.ok) throw new Error('Failed to fetch capabilities');
      return res.json();
    },
    placeholderData: keepPreviousData,
  });
}

export function useAgents({
  harnessId,
  directory,
}: UseCapabilitiesOptions = {}) {
  return useQuery({
    queryKey: capabilityKeys.agents(harnessId, directory),
    queryFn: async () => {
      const res = await $capabilities.agents.$get({
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
}: UseCapabilitiesOptions = {}) {
  return useQuery({
    queryKey: capabilityKeys.agentsCompact(harnessId, directory),
    queryFn: async () => {
      const res = await $capabilities.agents.compact.$get({
        query: { harnessId, directory },
      });
      if (!res.ok) throw new Error('Failed to fetch agents');
      return res.json();
    },
    placeholderData: keepPreviousData,
  });
}

export function useSkills({
  harnessId,
  directory,
}: UseCapabilitiesOptions = {}) {
  return useQuery({
    queryKey: capabilityKeys.skills(harnessId, directory),
    queryFn: async () => {
      const res = await $capabilities.skills.$get({
        query: { harnessId, directory },
      });
      if (!res.ok) throw new Error('Failed to fetch skills');
      return res.json();
    },
    placeholderData: keepPreviousData,
  });
}

export function useCommands({
  harnessId,
  directory,
}: UseCapabilitiesOptions = {}) {
  return useQuery({
    queryKey: capabilityKeys.commands(harnessId, directory),
    queryFn: async () => {
      const res = await $capabilities.commands.$get({
        query: { harnessId, directory },
      });
      if (!res.ok) throw new Error('Failed to fetch commands');
      return res.json();
    },
    placeholderData: keepPreviousData,
  });
}

interface UseToolsOptions extends UseCapabilitiesOptions {
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
    queryKey: capabilityKeys.tools(provider, model, harnessId, directory),
    queryFn: async () => {
      const res = await $capabilities.tools.$get({
        query: { provider, model, harnessId, directory },
      });
      if (!res.ok) throw new Error('Failed to fetch tools');
      return res.json();
    },
    enabled: Boolean(provider && model),
    placeholderData: keepPreviousData,
  });
}
