import { create } from 'zustand';

import type { ComposerSegment } from './smart-composer-helpers';
import {
  buildText,
  cloneSegments,
  segmentsEqual,
} from './smart-composer-helpers';

export type ComposerMode = 'normal' | 'shell';

export interface ComposerSnapshot {
  segments: ComposerSegment[];
  caret: number;
  mode: ComposerMode;
}

export interface ComposerPayload {
  text: string;
  segments: ComposerSegment[] | Array<{ type: 'shell'; text: string }>;
}

/** State carried for a single chat session. */
export interface SessionComposerState {
  composerOpen: boolean;
  segments: ComposerSegment[];
  mode: ComposerMode;

  history: ComposerSnapshot[];
  historyIndex: number;

  payload: ComposerPayload | null;
}

interface ComposerState {
  sessions: Record<string, SessionComposerState>;

  setComposerOpen: (sessionId: string, composerOpen: boolean) => void;
  setSegments: (sessionId: string, segments: ComposerSegment[]) => void;
  setMode: (sessionId: string, mode: ComposerMode) => void;
  setPayload: (sessionId: string, payload: ComposerPayload | null) => void;

  initializeHistory: (sessionId: string, snapshot: ComposerSnapshot) => void;
  commitHistory: (sessionId: string, snapshot: ComposerSnapshot) => void;

  undo: (sessionId: string) => ComposerSnapshot | null;
  redo: (sessionId: string) => ComposerSnapshot | null;

  /** Clears one session's composer. */
  reset: (sessionId: string) => void;

  /** Clears every session's composer. */
  resetAll: () => void;
}

/** Stable empty composer for sessions that have no state yet. */
export const EMPTY_COMPOSER_SESSION: SessionComposerState = {
  composerOpen: false,
  segments: [],
  mode: 'normal',
  history: [],
  historyIndex: -1,
  payload: null,
};

export const getComposerSession = (
  state: ComposerState,
  sessionId: string,
): SessionComposerState => state.sessions[sessionId] ?? EMPTY_COMPOSER_SESSION;

function patchSession(
  state: ComposerState,
  sessionId: string,
  patch: Partial<SessionComposerState>,
): Pick<ComposerState, 'sessions'> {
  const current = state.sessions[sessionId] ?? EMPTY_COMPOSER_SESSION;
  return {
    sessions: {
      ...state.sessions,
      [sessionId]: { ...current, ...patch },
    },
  };
}

export const useComposerStore = create<ComposerState>((set, get) => ({
  sessions: {},

  setComposerOpen: (sessionId, composerOpen) =>
    set((state) => patchSession(state, sessionId, { composerOpen })),

  setSegments: (sessionId, segments) =>
    set((state) =>
      patchSession(state, sessionId, { segments: cloneSegments(segments) }),
    ),

  setMode: (sessionId, mode) =>
    set((state) => patchSession(state, sessionId, { mode })),

  setPayload: (sessionId, payload) =>
    set((state) => patchSession(state, sessionId, { payload })),

  initializeHistory: (sessionId, snapshot) => {
    const cloned: ComposerSnapshot = {
      segments: cloneSegments(snapshot.segments),
      caret: snapshot.caret,
      mode: snapshot.mode,
    };

    set((state) =>
      patchSession(state, sessionId, {
        segments: cloneSegments(snapshot.segments),
        mode: snapshot.mode,
        history: [cloned],
        historyIndex: 0,
      }),
    );
  },

  commitHistory: (sessionId, snapshot) => {
    const { history, historyIndex } = getComposerSession(get(), sessionId);

    const current = history[historyIndex];

    if (
      current &&
      segmentsEqual(current.segments, snapshot.segments) &&
      current.caret === snapshot.caret &&
      current.mode === snapshot.mode
    ) {
      return;
    }

    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push({
      segments: cloneSegments(snapshot.segments),
      caret: snapshot.caret,
      mode: snapshot.mode,
    });

    set((state) =>
      patchSession(state, sessionId, {
        history: nextHistory,
        historyIndex: nextHistory.length - 1,
      }),
    );
  },

  undo: (sessionId) => {
    const { history, historyIndex } = getComposerSession(get(), sessionId);

    if (historyIndex <= 0) {
      return null;
    }

    const nextIndex = historyIndex - 1;
    const snapshot = history[nextIndex];

    set((state) =>
      patchSession(state, sessionId, {
        historyIndex: nextIndex,
        segments: cloneSegments(snapshot.segments),
        mode: snapshot.mode,
      }),
    );

    return snapshot;
  },

  redo: (sessionId) => {
    const { history, historyIndex } = getComposerSession(get(), sessionId);

    if (historyIndex >= history.length - 1) {
      return null;
    }

    const nextIndex = historyIndex + 1;
    const snapshot = history[nextIndex];

    set((state) =>
      patchSession(state, sessionId, {
        historyIndex: nextIndex,
        segments: cloneSegments(snapshot.segments),
        mode: snapshot.mode,
      }),
    );

    return snapshot;
  },

  reset: (sessionId) =>
    set((state) => {
      const next = { ...state.sessions };
      delete next[sessionId];
      return { sessions: next };
    }),

  resetAll: () => set({ sessions: {} }),
}));

/**
 * Derived selectors. All take a `sessionId` and return a `(state) => value`
 * function so they compose with `useComposerStore(...)`.
 */
export const composerSelectors = {
  segments: (sessionId: string) => (state: ComposerState) =>
    getComposerSession(state, sessionId).segments,

  mode: (sessionId: string) => (state: ComposerState) =>
    getComposerSession(state, sessionId).mode,

  isEmpty: (sessionId: string) => (state: ComposerState) =>
    getComposerSession(state, sessionId).segments.length === 0,

  text: (sessionId: string) => (state: ComposerState) =>
    buildText(getComposerSession(state, sessionId).segments),

  canUndo: (sessionId: string) => (state: ComposerState) =>
    getComposerSession(state, sessionId).historyIndex > 0,

  canRedo: (sessionId: string) => (state: ComposerState) => {
    const s = getComposerSession(state, sessionId);
    return s.historyIndex < s.history.length - 1;
  },
};
