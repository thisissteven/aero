import type { AeroPart } from '@/server/services/harness/types';

export type ToolPartBase = Extract<AeroPart, { type: 'tool' }>;

export type EditToolNames =
  'edit' | 'multiedit' | 'str_replace' | 'str_replace_based_edit_tool';
export type WriteToolNames = 'write' | 'create' | 'file_write';
export type ReadToolNames = 'read' | 'view' | 'file_read' | 'cat';
export type BashToolNames = 'bash' | 'shell' | 'cmd' | 'terminal';
export type ListToolNames = 'list' | 'ls' | 'dir' | 'list_files';
export type SearchToolNames = 'search' | 'grep' | 'find' | 'ripgrep';
export type WebToolNames =
  | 'fetch'
  | 'curl'
  | 'wget'
  | 'webfetch'
  | 'web-search'
  | 'websearch'
  | 'search_web'
  | 'codesearch'
  | 'google'
  | 'bing'
  | 'duckduckgo'
  | 'perplexity';
export type TodoToolNames = 'todowrite' | 'todoread';
export type StructuredOutputNames = 'structuredoutput' | 'structured_output';
export type PlanToolNames = 'plan_enter' | 'plan_exit';

export type EditPart = ToolPartBase & {
  toolName: EditToolNames | WriteToolNames;
  input: {
    path?: string;
    filePath?: string;
    content?: string;
    newString?: string;
    oldString?: string;
  };
  metadata?: {
    filediff?: {
      file?: string;
      patch?: string;
      additions?: number;
      deletions?: number;
    };
  };
};

export type ReadPart = ToolPartBase & {
  toolName: ReadToolNames;
  input: { path?: string; filePath?: string };
};

export type BashPart = ToolPartBase & {
  toolName: BashToolNames;
  input: { command?: string };
};

export type PatchPart = ToolPartBase & {
  toolName: 'apply_patch';
  input: { patchText?: string };
};

export type SearchPart = ToolPartBase & {
  toolName: SearchToolNames;
  input: { pattern?: string; query?: string; path?: string };
};

export type GlobPart = ToolPartBase & {
  toolName: 'glob';
  input: { pattern?: string };
};

export type LspPart = ToolPartBase & {
  toolName: 'lsp';
  input: { operation?: string; path?: string };
};

export type SkillPart = ToolPartBase & {
  toolName: 'skill';
  input: { name?: string; skill?: string };
};

export type WebFetchPart = ToolPartBase & {
  toolName: 'fetch' | 'curl' | 'wget' | 'webfetch';
  input: { url?: string };
};

export type WebSearchPart = ToolPartBase & {
  toolName:
    | 'web-search'
    | 'websearch'
    | 'search_web'
    | 'codesearch'
    | 'google'
    | 'bing'
    | 'duckduckgo'
    | 'perplexity';
  input: { query?: string };
};

export type QuestionPart = ToolPartBase & {
  toolName: 'question';
  input: { question?: string };
};

export type TodoWritePart = ToolPartBase & {
  toolName: 'todowrite' | 'todoread';
  input: { todos?: unknown[] };
};

export type GenericToolPart = ToolPartBase;
