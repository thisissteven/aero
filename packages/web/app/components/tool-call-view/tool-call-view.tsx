import { memo } from 'react';

import type { AeroPart } from '@/server/services/harness/types';

import {
  BashToolView,
  EditToolView,
  GenericToolView,
  GlobToolView,
  LspToolView,
  PatchToolView,
  QuestionToolView,
  ReadToolView,
  SearchToolView,
  SkillToolView,
  TodoToolView,
  WebFetchToolView,
  WebSearchToolView,
} from './tools';
import type {
  BashPart,
  EditPart,
  GlobPart,
  LspPart,
  PatchPart,
  QuestionPart,
  ReadPart,
  SearchPart,
  SkillPart,
  TodoWritePart,
  WebFetchPart,
  WebSearchPart,
} from './tools/tool-types';

type ToolPart = Extract<AeroPart, { type: 'tool' }>;

export const ToolCallView = memo(function ToolCallView({
  part,
  ...props
}: {
  part: ToolPart;
  blockId: string;
  isStreaming: boolean;
}) {
  switch (part.toolName) {
    // Edit tools
    case 'edit':
    case 'multiedit':
    case 'str_replace':
    case 'str_replace_based_edit_tool':
    case 'write':
    case 'create':
    case 'file_write':
      return <EditToolView part={part as EditPart} {...props} />;

    case 'apply_patch':
      return <PatchToolView part={part as PatchPart} {...props} />;

    // Read tools
    case 'read':
    case 'view':
    case 'file_read':
    case 'cat':
      return <ReadToolView part={part as ReadPart} {...props} />;

    // Shell / Execution tools
    case 'bash':
    case 'shell':
    case 'cmd':
    case 'terminal':
      return <BashToolView part={part as BashPart} {...props} />;

    // Directory search tools
    case 'search':
    case 'grep':
    case 'find':
    case 'ripgrep':
      return <SearchToolView part={part as SearchPart} {...props} />;

    case 'glob':
      return <GlobToolView part={part as GlobPart} {...props} />;

    case 'lsp':
      return <LspToolView part={part as LspPart} {...props} />;

    case 'skill':
      return <SkillToolView part={part as SkillPart} {...props} />;

    // Network / Web tools
    case 'fetch':
    case 'curl':
    case 'wget':
    case 'webfetch':
      return <WebFetchToolView part={part as WebFetchPart} {...props} />;

    case 'web-search':
    case 'websearch':
    case 'search_web':
    case 'codesearch':
    case 'google':
    case 'bing':
    case 'duckduckgo':
    case 'perplexity':
      return <WebSearchToolView part={part as WebSearchPart} {...props} />;

    case 'question':
      return <QuestionToolView part={part as QuestionPart} {...props} />;

    case 'todowrite':
    case 'todoread':
      return <TodoToolView part={part as TodoWritePart} {...props} />;

    // Catch-all default tool view
    default:
      return <GenericToolView part={part} {...props} />;
  }
});

ToolCallView.displayName = 'ToolCallView';
