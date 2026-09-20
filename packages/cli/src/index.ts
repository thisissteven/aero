import { Command } from 'commander';

import {
  checkServer,
  getHost,
  getPort,
  isProcessAlive,
  killServer,
  listTrackedPorts,
  readPid,
  removePid,
  startServer,
} from './lib/server.js';

const program = new Command();

program
  .name('aero')
  .description('Aero CLI — unified interface for AI coding harnesses')
  .version('0.0.0');

program
  .option('-p, --port <port>', 'Web server port', String(getPort()))
  .option('--host <host>', 'Bind address', getHost())
  .option('--hostname <host>', 'Alias for --host outside tunnel commands')
  .option('--lan', 'Bind to 0.0.0.0 for LAN access')
  .option('--server <url>', 'Public/server URL for connect-url links')
  .option('--relay', 'connect-url: also include the relay transport')
  .option(
    '--ui-password [password]',
    'Protect browser UI with a password (generates one when omitted)',
  )
  .option(
    '--api-only',
    'Start API routes only, without serving browser UI assets',
  )
  .option(
    '--foreground',
    'Run server in foreground (use with systemd/process managers)',
  )
  .option('--no-daemon', 'Alias for --foreground');

function resolvePort(): number {
  return Number(program.opts().port) || getPort();
}

function resolveHost(): string {
  if (program.opts().lan) return '0.0.0.0';
  return program.opts().host || program.opts().hostname || getHost();
}

function resolveForeground(): boolean {
  return Boolean(program.opts().foreground) || program.opts().daemon === false;
}

// -----------------------------------------------------------------------------
// Output helpers — mirrors OpenChamber's visual language
// -----------------------------------------------------------------------------

function blank(): void {
  console.log();
}

function line(marker: string, text: string): void {
  console.log(`${marker}  ${text}`);
}

// -----------------------------------------------------------------------------
// Shared handler for bare `aero` and `aero serve`
// -----------------------------------------------------------------------------

async function runServe(): Promise<void> {
  const port = resolvePort();
  const host = resolveHost();
  const foreground = resolveForeground();

  if (await checkServer(port, host)) {
    blank();
    line('T', 'Aero is already running');
    line('|', '');
    line('*', `port ${port}`);
    line('|', '');
    line('•', `visit: http://${host}:${port}/`);
    line('|', '');
    line('—', 'daemon running');
    blank();
    return;
  }

  const opts = {
    port,
    host,
    foreground,
    apiOnly: Boolean(program.opts().apiOnly),
    uiPassword:
      typeof program.opts().uiPassword === 'string'
        ? program.opts().uiPassword
        : undefined,
    serverUrl: program.opts().server as string | undefined,
    relay: Boolean(program.opts().relay),
  };

  if (foreground) {
    blank();
    line('T', 'Aero Started (foreground)');
    line('|', '');
    line('*', `port ${port} (host ${host})`);
    line('|', '');
    line('•', `visit: http://${host}:${port}/`);
    line('|', '');
    line('—', 'press Ctrl-C to stop');
    blank();
    void startServer(opts).catch((err: Error) => {
      console.error(`Failed to start: ${err.message}`);
      process.exit(1);
    });
    return;
  }

  const envPassword = process.env.AERO_UI_PASSWORD;
  const cliPassword = opts.uiPassword;

  if (!envPassword && !cliPassword && !opts.apiOnly) {
    blank();
    line('!', 'AERO_UI_PASSWORD is not set');
    line(
      '|',
      'browser UI is unsecured. Use --ui-password or AERO_UI_PASSWORD.',
    );
    line('|', '');
  }

  let pid: number;
  try {
    pid = await startServer(opts);
  } catch (err) {
    blank();
    line('!', 'Failed to start Aero');
    line('|', (err as Error).message);
    blank();
    process.exit(1);
  }

  blank();
  line('T', 'Aero Started');
  line('|', '');
  line('*', `port ${port} (PID: ${pid})`);
  line('|', '');
  line('•', `visit: http://${host}:${port}/`);
  line('|', '');
  line('•', `logs: aero logs -p ${port}`);
  line('|', '');
  line('—', 'daemon running');
  blank();
}

// -----------------------------------------------------------------------------
// Working commands
// -----------------------------------------------------------------------------

program
  .command('serve')
  .description('Start the web server (daemon default)')
  .action(() => void runServe());

program
  .command('stop')
  .description('Stop running instance(s)')
  .option('-p, --port <port>', 'Stop only the instance on this port')
  .action((cmdOpts: { port?: string }) => {
    blank();
    line('T', 'Aero Stop');
    line('|', '');

    const onlyPort = cmdOpts.port ? Number(cmdOpts.port) : null;
    const ports = onlyPort ? [onlyPort] : listTrackedPorts();

    if (ports.length === 0) {
      line('o', 'No running instance found');
      line('|', '');
      line('—', '0 instance(s)');
      blank();
      return;
    }

    let stopped = 0;

    for (const port of ports) {
      const pid = readPid(port);
      if (!pid) {
        removePid(port);
        continue;
      }
      if (!isProcessAlive(pid)) {
        removePid(port);
        line('o', `Removed stale PID file for port ${port} (PID ${pid})`);
        continue;
      }
      killServer(pid);
      removePid(port);
      line('o', `Stopped Aero on port ${port}`);
      stopped++;
    }

    line('|', '');
    line('—', `${stopped} instance(s)`);
    blank();
  });

program
  .command('status')
  .description('Show server status')
  .action(async () => {
    const port = resolvePort();
    const host = resolveHost();
    const pid = readPid(port);
    const running = await checkServer(port, host);

    blank();
    line('T', 'Aero Status');
    line('|', '');

    if (running && pid) {
      line('*', `running on http://${host}:${port} (PID ${pid})`);
    } else if (running) {
      line('*', `running on http://${host}:${port}`);
    } else if (pid) {
      line('o', `not responding but PID file exists (PID ${pid})`);
    } else {
      line('o', 'not running');
    }

    const all = listTrackedPorts();
    if (all.length > 0) {
      line('|', '');
      line('•', `tracked ports: ${all.join(', ')}`);
    }

    line('|', '');
    line('—', running ? 'daemon running' : 'daemon stopped');
    blank();
  });

program
  .command('restart')
  .description('Stop and start the server')
  .action(async () => {
    const port = resolvePort();
    const pid = readPid(port);
    if (pid && isProcessAlive(pid)) {
      blank();
      line('T', 'Aero Restart');
      line('|', '');
      line('o', `Stopped Aero (PID ${pid})`);
      line('|', '');
      blank();

      killServer(pid);
      removePid(port);
    }
    await runServe();
  });

// -----------------------------------------------------------------------------
// Placeholder commands (match OpenChamber's surface)
// -----------------------------------------------------------------------------

const placeholders: Array<{ name: string; description: string }> = [
  { name: 'schedule', description: 'Manage scheduled tasks' },
  { name: 'session', description: 'Create, inspect, and read Aero sessions' },
  { name: 'models', description: 'Show default and favorite models' },
  { name: 'projects', description: 'Show configured projects and IDs' },
  { name: 'control', description: 'Show Aero control-plane commands' },
  { name: 'tunnel', description: 'Tunnel lifecycle commands' },
  { name: 'startup', description: 'Manage launch at system startup' },
  { name: 'logs', description: 'Tail Aero logs' },
  {
    name: 'connect-url',
    description: 'Generate URL/QR for connecting another client',
  },
  { name: 'update', description: 'Check for and install updates' },
];

for (const { name, description } of placeholders) {
  const cmd = program.command(name).description(description);
  cmd.allowUnknownOption(true).allowExcessArguments(true);
  cmd.action(() => {
    console.log(`"aero ${name}" is not yet implemented.`);
  });
}

// -----------------------------------------------------------------------------
// Default action: bare `aero` = `aero serve`, but reject unknown commands
// -----------------------------------------------------------------------------

program.action(() => {
  if (program.args.length > 0) {
    console.error(`error: unknown command '${program.args[0]}'`);
    console.error(`Run 'aero --help' for usage.`);
    process.exit(1);
  }
  void runServe();
});

program.parse();
