import { create } from 'zustand';

interface KeepMountedState {
  ids: Record<string, boolean>;
  setKeep: (id: string, keep: boolean) => void;
}

export const useKeepMountedStore = create<KeepMountedState>((set) => ({
  ids: {},
  setKeep: (id, keep) =>
    set((s) => {
      if (keep) {
        if (s.ids[id]) return s;
        return { ids: { ...s.ids, [id]: true } };
      }
      if (!(id in s.ids)) return s;
      const next = { ...s.ids };
      delete next[id];
      return { ids: next };
    }),
}));
