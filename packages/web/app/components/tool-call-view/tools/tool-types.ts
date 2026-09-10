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
  toolName: EditToolNames;
  title?: string;
  duration?: number;
  input: {
    filePath: string;
    oldString: string;
    newString: string;
  };
  output?: string;
};

export type WritePart = ToolPartBase & {
  toolName: WriteToolNames;
  title?: string;
  duration?: number;
  input: {
    filePath: string;
    content: string;
  };
  output?: string;
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
  input: { url?: string; format?: string };
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

export type QuestionOption = {
  label: string;
  description?: string;
};

export type QuestionItem = {
  question: string;
  header?: string;
  options?: QuestionOption[];
};

export type QuestionPart = ToolPartBase & {
  toolName: 'question';
  input: {
    questions?: QuestionItem[];
  };
  metadata?: {
    answers?: string[][];
    truncated?: boolean;
    [key: string]: unknown;
  };
};

export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TodoPriority = 'low' | 'medium' | 'high';

export type TodoItem = {
  content: string;
  status: TodoStatus;
  priority?: TodoPriority;
};

export type TodoWritePart = ToolPartBase & {
  toolName: 'todowrite' | 'todoread';
  input: {
    todos?: TodoItem[];
  };
  metadata?: {
    todos?: TodoItem[];
    truncated?: boolean;
    [key: string]: unknown;
  };
};

export type SubagentPart = ToolPartBase & {
  input: {
    command: string;
    description: string;
    prompt: string;
    subagent_type: string;
  };
  metadata: {
    parentSessionId: string;
    sessionId: string;
    model: {
      providerID: string;
      modelID: string;
    };
  };
};

export type GenericToolPart = ToolPartBase;
