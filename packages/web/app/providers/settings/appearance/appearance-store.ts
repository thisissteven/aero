import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ColorTheme } from '@/app/providers/theme';

export type ControlsPosition = 'left' | 'right';
export type ControlsStyle = 'classic' | 'traffic-lights';

interface AppearanceState {
  lightTheme: ColorTheme;
  darkTheme: ColorTheme;

  controlsPosition: ControlsPosition;
  controlsStyle: ControlsStyle;

  language: string;

  setLightTheme: (theme: ColorTheme) => void;
  setDarkTheme: (theme: ColorTheme) => void;
  setControlsPosition: (position: ControlsPosition) => void;
  setControlsStyle: (style: ControlsStyle) => void;
  setLanguage: (language: string) => void;
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      lightTheme: 'aero',
      darkTheme: 'aero',
      controlsPosition: 'right',
      controlsStyle: 'classic',
      language: 'en',

      setLightTheme: (lightTheme) => set({ lightTheme }),
      setDarkTheme: (darkTheme) => set({ darkTheme }),
      setControlsPosition: (controlsPosition) => set({ controlsPosition }),
      setControlsStyle: (controlsStyle) => set({ controlsStyle }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'aero-appearance-settings',
    },
  ),
);
