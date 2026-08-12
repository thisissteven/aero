import { create } from 'zustand';

export interface SpeechSettings {
  rate: number; // 0.1 to 10 (default 1)
  pitch: number; // 0 to 2 (default 1)
  volume: number; // 0 to 1 (default 1)
  voiceURI: string | null;
}

interface SpeechState {
  // State
  activeId: string | null;
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  settings: SpeechSettings;

  // Actions
  play: (id: string, text: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  toggle: (id: string, text: string) => void;
  setVoice: (voiceURI: string | null) => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
  setVolume: (volume: number) => void;
  updateSettings: (settings: Partial<SpeechSettings>) => void;
  loadVoices: () => void;
}

const isBrowser = typeof window !== 'undefined' && 'speechSynthesis' in window;

export const useSpeechStore = create<SpeechState>((set, get) => {
  // Internal reference to current utterance to prevent Chrome garbage collection bugs
  let currentUtterance: SpeechSynthesisUtterance | null = null;

  return {
    activeId: null,
    isSpeaking: false,
    isPaused: false,
    isSupported: isBrowser,
    voices: [],
    settings: {
      rate: 1,
      pitch: 1,
      volume: 1,
      voiceURI: null,
    },

    loadVoices: () => {
      if (!isBrowser) return;
      const voices = window.speechSynthesis.getVoices();
      set({ voices });
    },

    stop: () => {
      if (isBrowser) {
        window.speechSynthesis.cancel();
      }
      currentUtterance = null;
      set({ activeId: null, isSpeaking: false, isPaused: false });
    },

    pause: () => {
      if (isBrowser && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        set({ isPaused: true });
      }
    },

    resume: () => {
      if (isBrowser && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        set({ isPaused: false });
      }
    },

    play: (id: string, text: string) => {
      if (!isBrowser) {
        // eslint-disable-next-line no-console
        console.warn(
          'SpeechSynthesis API is not supported in this environment.',
        );
        return;
      }

      // Cancel ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      currentUtterance = utterance;

      const { settings, voices } = get();

      // Apply Voice settings
      if (settings.voiceURI) {
        const selectedVoice = voices.find(
          (v) => v.voiceURI === settings.voiceURI,
        );
        if (selectedVoice) utterance.voice = selectedVoice;
      }

      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;

      // Event handlers
      utterance.onstart = () => {
        set({ activeId: id, isSpeaking: true, isPaused: false });
      };

      utterance.onend = () => {
        currentUtterance = null;
        set({ activeId: null, isSpeaking: false, isPaused: false });
      };

      utterance.onerror = () => {
        currentUtterance = null;
        set({ activeId: null, isSpeaking: false, isPaused: false });
      };

      utterance.onpause = () => {
        set({ isPaused: true });
      };

      utterance.onresume = () => {
        set({ isPaused: false });
      };

      window.speechSynthesis.speak(utterance);
    },

    toggle: (id: string, text: string) => {
      const { activeId, isSpeaking, stop, play } = get();
      if (activeId === id && isSpeaking) {
        stop();
      } else {
        play(id, text);
      }
    },

    setVoice: (voiceURI) =>
      set((state) => ({ settings: { ...state.settings, voiceURI } })),

    setRate: (rate) =>
      set((state) => ({ settings: { ...state.settings, rate } })),

    setPitch: (pitch) =>
      set((state) => ({ settings: { ...state.settings, pitch } })),

    setVolume: (volume) =>
      set((state) => ({ settings: { ...state.settings, volume } })),

    updateSettings: (newSettings) =>
      set((state) => ({ settings: { ...state.settings, ...newSettings } })),
  };
});
