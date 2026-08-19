import { createAuthConfig } from './auth';

// One token per server process lifetime — same pattern as the demo.
// If you run web behind Electron on a fixed loopback port, this "just works".
export const AUTH_CONFIG = createAuthConfig();
