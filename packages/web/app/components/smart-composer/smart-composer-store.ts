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
  segments:
    | ComposerSegment[]
    | Array<{
        type: 'shell';
        text: string;
      }>;
}

interface ComposerState {
  composerOpen: boolean;
  segments: ComposerSegment[];
  mode: ComposerMode;

  history: ComposerSnapshot[];
  historyIndex: number;

  payload: ComposerPayload | null;

  setComposerOpen: (composerOpen: boolean) => void;
  setSegments: (segments: ComposerSegment[]) => void;
  setMode: (mode: ComposerMode) => void;
  setPayload: (payload: ComposerPayload | null) => void;

  initializeHistory: (snapshot: ComposerSnapshot) => void;
  commitHistory: (snapshot: ComposerSnapshot) => void;

  undo: () => ComposerSnapshot | null;
  redo: () => ComposerSnapshot | null;

  reset: () => void;
}

export const useComposerStore = create<ComposerState>((set, get) => ({
  composerOpen: false,
  segments: [],
  mode: 'normal',

  history: [],
  historyIndex: -1,

  payload: null,

  setComposerOpen: (composerOpen) => {
    set({
      composerOpen,
    });
  },

  setSegments: (segments) => {
    set({
      segments: cloneSegments(segments),
    });
  },

  setMode: (mode) => {
    set({ mode });
  },

  setPayload: (payload) => {
    set({ payload });
  },

  initializeHistory: (snapshot) => {
    const cloned = {
      segments: cloneSegments(snapshot.segments),
      caret: snapshot.caret,
      mode: snapshot.mode,
    };

    set({
      segments: cloneSegments(snapshot.segments),
      mode: snapshot.mode,
      history: [cloned],
      historyIndex: 0,
    });
  },

  commitHistory: (snapshot) => {
    const { history, historyIndex } = get();

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

    set({
      history: nextHistory,
      historyIndex: nextHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();

    if (historyIndex <= 0) {
      return null;
    }

    const nextIndex = historyIndex - 1;
    const snapshot = history[nextIndex];

    set({
      historyIndex: nextIndex,
      segments: cloneSegments(snapshot.segments),
      mode: snapshot.mode,
    });

    return snapshot;
  },

  redo: () => {
    const { history, historyIndex } = get();

    if (historyIndex >= history.length - 1) {
      return null;
    }

    const nextIndex = historyIndex + 1;
    const snapshot = history[nextIndex];

    set({
      historyIndex: nextIndex,
      segments: cloneSegments(snapshot.segments),
      mode: snapshot.mode,
    });

    return snapshot;
  },

  reset: () => {
    set({
      segments: [],
      mode: 'normal',
      history: [],
      historyIndex: -1,
      payload: null,
    });
  },
}));

/**
 * Derived selectors.
 *
 * Don't store `isEmpty` separately.
 * It is a property of the actual composer model.
 */
export const composerSelectors = {
  segments: (state: ComposerState) => state.segments,

  mode: (state: ComposerState) => state.mode,

  isEmpty: (state: ComposerState) => state.segments.length === 0,

  text: (state: ComposerState) => buildText(state.segments),

  canUndo: (state: ComposerState) => state.historyIndex > 0,

  canRedo: (state: ComposerState) =>
    state.historyIndex < state.history.length - 1,
};
