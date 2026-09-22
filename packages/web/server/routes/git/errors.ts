import { z } from 'zod';

export const gitErrorCodeSchema = z.enum([
  'DIRECTORY_NOT_FOUND',
  'INVALID_GIT_REPOSITORY',
  'VALIDATION_ERROR',
  'INTERNAL_SERVER_ERROR',
  'PATH_NOT_FOUND',
  'NESTED_REPOSITORY',
  'UNTRACKED_DIRECTORY',
]);

export type GitErrorCode = z.infer<typeof gitErrorCodeSchema>;

export class DirectoryNotFoundError extends Error {
  readonly code = 'DIRECTORY_NOT_FOUND' as const;
  constructor(public readonly directory: string) {
    super(`Directory does not exist: ${directory}`);
    this.name = 'DirectoryNotFoundError';
  }
}

export class InvalidGitRepositoryError extends Error {
  readonly code = 'INVALID_GIT_REPOSITORY' as const;
  constructor(public readonly directory: string) {
    super(`Directory is not a valid Git repository: ${directory}`);
    this.name = 'InvalidGitRepositoryError';
  }
}

export class PathNotFoundError extends Error {
  readonly code = 'PATH_NOT_FOUND' as const;
  constructor(public readonly path: string) {
    super(`Path not found: ${path}`);
    this.name = 'PathNotFoundError';
  }
}

export class NestedRepositoryError extends Error {
  readonly code = 'NESTED_REPOSITORY' as const;
  constructor(public readonly path: string) {
    super(`Path is a nested repository: ${path}`);
    this.name = 'NestedRepositoryError';
  }
}

export class UntrackedDirectoryError extends Error {
  readonly code = 'UNTRACKED_DIRECTORY' as const;
  constructor(public readonly path: string) {
    super(`Path is an untracked directory: ${path}`);
    this.name = 'UntrackedDirectoryError';
  }
}
