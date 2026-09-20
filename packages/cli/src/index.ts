#!/usr/bin/env node

import { Command } from 'commander';
import {
  checkServer,
  getHost,
  getServerPort,
  isServerChild,
  killServer,
  readPid,
  removePid,
  startServer,
} from './lib/server.js';

const program = new Command();

program
  .name('aero')
  .description('Aero CLI — unified interface for AI coding harnesses')
  .version('0.0.0');

function portOption(): number {
  return Number(program.opts().port) || getServerPort();
}

function hostOption(): string {
  return program.opts().host ?? getHost();
}

program
  .option('-p, --port <port>', 'Web server port', String(getServerPort()))
  .option('--host <host>', 'Bind address', getHost())
  .option('--lan', 'Bind to 0.0.0.0 for LAN access')
  .option('--foreground', 'Run server in foreground')
  .option('--no-daemon', 'Alias for --foreground')
  .option('--ui-password [password]', 'Protect browser UI with a password')
  .option(
    '--api-only',
    'Start API routes only, without serving browser UI assets',
  )
  .option('--server <url>', 'Public/server URL for connect-url links')
  .option('--relay', 'connect-url: also include relay transport');

program
  .command('serve')
  .description('Start the web server (daemon default)')
  .action(async () => {
    if (isServerChild()) {
      console.error('Already inside a server child; refusing to spawn again.');
      process.exit(1);
    }

    const port = portOption();
    const host = program.opts().lan ? '0.0.0.0' : hostOption();

    if (await checkServer(port, host)) {
      console.log(`Server already running on port ${port}`);
      return;
    }

    const pid = startServer(port, host);
    console.log(`Started server (PID ${pid}) on http://${host}:${port}`);
  });

program
  .command('stop')
  .description('Stop running instance(s)')
  .action(async () => {
    const pid = readPid();
    if (!pid) {
      console.log('No running server PID found');
      return;
    }
    killServer(pid);
    removePid();
    console.log(`Stopped server (PID ${pid})`);
  });

program
  .command('restart')
  .description('Stop and start the server')
  .action(async () => {
    if (isServerChild()) {
      console.error('Already inside a server child; refusing to spawn again.');
      process.exit(1);
    }

    const pid = readPid();
    if (pid) {
      killServer(pid);
      removePid();
      console.log(`Stopped server (PID ${pid})`);
    }

    const port = portOption();
    const host = program.opts().lan ? '0.0.0.0' : hostOption();
    const newPid = startServer(port, host);
    console.log(`Restarted server (PID ${newPid}) on http://${host}:${port}`);
  });

program
  .command('status')
  .description('Show server status')
  .action(async () => {
    const port = portOption();
    const host = hostOption();
    const running = await checkServer(port, host);
    const pid = readPid();
    if (running && pid) {
      console.log(`Server running on port ${port} (PID ${pid})`);
    } else if (running) {
      console.log(`Server running on port ${port}`);
    } else {
      console.log(`Server not running (checked ${host}:${port})`);
    }
  });

program
  .command('session')
  .description('Create, inspect, and read Aero sessions')
  .argument('[action]', 'list | create | get')
  .argument('[id]', 'session ID')
  .action(async (action?: string, id?: string) => {
    const port = portOption();
    const host = hostOption();
    const base = `http://${host}:${port}`;
    try {
      if (!action || action === 'list') {
        const res = await fetch(`${base}/api/sessions?limit=20`, {
          signal: AbortSignal.timeout(3000),
        });
        const data = await res.json();
        console.log('Sessions:', JSON.stringify(data, null, 2));
      } else if (action === 'get' && id) {
        const res = await fetch(`${base}/api/sessions/${id}`, {
          signal: AbortSignal.timeout(3000),
        });
        const session = await res.json();
        console.log('Session:', JSON.stringify(session, null, 2));
      } else if (action === 'create') {
        const res = await fetch(`${base}/api/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'CLI session' }),
          signal: AbortSignal.timeout(3000),
        });
        const session = await res.json();
        console.log('Created session:', JSON.stringify(session, null, 2));
      } else {
        console.log(`Unknown session action: ${action}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Session command failed:', msg);
    }
  });

program
  .command('models')
  .description('Show default and favorite models')
  .action(async () => {
    console.log('Models: (calls harness adapter)');
    console.log('  - Default: opencode');
    console.log('  - Provider: opencode');
  });

program
  .command('projects')
  .description('Show configured projects and IDs')
  .action(async () => {
    console.log('Projects: (calls harness adapter)');
  });

program
  .command('control')
  .description('Show Aero control-plane commands')
  .action(async () => {
    console.log('Control commands available:');
    console.log('  serve, stop, restart, status');
    console.log('  session, models, projects');
  });

program
  .command('connect-url')
  .description('Generate URL/QR for connecting another client')
  .option('-q, --qr', 'Show QR code')
  .action(async () => {
    const serverUrl =
      program.opts().server || `http://localhost:${portOption()}`;
    const url = `${serverUrl}/`;
    console.log('Connect URL:', url);
    if (program.opts().qr) {
      console.log('QR code would be generated for:', url);
    }
  });

program
  .command('update')
  .description('Check for and install updates')
  .action(async () => {
    console.log('Update check not yet implemented');
  });

program
  .command('schedule')
  .description('Manage scheduled tasks')
  .action(async () => {
    console.log('Schedule command not yet implemented');
  });

program
  .command('tunnel')
  .description('Tunnel lifecycle commands')
  .action(async () => {
    console.log('Tunnel command not yet implemented');
  });

program
  .command('startup')
  .description('Manage launch at system startup')
  .action(async () => {
    console.log('Startup command not yet implemented');
  });

program
  .command('logs')
  .description('Tail Aero logs')
  .action(async () => {
    console.log('Logs: tailing ~/.aero/logs/');
  });

program.parse();
