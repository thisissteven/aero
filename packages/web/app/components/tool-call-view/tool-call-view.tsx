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
  blockId,
}: {
  part: ToolPart;
  blockId: string;
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
      return <EditToolView part={part as EditPart} blockId={blockId} />;

    case 'apply_patch':
      return <PatchToolView part={part as PatchPart} blockId={blockId} />;

    // Read tools
    case 'read':
    case 'view':
    case 'file_read':
    case 'cat':
      return <ReadToolView part={part as ReadPart} blockId={blockId} />;

    // Shell / Execution tools
    case 'bash':
    case 'shell':
    case 'cmd':
    case 'terminal':
      return <BashToolView part={part as BashPart} blockId={blockId} />;

    // Directory search tools
    case 'search':
    case 'grep':
    case 'find':
    case 'ripgrep':
      return <SearchToolView part={part as SearchPart} blockId={blockId} />;

    case 'glob':
      return <GlobToolView part={part as GlobPart} blockId={blockId} />;

    case 'lsp':
      return <LspToolView part={part as LspPart} blockId={blockId} />;

    case 'skill':
      return <SkillToolView part={part as SkillPart} blockId={blockId} />;

    // Network / Web tools
    case 'fetch':
    case 'curl':
    case 'wget':
    case 'webfetch':
      return <WebFetchToolView part={part as WebFetchPart} blockId={blockId} />;

    case 'web-search':
    case 'websearch':
    case 'search_web':
    case 'codesearch':
    case 'google':
    case 'bing':
    case 'duckduckgo':
    case 'perplexity':
      return (
        <WebSearchToolView part={part as WebSearchPart} blockId={blockId} />
      );

    case 'question':
      return <QuestionToolView part={part as QuestionPart} blockId={blockId} />;

    case 'todowrite':
    case 'todoread':
      return <TodoToolView part={part as TodoWritePart} blockId={blockId} />;

    // Catch-all default tool view
    default:
      return <GenericToolView part={part} blockId={blockId} />;
  }
});

ToolCallView.displayName = 'ToolCallView';
