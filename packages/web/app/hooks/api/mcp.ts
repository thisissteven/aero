import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { honoClient } from '@/app/lib';
import { AeroMCPConfig, AeroMCPStatus } from '@/server/services/harness/types';

const $mcp = honoClient.api.mcp;

export const mcpKeys = {
  all: (harnessId?: string, directory?: string) =>
    ['mcps', 'all', harnessId ?? 'default', directory ?? 'root'] as const,
};

interface UseMcpOptions {
  harnessId?: string;
  directory?: string;
}

export function useMCPs({ harnessId, directory }: UseMcpOptions = {}) {
  return useQuery({
    queryKey: mcpKeys.all(harnessId, directory),
    queryFn: async () => {
      const res = await $mcp.$get({
        query: { harnessId, directory },
      });
      if (!res.ok) throw new Error('Failed to fetch MCP servers');
      return res.json();
    },
    placeholderData: keepPreviousData,
  });
}

export function useAddMCP(harnessId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      directory,
      config,
    }: {
      name: string;
      directory?: string;
      config: AeroMCPConfig;
    }) => {
      const [res] = await Promise.all([
        $mcp.$post({
          query: { harnessId, directory },
          json: { name, config },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
      if (!res.ok) throw new Error('Failed to add MCP server');
      return res.json();
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: mcpKeys.all(harnessId, input?.directory),
      });
    },
  });
}

export function useDisconnectMCP(harnessId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      directory,
    }: {
      name: string;
      directory?: string;
    }) => {
      const [res] = await Promise.all([
        $mcp.disconnect.$post({
          query: { harnessId, directory, name },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
      if (!res.ok) throw new Error('Failed to disconnect MCP server');
      return res.json();
    },
    onSuccess: (_data, input) => {
      const key = mcpKeys.all(harnessId, input.directory);

      queryClient.setQueryData<Record<string, AeroMCPStatus>>(
        key,
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            [input.name]: { status: 'disabled' },
          };
        },
      );

      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useConnectMCP(harnessId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      directory,
    }: {
      name: string;
      directory?: string;
    }) => {
      const [res] = await Promise.all([
        $mcp.connect.$post({
          query: { harnessId, directory, name },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
      if (!res.ok) throw new Error('Failed to connect to MCP server');
      return res.json();
    },
    onSuccess: (_data, input) => {
      const key = mcpKeys.all(harnessId, input.directory);

      queryClient.setQueryData<Record<string, AeroMCPStatus>>(
        key,
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            [input.name]: { status: 'connected' },
          };
        },
      );

      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useRemoveMCP(harnessId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      directory,
    }: {
      name: string;
      directory?: string;
    }) => {
      const [res] = await Promise.all([
        $mcp.remove.$delete({
          query: { harnessId, directory, name },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
      if (!res.ok) throw new Error('Failed to delete MCP server');
      return res.json();
    },
    onSuccess: (_data, input) => {
      const key = mcpKeys.all(harnessId, input.directory);

      queryClient.setQueryData<Record<string, AeroMCPStatus>>(
        key,
        (oldData) => {
          if (!oldData) return oldData;

          const { [input.name]: _, ...newData } = oldData;
          return newData;
        },
      );

      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
