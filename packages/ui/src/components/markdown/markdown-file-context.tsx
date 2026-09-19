import { createContext } from 'react';

interface MarkdownFileContextValue {
  isFile?: (path: string) => boolean;
  onFileClick?: (path: string) => void;
  isStreamingBlock?: boolean;
}

export const MarkdownFileContext = createContext<MarkdownFileContextValue>({});
