import z from 'zod';

export const PAGINATION_LIMIT = 20;
export const BACKEND_PAGINATION_LIMIT = 1000;

export const withPagination = <T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
) =>
  schema.extend({
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  });

export type OpenCodePaginated<T> = {
  data: T[];
  cursor: {
    next?: string;
    previous?: string;
  };
};
