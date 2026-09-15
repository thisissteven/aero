import { create } from 'zustand';

export type ProjectAction = 'discover-script';

interface ProjectActionsState {
  runningActions: Record<string, ProjectAction | undefined>;
  actions: {
    startAction: (projectPath: string, action: ProjectAction) => void;
    finishAction: (projectPath: string) => void;
    isActionRunning: (projectPath: string, action?: ProjectAction) => boolean;
    getRunningAction: (projectPath: string) => ProjectAction | undefined;
  };
}

export const useProjectActionsStore = create<ProjectActionsState>(
  (set, get) => ({
    runningActions: {},

    actions: {
      startAction: (projectPath, action) =>
        set((state) => ({
          runningActions: {
            ...state.runningActions,
            [projectPath]: action,
          },
        })),

      finishAction: (projectPath) =>
        set((state) => {
          const runningActions = { ...state.runningActions };
          delete runningActions[projectPath];

          return { runningActions };
        }),

      isActionRunning: (projectPath, action) => {
        const runningAction = get().runningActions[projectPath];

        return action ? runningAction === action : runningAction !== undefined;
      },

      getRunningAction: (projectPath) => get().runningActions[projectPath],
    },
  }),
);
