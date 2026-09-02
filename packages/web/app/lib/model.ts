export interface ModelCapabilities {
  temperature?: boolean;
  reasoning?: boolean;
  attachment?: boolean;
  toolcall?: boolean;
  input?: Record<string, boolean>;
  output?: Record<string, boolean>;
  interleaved?: boolean | { field: string };
}

export interface ModelCost {
  input: number;
  output: number;
  cache?: {
    read: number;
    write: number;
  };
}

export interface ModelLimit {
  context: number;
  output: number;
}

export interface ModelItem {
  id: string;
  providerID: string;
  name: string;
  family?: string;
  capabilities?: ModelCapabilities;
  cost?: ModelCost;
  limit?: ModelLimit;
  status?: string;
  variants?: {
    [variant: string]: {
      reasoningEffort: string;
    };
  };
}

export interface SearchableModel {
  model: ModelItem;
  providerId: string;
  providerName: string;
}

export interface ProviderGroup {
  id: string;
  name: string;
  models: SearchableModel[];
}

export function formatContextLength(limit?: number): string {
  if (!limit) {
    return '';
  }

  if (limit >= 1_000_000) {
    const value = limit / 1_000_000;

    return `${Number.isInteger(value) ? value : value.toFixed(1)}M`;
  }

  if (limit >= 1_000) {
    const value = limit / 1_000;

    return `${Number.isInteger(value) ? value : value.toFixed(1)}K`;
  }

  return `${limit}`;
}

export function formatCapabilities(capabilities?: ModelCapabilities): string {
  if (!capabilities) {
    return 'Standard';
  }

  const list: string[] = [];

  if (capabilities.toolcall) {
    list.push('Tool calling');
  }

  if (capabilities.reasoning) {
    list.push('Reasoning');
  }

  if (capabilities.attachment) {
    list.push('Attachments');
  }

  return list.length > 0 ? list.join(', ') : 'Standard';
}

export function formatMediaTypes(types?: Record<string, boolean>): string {
  if (!types) {
    return 'text';
  }

  const active = Object.entries(types)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);

  return active.length > 0 ? active.join(', ') : 'text';
}
