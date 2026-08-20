import { createAuthConfig, generateSessionToken } from './auth';

// In dev this module loads twice — once through Vite's SSR module graph
// (used by @hono/vite-dev-server for the /api/terminal/token route) and
// once as a plain Node import (used by terminalDevPlugin's upgrade
// handler in vite.config.ts). Each load would otherwise mint its own
// random token, so the WS handshake's token check would always fail.
// process.env is the one thing genuinely shared across both module
// graphs in the same process, so pin the token there on first use.
process.env.AERO_TERMINAL_TOKEN ||= generateSessionToken();

export const AUTH_CONFIG = createAuthConfig({
  token: process.env.AERO_TERMINAL_TOKEN,
});
