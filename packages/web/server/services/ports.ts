import { exec } from 'child_process';
import * as os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface OpenPort {
  protocol: string;
  localAddress: string;
  port: number;
  pid: number | null;
  processName?: string;
}

/**
 * Parses lsof output (macOS)
 */
function parseLsof(stdout: string): OpenPort[] {
  const lines = stdout.trim().split('\n');
  const ports: OpenPort[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (parts.length < 9) continue;

    const processName = parts[0];
    const pid = parseInt(parts[1], 10);
    const protocol = parts[4].toLowerCase().includes('udp') ? 'UDP' : 'TCP';
    const nameField = parts[8] || parts[parts.length - 1];

    // Extract address and port (e.g., "*:8080" or "127.0.0.1:3000")
    const portMatch = nameField.match(/(?:.*:)?(\d+)$/);
    if (portMatch) {
      const port = parseInt(portMatch[1], 10);
      const addressMatch = nameField.match(/^(.*):/);
      const localAddress = addressMatch ? addressMatch[1] : '*';

      ports.push({
        protocol,
        localAddress,
        port,
        pid: isNaN(pid) ? null : pid,
        processName,
      });
    }
  }

  return ports;
}

/**
 * Parses ss output (Linux)
 */
function parseSS(stdout: string): OpenPort[] {
  const lines = stdout.trim().split('\n');
  const ports: OpenPort[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (parts.length < 5) continue;

    const netid = parts[0].toUpperCase();
    const localAddrPort = parts[4];

    // Extract PID and Process Name from users:(("node",pid=1234,fd=3))
    let pid: number | null = null;
    let processName: string | undefined = undefined;

    const usersField = line.match(/users:\(\("([^"]+)",pid=(\d+)/);
    if (usersField) {
      processName = usersField[1];
      pid = parseInt(usersField[2], 10);
    }

    const lastColonPos = localAddrPort.lastIndexOf(':');
    if (lastColonPos !== -1) {
      const address = localAddrPort.substring(0, lastColonPos);
      const port = parseInt(localAddrPort.substring(lastColonPos + 1), 10);

      if (!isNaN(port)) {
        ports.push({
          protocol: netid.includes('UDP') ? 'UDP' : 'TCP',
          localAddress: address || '*',
          port,
          pid,
          processName,
        });
      }
    }
  }

  return ports;
}

/**
 * Parses netstat output (Windows)
 */
function parseNetstatWin(stdout: string): OpenPort[] {
  const lines = stdout.trim().split('\n');
  const ports: OpenPort[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('TCP') && !trimmed.startsWith('UDP')) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length < 4) continue;

    const protocol = parts[0];
    const localAddrPort = parts[1];
    const stateOrPid = parts[parts.length - 1];

    const lastColonPos = localAddrPort.lastIndexOf(':');
    if (lastColonPos !== -1) {
      const address = localAddrPort.substring(0, lastColonPos);
      const port = parseInt(localAddrPort.substring(lastColonPos + 1), 10);
      const pid = parseInt(stateOrPid, 10);

      if (!isNaN(port)) {
        ports.push({
          protocol,
          localAddress: address,
          port,
          pid: isNaN(pid) ? null : pid,
        });
      }
    }
  }

  return ports;
}

/**
 * Retrieves listening ports depending on the platform
 */
export async function getListeningPorts(): Promise<OpenPort[]> {
  const platform = os.platform();

  try {
    if (platform === 'darwin') {
      const { stdout } = await execAsync('lsof -i -P -n | grep LISTEN');
      return parseLsof(stdout);
    } else if (platform === 'linux') {
      try {
        const { stdout } = await execAsync('ss -tulpn state listening');
        return parseSS(stdout);
      } catch {
        // Fallback to netstat if ss is unavailable
        const { stdout } = await execAsync('netstat -tulpn | grep LISTEN');
        return parseSS(stdout);
      }
    } else if (platform === 'win32') {
      const { stdout } = await execAsync('netstat -ano | findstr LISTENING');
      return parseNetstatWin(stdout);
    } else {
      throw new Error(`Unsupported operating system: ${platform}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // Command return code 1 often means "no matches found" from grep/findstr
    if (error.code === 1) {
      return [];
    }
    throw error;
  }
}

export async function getLocalhostPorts(): Promise<string[]> {
  const rawPorts = await getListeningPorts();

  // Extract unique numeric ports and sort them in ascending order
  const uniquePorts = Array.from(
    new Set(rawPorts.map((item) => item.port)),
  ).sort((a, b) => a - b);

  // Map to "localhost:<port>" format
  return uniquePorts.map((port) => `localhost:${port}`);
}
