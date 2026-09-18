import { logger } from '@aero/ui';
import { create } from 'zustand';

/* ------------------------------------------------------------------ */
/*  Domain types                                                       */
/* ------------------------------------------------------------------ */

export interface ExternalFileAttachment {
  id: string;
  mime: string;
  filename: string;
  url: string;
  file: File;
}

export interface ChatQuoteItem {
  id: string;
  selection: string;
  comment: string;
  sourceMessageId?: string;
  sourceSessionId?: string;
}

export interface BrowserAnnotationItem {
  id: string;
  imageUrl: string;
  text: string;
  imageMime?: string;
  pageUrl?: string;
  pageTitle?: string;
}

export interface PendingSubtask {
  prompt: string;
  description: string;
  agent: string;
  model?: { providerID: string; modelID: string };
  command?: string;
}

/** State carried for a single chat session. */
export interface SessionExternalPartsState {
  fileAttachments: ExternalFileAttachment[];
  chatQuotes: ChatQuoteItem[];
  browserAnnotations: BrowserAnnotationItem[];
  subtask: PendingSubtask | null;
}

export interface ExternalPartsState {
  /** Per-session buckets keyed by session id. */
  sessions: Record<string, SessionExternalPartsState>;

  addFileAttachment: (sessionId: string, file: File) => string;
  addFileAttachments: (sessionId: string, files: Iterable<File>) => string[];
  removeFileAttachment: (sessionId: string, id: string) => void;
  clearFileAttachments: (sessionId: string) => void;

  addChatQuote: (sessionId: string, quote: Omit<ChatQuoteItem, 'id'>) => string;
  updateChatQuote: (
    sessionId: string,
    id: string,
    patch: Partial<Omit<ChatQuoteItem, 'id'>>,
  ) => void;
  removeChatQuote: (sessionId: string, id: string) => void;
  clearChatQuotes: (sessionId: string) => void;

  addBrowserAnnotation: (
    sessionId: string,
    annotation: Omit<BrowserAnnotationItem, 'id'>,
  ) => string;
  removeBrowserAnnotation: (sessionId: string, id: string) => void;
  clearBrowserAnnotations: (sessionId: string) => void;

  setSubtask: (sessionId: string, subtask: PendingSubtask | null) => void;

  /** Clears one session's bucket. Call after a successful send. */
  reset: (sessionId: string) => void;

  /** Clears every session. Use sparingly (logout, hard reset). */
  resetAll: () => void;
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

/** Stable empty bucket shared by every session that has no state yet. */
export const EMPTY_EXTERNAL_PARTS_SESSION: SessionExternalPartsState = {
  fileAttachments: [],
  chatQuotes: [],
  browserAnnotations: [],
  subtask: null,
};

/** Read a session bucket, falling back to the stable empty object. */
export const getExternalPartsSession = (
  state: ExternalPartsState,
  sessionId: string,
): SessionExternalPartsState =>
  state.sessions[sessionId] ?? EMPTY_EXTERNAL_PARTS_SESSION;

/** Produce a new `sessions` map with one bucket patched. Auto-creates. */
function patchSession(
  state: ExternalPartsState,
  sessionId: string,
  patch: Partial<SessionExternalPartsState>,
): Pick<ExternalPartsState, 'sessions'> {
  const current = state.sessions[sessionId] ?? EMPTY_EXTERNAL_PARTS_SESSION;
  return {
    sessions: {
      ...state.sessions,
      [sessionId]: { ...current, ...patch },
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useExternalPartsStore = create<ExternalPartsState>((set, get) => ({
  sessions: {},

  addFileAttachment: (sessionId, file) => {
    const id = generateId();
    const url = URL.createObjectURL(file);
    const attachment: ExternalFileAttachment = {
      id,
      url,
      file,
      filename: file.name,
      mime: file.type || 'application/octet-stream',
    };

    set((state) => {
      const current = getExternalPartsSession(state, sessionId);
      return patchSession(state, sessionId, {
        fileAttachments: [...current.fileAttachments, attachment],
      });
    });

    return id;
  },

  addFileAttachments: (sessionId, files) =>
    Array.from(files, (file) => get().addFileAttachment(sessionId, file)),

  removeFileAttachment: (sessionId, id) => {
    const session = getExternalPartsSession(get(), sessionId);
    const target = session.fileAttachments.find((a) => a.id === id);
    if (target) revokeIfBlobUrl(target.url);

    set((state) =>
      patchSession(state, sessionId, {
        fileAttachments: getExternalPartsSession(
          state,
          sessionId,
        ).fileAttachments.filter((a) => a.id !== id),
      }),
    );
  },

  clearFileAttachments: (sessionId) => {
    const session = getExternalPartsSession(get(), sessionId);
    for (const a of session.fileAttachments) revokeIfBlobUrl(a.url);

    set((state) => patchSession(state, sessionId, { fileAttachments: [] }));
  },

  addChatQuote: (sessionId, quote) => {
    const id = generateId();
    set((state) =>
      patchSession(state, sessionId, {
        chatQuotes: [
          ...getExternalPartsSession(state, sessionId).chatQuotes,
          { ...quote, id },
        ],
      }),
    );
    return id;
  },

  updateChatQuote: (sessionId, id, patch) =>
    set((state) =>
      patchSession(state, sessionId, {
        chatQuotes: getExternalPartsSession(state, sessionId).chatQuotes.map(
          (q) => (q.id === id ? { ...q, ...patch } : q),
        ),
      }),
    ),

  removeChatQuote: (sessionId, id) =>
    set((state) =>
      patchSession(state, sessionId, {
        chatQuotes: getExternalPartsSession(state, sessionId).chatQuotes.filter(
          (q) => q.id !== id,
        ),
      }),
    ),

  clearChatQuotes: (sessionId) =>
    set((state) => patchSession(state, sessionId, { chatQuotes: [] })),

  addBrowserAnnotation: (sessionId, annotation) => {
    const id = generateId();
    set((state) =>
      patchSession(state, sessionId, {
        browserAnnotations: [
          ...getExternalPartsSession(state, sessionId).browserAnnotations,
          { ...annotation, id },
        ],
      }),
    );
    return id;
  },

  removeBrowserAnnotation: (sessionId, id) =>
    set((state) =>
      patchSession(state, sessionId, {
        browserAnnotations: getExternalPartsSession(
          state,
          sessionId,
        ).browserAnnotations.filter((a) => a.id !== id),
      }),
    ),

  clearBrowserAnnotations: (sessionId) =>
    set((state) => patchSession(state, sessionId, { browserAnnotations: [] })),

  setSubtask: (sessionId, subtask) =>
    set((state) => patchSession(state, sessionId, { subtask })),

  reset: (sessionId) => {
    const session = getExternalPartsSession(get(), sessionId);
    for (const a of session.fileAttachments) revokeIfBlobUrl(a.url);

    set((state) => {
      const next = { ...state.sessions };
      delete next[sessionId];
      return { sessions: next };
    });
  },

  resetAll: () => {
    for (const session of Object.values(get().sessions)) {
      for (const a of session.fileAttachments) revokeIfBlobUrl(a.url);
    }
    set({ sessions: {} });
  },
}));
