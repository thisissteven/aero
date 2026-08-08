import z from 'zod';

import {
  AeroMessage,
  AeroSessionSummary,
} from '@/server/services/harness/types';

export const PAGINATION_LIMIT = 20;
export const BACKEND_PAGINATION_LIMIT = 1000;

export const withPagination = <
  T extends z.ZodRawShape,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TSearchable extends Record<string, any> = AeroSessionSummary,
>(
  schema: z.ZodObject<T>,
) =>
  schema.extend({
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    search: z.string().optional(),
    searchBy: z.custom<keyof TSearchable & string>().optional(),
  });

export type OpenCodePaginated<T> = {
  data: T[];
  cursor: {
    next?: string;
    previous?: string;
  };
};

export function multiplyMessages(
  messages: AeroMessage[],
  multiplier = 15,
): AeroMessage[] {
  return Array.from({ length: multiplier }, (_, batch) =>
    messages.map((msg, index) => ({
      ...msg,
      id: `${msg.id}-${batch}-${crypto.randomUUID()}`,
      parts: msg.parts.map((part) => ({
        ...part,
        id: `${part.id}-${batch}-${crypto.randomUUID()}`,
      })),
      createdAt: msg.createdAt + batch * 1000,
    })),
  ).flat();
}
