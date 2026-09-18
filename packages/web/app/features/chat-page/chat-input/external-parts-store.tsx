import { create } from 'zustand';

/* ------------------------------------------------------------------ */
/*  Domain types                                                       */
/* ------------------------------------------------------------------ */

export interface ExternalFileAttachment {
  id: string;
  mime: string;
  filename: string;
  /** Object URL for the picked File. Revoked on remove / reset. */
  url: string;
  /** Underlying File, kept in case we later need to (re-)upload. */
  file: File;
}

export interface ChatQuoteItem {
  id: string;
  /** Selected text from a prior message. */
  selection: string;
  /** Optional user comment. May be empty. */
  comment: string;
  sourceMessageId?: string;
  sourceSessionId?: string;
}

export interface BrowserAnnotationItem {
  id: string;
  /** Screenshot URL / data URL. */
  imageUrl: string;
  /** Caption / comment body. */
  text: string;
  /** Defaults to image/png when building the file part. */
  imageMime?: string;
  pageUrl?: string;
  pageTitle?: string;
}

/**
 * Placeholder. Nothing sets this yet — the store just carries it so the
 * send path is ready when the subtask UX lands.
 */
export interface PendingSubtask {
  prompt: string;
  description: string;
  agent: string;
  model?: { providerID: string; modelID: string };
  command?: string;
}

export interface ExternalPartsState {
  fileAttachments: ExternalFileAttachment[];
  chatQuotes: ChatQuoteItem[];
  browserAnnotations: BrowserAnnotationItem[];
  subtask: PendingSubtask | null;

  addFileAttachment: (file: File) => string;
  addFileAttachments: (files: Iterable<File>) => string[];
  removeFileAttachment: (id: string) => void;
  clearFileAttachments: () => void;

  addChatQuote: (quote: Omit<ChatQuoteItem, 'id'>) => string;
  updateChatQuote: (
    id: string,
    patch: Partial<Omit<ChatQuoteItem, 'id'>>,
  ) => void;
  removeChatQuote: (id: string) => void;
  clearChatQuotes: () => void;

  addBrowserAnnotation: (
    annotation: Omit<BrowserAnnotationItem, 'id'>,
  ) => string;
  removeBrowserAnnotation: (id: string) => void;
  clearBrowserAnnotations: () => void;

  setSubtask: (subtask: PendingSubtask | null) => void;

  /** Clears everything. Call after a successful send. */
  reset: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const generateId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function revokeIfBlobUrl(url: string) {
  if (url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* noop */
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useExternalPartsStore = create<ExternalPartsState>((set, get) => ({
  fileAttachments: [],
  chatQuotes: [],
  browserAnnotations: [],
  subtask: null,

  addFileAttachment: (file) => {
    const id = generateId();
    const url = URL.createObjectURL(file);

    set((state) => ({
      fileAttachments: [
        ...state.fileAttachments,
        {
          id,
          url,
          file,
          filename: file.name,
          mime: file.type || 'application/octet-stream',
        },
      ],
    }));

    return id;
  },

  addFileAttachments: (files) =>
    Array.from(files, (file) => get().addFileAttachment(file)),

  removeFileAttachment: (id) => {
    const target = get().fileAttachments.find((a) => a.id === id);
    if (target) revokeIfBlobUrl(target.url);

    set((state) => ({
      fileAttachments: state.fileAttachments.filter((a) => a.id !== id),
    }));
  },

  clearFileAttachments: () => {
    for (const a of get().fileAttachments) revokeIfBlobUrl(a.url);
    set({ fileAttachments: [] });
  },

  addChatQuote: (quote) => {
    const id = generateId();
    set((state) => ({ chatQuotes: [...state.chatQuotes, { ...quote, id }] }));
    return id;
  },

  updateChatQuote: (id, patch) =>
    set((state) => ({
      chatQuotes: state.chatQuotes.map((q) =>
        q.id === id ? { ...q, ...patch } : q,
      ),
    })),

  removeChatQuote: (id) =>
    set((state) => ({
      chatQuotes: state.chatQuotes.filter((q) => q.id !== id),
    })),

  clearChatQuotes: () => set({ chatQuotes: [] }),

  addBrowserAnnotation: (annotation) => {
    const id = generateId();
    set((state) => ({
      browserAnnotations: [...state.browserAnnotations, { ...annotation, id }],
    }));
    return id;
  },

  removeBrowserAnnotation: (id) =>
    set((state) => ({
      browserAnnotations: state.browserAnnotations.filter((a) => a.id !== id),
    })),

  clearBrowserAnnotations: () => set({ browserAnnotations: [] }),

  setSubtask: (subtask) => set({ subtask }),

  reset: () => {
    for (const a of get().fileAttachments) revokeIfBlobUrl(a.url);

    set({
      fileAttachments: [],
      chatQuotes: [],
      browserAnnotations: [],
      subtask: null,
    });
  },
}));

/* ------------------------------------------------------------------ */
/*  Derived selectors                                                  */
/* ------------------------------------------------------------------ */

export const externalPartsSelectors = {
  isEmpty: (state: ExternalPartsState) =>
    state.fileAttachments.length === 0 &&
    state.chatQuotes.length === 0 &&
    state.browserAnnotations.length === 0 &&
    state.subtask === null,

  attachmentCount: (state: ExternalPartsState) => state.fileAttachments.length,
};
