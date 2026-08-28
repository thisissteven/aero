# Aero

![Aero preview](./wip.png)

A unified web and desktop interface for [OpenCode](https://github.com/anomalyco/opencode).

Aero provides a modern interface for working with OpenCode, including conversations, sessions, workspaces, models, agents, tools, and streaming responses.

---

## Status

**Pre-MVP — active development**

- ✅ Design system
- ✅ Storybook
- ✅ Monorepo
- ✅ OpenCode integration
- ✅ Streaming responses
- ✅ Session/workspace management
- 🚧 Web application
- 🚧 Error handling
- 🚧 Storage and state synchronization
- ⏳ Desktop application
- ⏳ CLI

Aero currently supports **OpenCode only**.

---

## Architecture

```text
React
  ↓
Aero API
  ↓
OpenCode Adapter
  ↓
OpenCode
```

The OpenCode integration is isolated behind an adapter so the UI does not depend directly on OpenCode-specific details.

---

## Project Structure

```text
apps/
  storybook/
  docs/

packages/
  ui/
  web/
  cli/
  desktop/
```

---

## Tech Stack

- React
- TypeScript
- Vite
- Hono
- Tailwind CSS
- HeroUI
- Storybook
- Zustand
- TanStack Query
- Bun
- Turborepo
- Electron (planned)

---

## Running Locally

Install dependencies:

```bash
bun install
```

Start the web app in development:

```bash
bun run web:dev
```

Start the production build:

```bash
bun run web:start
```

---

## Roadmap

### Web

- [x] OpenCode integration
- [x] Streaming
- [x] Sessions
- [x] Workspaces
- [x] Model and agent selection
- [ ] MVP polish
- [ ] Settings
- [ ] Better error handling
- [ ] Storage improvements

### Desktop

- [ ] Electron application

### CLI

- [ ] CLI interface
