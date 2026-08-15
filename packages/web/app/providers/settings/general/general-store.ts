import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type KeymapOption = 'default' | 'vim';
export type TransportOption = 'auto' | 'websocket' | 'sse';

interface GeneralState {
  // Desktop Network Access
  startOnLogin: boolean;
  minimizeToTray: boolean;
  keepAwake: boolean;
  desktopPassword: string;
  allowNetworkAccess: boolean;

  // OpenCode CLI
  binaryPath: string;
  showUpdateNotifications: boolean;
  agentControlTool: boolean;

  // Navigation
  keymap: KeymapOption;
  autoSave: boolean;
  alwaysShowToolbar: boolean;
  terminalQuickKeys: boolean;
  terminalShell: string;

  // Message Stream Transport
  streamTransport: TransportOption;

  // Privacy
  sendUsageReports: boolean;

  // Setters
  setStartOnLogin: (val: boolean) => void;
  setMinimizeToTray: (val: boolean) => void;
  setKeepAwake: (val: boolean) => void;
  setDesktopPassword: (val: string) => void;
  setAllowNetworkAccess: (val: boolean) => void;
  setBinaryPath: (val: string) => void;
  setShowUpdateNotifications: (val: boolean) => void;
  setAgentControlTool: (val: boolean) => void;
  setKeymap: (val: KeymapOption) => void;
  setAutoSave: (val: boolean) => void;
  setAlwaysShowToolbar: (val: boolean) => void;
  setTerminalQuickKeys: (val: boolean) => void;
  setTerminalShell: (val: string) => void;
  setStreamTransport: (val: TransportOption) => void;
  setSendUsageReports: (val: boolean) => void;
}

export const useGeneralStore = create<GeneralState>()(
  persist(
    (set) => ({
      startOnLogin: false,
      minimizeToTray: false,
      keepAwake: false,
      desktopPassword: '',
      allowNetworkAccess: false,

      binaryPath: 'C:\\Program Files\\nodejs\\opencode',
      showUpdateNotifications: true,
      agentControlTool: true,

      keymap: 'default',
      autoSave: false,
      alwaysShowToolbar: true,
      terminalQuickKeys: false,
      terminalShell: 'auto',

      streamTransport: 'auto',
      sendUsageReports: true,

      setStartOnLogin: (startOnLogin) => set({ startOnLogin }),
      setMinimizeToTray: (minimizeToTray) => set({ minimizeToTray }),
      setKeepAwake: (keepAwake) => set({ keepAwake }),
      setDesktopPassword: (desktopPassword) => set({ desktopPassword }),
      setAllowNetworkAccess: (allowNetworkAccess) =>
        set({ allowNetworkAccess }),
      setBinaryPath: (binaryPath) => set({ binaryPath }),
      setShowUpdateNotifications: (showUpdateNotifications) =>
        set({ showUpdateNotifications }),
      setAgentControlTool: (agentControlTool) => set({ agentControlTool }),
      setKeymap: (keymap) => set({ keymap }),
      setAutoSave: (autoSave) => set({ autoSave }),
      setAlwaysShowToolbar: (alwaysShowToolbar) => set({ alwaysShowToolbar }),
      setTerminalQuickKeys: (terminalQuickKeys) => set({ terminalQuickKeys }),
      setTerminalShell: (terminalShell) => set({ terminalShell }),
      setStreamTransport: (streamTransport) => set({ streamTransport }),
      setSendUsageReports: (sendUsageReports) => set({ sendUsageReports }),
    }),
    {
      name: 'aero-general-settings',
    },
  ),
);
