import { ListCheck } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { TodoWritePart } from '@/app/components/tool-call-view/tools/tool-types';

export const TodoToolView = memo(
  ({ part, blockId }: { part: TodoWritePart; blockId: string }) => {
    const todos = JSON.stringify(part.input.todos || [], null, 2);
    const count = Array.isArray(part.input.todos) ? part.input.todos.length : 0;

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={ListCheck}
        title='Update To do List'
        codeTitle='Update To do List'
        code={todos}
        language='json'
        preview={`${count} tasks`}
        copyText={todos}
      />
    );
  },
);
