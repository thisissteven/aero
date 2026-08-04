import z from 'zod';

import { AeroSessionSummary } from '@/services/harness/types';

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
