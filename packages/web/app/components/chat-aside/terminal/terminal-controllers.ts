export const terminalControllers = new Map<
  string,
  {
    runCommand: (command: string) => boolean;
    stopCommand: () => boolean;
  }
>();

export function getTerminalController(sessionId: string) {
  return terminalControllers.get(sessionId);
}

export function runTerminalCommand(sessionId: string, command: string) {
  return terminalControllers.get(sessionId)?.runCommand(command) ?? false;
}

export function stopTerminalCommand(sessionId: string) {
  return terminalControllers.get(sessionId)?.stopCommand() ?? false;
}
