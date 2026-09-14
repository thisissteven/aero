import { createContext } from 'react';

interface MarkdownFileContextValue {
  isFile?: (path: string) => boolean;
  onFileClick?: (path: string) => void;
}

export const MarkdownFileContext = createContext<MarkdownFileContextValue>({});
