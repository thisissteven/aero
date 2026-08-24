import { create } from 'zustand';

export const useActiveSessionStore = create<{ activeId: string }>(() => ({
  activeId: '',
}));

export const setActiveSessionId = (id: string) =>
  useActiveSessionStore.setState({ activeId: id });
