# AGENTS.md

This document defines how AI coding agents (and human contributors) should work within the **Aero** monorepo. It covers architecture, conventions, and workflow rules.

> **Note on defaults:** The structures, layouts, and patterns described here are **recommended defaults**, not hard requirements. If an existing part of the codebase already has an established, working pattern that differs from what's described below, prefer consistency with the existing code over blindly conforming to this document. When in doubt, match the surrounding code first, then fall back to these conventions for new code.

---

## 1. Project Overview

Aero is a monorepo application that provides a unified interface for working with multiple AI coding "harnesses" (e.g. `opencode`, `codex`, `claude`) across web, CLI, and desktop surfaces. The project consists of:

- A Vite + React frontend for interactive use
- A Hono-based backend that mediates between the UI and the underlying harnesses
- A CLI for terminal-based workflows
- An Electron desktop shell that wraps the web application
- A shared design system (`@aero/ui`, built on HeroUI) used across surfaces

The goal is a consistent experience regardless of which harness is driving the underlying agent, and regardless of which surface (web, CLI, desktop) the user is on.

---

## 2. Core Architecture Principles

- **Harness-agnostic core.** Business logic should never assume a specific harness. All harness-specific behavior lives behind the adapter layer (see §11).
- **Single source of truth for state.** Configuration and workspace state live in one place (`~/.aero/`, see §14) and are read by every surface, not duplicated per-surface.
- **Thin surfaces, shared core.** Web, CLI, and desktop are presentation layers over shared services. Avoid re-implementing logic per-surface; extract to a shared package instead.
- **Explicit boundaries over implicit coupling.** Packages communicate through well-defined interfaces/types, not by reaching into each other's internals.
- **Incremental adoption.** New conventions (like the `packages/web` layout in §9) apply to new code and to files being substantially touched — not as a mandate to do sweeping, unrelated refactors.

---

## 3. Monorepo Package Responsibilities

| Package                                              | Responsibility                                                                                                             |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `packages/web`                                       | The Aero application runtime: Vite + React frontend **and** the Hono backend that serves it. See §9 for the naming caveat. |
| `packages/cli`                                       | Terminal entry point for Aero; thin wrapper around shared services.                                                        |
| `packages/desktop`                                   | Electron shell embedding the web app for a native desktop experience.                                                      |
| `packages/ui` (`@aero/ui`)                           | Shared design system components, built on top of HeroUI.                                                                   |
| `packages/core` (or equivalent shared logic package) | Harness-agnostic domain logic, types, and utilities shared across surfaces.                                                |

Agents should place new code in the package whose responsibility matches the task — avoid adding cross-cutting logic directly into `packages/web` if it's meant to be reused by `packages/cli` or `packages/desktop`.

---

## 4. Dependency Rules

- Dependencies flow **inward toward shared packages**, never the other way: `web`, `cli`, and `desktop` may depend on `core` and `ui`; `core` and `ui` must never depend on `web`, `cli`, or `desktop`.
- `packages/ui` should not depend on `packages/core`'s business logic — keep it presentation-focused (props in, UI out).
- Harness adapters (`opencode`, `codex`, `claude`, under `server/adapters`) must not be imported directly by UI code — always go through the harness service layer (§11).
- Avoid introducing new cross-package dependencies without checking for a cycle. If a new dependency would create a cycle, extract the shared piece into `core` instead.
- New third-party dependencies should be added to the package that uses them, not hoisted to the workspace root unless genuinely shared by all packages (e.g. TypeScript, linting tools).

---

## 5. UI Development Rules

- Prefer composition over configuration — small, composable components rather than large components with many boolean props.
- Co-locate a component's styles, tests, and stories with the component itself.
- Business logic does not belong in components; extract to hooks (`app/hooks`) or stores (`app/stores`).
- New reusable UI primitives belong in `@aero/ui`; app-specific composed UI (that isn't meant for reuse outside Aero) belongs in `app/components` or `src/components` (Aero-specific components, see §9).
- Accessibility is not optional: interactive components need keyboard support and appropriate ARIA attributes by default.

---

## 6. HeroUI / `@aero/ui` Usage Rules

- `@aero/ui` wraps HeroUI — application code should import from `@aero/ui`, not directly from HeroUI, so theming and future swaps stay centralized.
- If a needed component doesn't exist in `@aero/ui` yet, add a thin wrapper around the HeroUI primitive there rather than importing HeroUI ad hoc in feature code.
- Don't override HeroUI component internals with brittle CSS overrides — prefer the theming/token API HeroUI exposes, or compose a new variant in `@aero/ui`.
- Keep HeroUI version upgrades isolated to `@aero/ui` so consuming packages are insulated from breaking changes.

---

## 7. Design System Rules

- All colors, spacing, radii, typography, and shadows should reference design tokens — no hard-coded hex values or magic pixel numbers in component code.
- New tokens are added at the design-system level (`@aero/ui`), not redefined locally per feature.
- Dark mode / theming must be supported through the token system, not through component-level conditionals.
- Any new component added to `@aero/ui` should have a corresponding Storybook story (see §15) demonstrating its variants and states.

---

## 8. Animation Guidelines

- Prefer subtle, purposeful motion (state transitions, feedback on interaction) over decorative animation.
- Use a shared animation utility/library consistently across the app rather than mixing multiple animation approaches (e.g. don't mix raw CSS transitions, Framer Motion, and manual JS animation in the same feature).
- Respect `prefers-reduced-motion` — animations should degrade gracefully or be disabled for users who request reduced motion.
- Keep animation timing/easing values as shared constants/tokens rather than duplicating magic numbers across components.

---

## 9. Frontend (`packages/web`) Conventions

**Naming note:** `packages/web` is a slightly overloaded name — it contains both the frontend (React) and the backend (Hono) that serves it. Since the package is currently Vite + React + Hono together, treat it as **the Aero application runtime package**, not "frontend only."

Recommended layout (apply to new code and when substantially touching a related area — not a mandate to move existing files wholesale):

```
packages/web
├── src
│   ├── app                # React application
│   │   ├── components
│   │   ├── features
│   │   ├── hooks
│   │   ├── routes
│   │   └── stores
│   │
│   ├── server              # Hono backend
│   │   ├── routes
│   │   ├── services
│   │   │   └── harness
│   │   ├── adapters
│   │   │   ├── opencode
│   │   │   ├── codex
│   │   │   └── claude
│   │   ├── storage
│   │   └── config
│   │
│   ├── components          # Aero-specific UI components
│   ├── lib
│   └── types
```

- `app/features` holds feature-scoped code (a feature's components/hooks/state that aren't broadly reusable); `app/components` and top-level `components` hold cross-feature Aero-specific UI.
- `app/stores` holds client-side state management (whatever store solution the project uses) — keep server state (from the Hono API) separate from local UI state.
- `server/services/harness` is where harness-agnostic orchestration logic lives; `server/adapters/*` is where harness-specific implementations live (see §11).
- Do not migrate existing files into this layout just to match the diagram — migrate a file only when you're already touching it for a real change.

---

## 10. Hono Backend Architecture

- `server/routes` — HTTP route definitions only; routes should be thin and delegate to services.
- `server/services` — business logic, including harness orchestration (`services/harness`). Services should be testable independently of HTTP.
- `server/adapters/*` — one subfolder per harness (`opencode`, `codex`, `claude`, ...), implementing a common adapter interface. See §11.
- `server/storage` — persistence layer (reading/writing `~/.aero/` state, see §14). Routes and services should go through this layer rather than touching the filesystem directly.
- `server/config` — configuration loading/validation/defaults.
- Validate inputs at the route boundary; don't trust request bodies deeper in the service layer.
- Keep the Hono app itself (route registration, middleware) separate from the business logic it calls, so services remain reusable from the CLI (§12) without spinning up an HTTP server.

---

## 11. Multi-Harness Abstraction (`opencode`, `codex`, `claude`, etc.)

- All harnesses implement a common adapter interface (defined in `server/services/harness` or a shared types location) covering things like: starting a session, sending input, streaming output, and reporting status.
- Adding a new harness means adding a new folder under `server/adapters/<harness-name>` that implements the shared interface — it should **not** require changes to route or UI code.
- Harness-specific quirks (auth, config format, CLI invocation, output parsing) are isolated inside that harness's adapter. Nothing outside the adapter should special-case a specific harness by name (`if (harness === 'codex')` in shared code is a smell).
- The harness service layer (`services/harness`) is responsible for selecting/instantiating the correct adapter and exposing a uniform API to routes and the CLI.

---

## 12. CLI Architecture

- The CLI (`packages/cli`) is a thin presentation layer: argument parsing, output formatting, and interactive prompts.
- Core logic (harness orchestration, config, storage) is imported from shared packages/services — not reimplemented in the CLI.
- CLI commands should map predictably to the same underlying operations exposed via the Hono API where applicable, so behavior stays consistent between web and CLI.
- Long-running or streaming operations should support both a plain-output mode (for scripting/CI) and an interactive mode.

---

## 13. Desktop/Electron Architecture

- `packages/desktop` wraps the `packages/web` frontend; it should not duplicate application logic — it hosts the same web app with desktop-specific capabilities layered on top (native menus, file system access, notifications, etc.).
- Keep the Electron main process responsibilities limited to: window management, native OS integration, and secure IPC — application/business logic stays in the web app or shared packages.
- Any Electron-only API (native file dialogs, tray icons, etc.) should be exposed to the renderer through a well-defined, minimal preload/IPC bridge — avoid exposing broad Node.js access to the renderer.
- Desktop-specific storage/config behavior should still funnel through the shared storage strategy (§14), not a separate desktop-only mechanism.

---

## 14. Storage/Configuration Strategy

Recommended on-disk layout:

```
~/.aero/
├── config.json
├── settings.json
├── workspaces.json
├── harnesses.json
└── logs/
```

- **Filesystem-first.** On platforms with filesystem access (CLI, desktop, and the Hono backend for web), `~/.aero/` is the source of truth for configuration, settings, workspace definitions, and harness configuration.
- **localStorage fallback.** In environments without filesystem access (e.g. a pure browser context without the backend available), fall back to `localStorage` for the same data, using the same shape/schema so behavior stays consistent.
- Each file has a single responsibility: `config.json` (core app config), `settings.json` (user preferences), `workspaces.json` (workspace definitions), `harnesses.json` (harness configuration/credentials references). Don't merge unrelated concerns into one file.
- All reads/writes to `~/.aero/` go through the `server/storage` layer (§10) — no ad hoc `fs` calls scattered through routes or services.
- Logs go to `~/.aero/logs/`, not to arbitrary locations, so they're discoverable and cleanable.

---

## 15. Docs/Storybook Guidance

- Every new `@aero/ui` component should ship with a Storybook story covering its primary variants and states (default, disabled, loading, error, etc. as applicable).
- Keep Storybook stories close to the component they document (co-located, per §5).
- Non-trivial architectural decisions (new harness adapters, new storage schemas, etc.) should be documented briefly in-repo (README or ADR-style doc) rather than left only in commit messages or PR descriptions.
- Prefer updating existing docs over creating new, overlapping ones — search for an existing doc on the topic before adding a new file.

---

## 16. Agent Workflow Rules

- Read the surrounding code and existing conventions in the area you're touching before applying the defaults in this document — existing patterns win when they conflict (see the note at the top of this file).
- Make the smallest change that correctly accomplishes the task. Avoid opportunistic refactors, renames, or layout migrations bundled into unrelated changes.
- When a task touches multiple packages, respect the dependency direction in §4 — don't introduce a new violation to make a change more convenient.
- Prefer extending the harness adapter interface (§11) over hardcoding new harness-specific behavior into shared code.
- Run verification commands (§17) before considering a change complete.

---

## 17. Allowed/Forbidden Modifications

**Allowed without special discussion:**

- Adding new components/files that follow existing package responsibilities.
- Adding a new harness adapter under `server/adapters/<name>` that implements the existing interface.
- Adding Storybook stories, tests, or docs.
- Migrating a file into the recommended layout (§9) _when you are already substantially editing it_ for an unrelated reason.

**Forbidden without explicit user approval:**

- Restructuring package boundaries (moving logic between `packages/web`, `packages/cli`, `packages/desktop`, `packages/core`, `packages/ui`) as a standalone change.
- Bulk/mechanical file moves to match the recommended layout in §9 across files not otherwise being touched.
- Changing the on-disk storage schema (§14) in a way that isn't backward compatible, without a migration path.
- Adding a new top-level dependency to the workspace root.
- Modifying the harness adapter interface in a way that breaks existing adapters, without updating all adapters in the same change.
- Removing or bypassing the `localStorage` fallback for storage (§14).

---

## 18. Verification Commands

Run these before considering a task complete (adjust to whatever the actual `package.json` scripts are named if they differ from these placeholders):

```bash
# Install dependencies (workspace root)
pnpm install

# Type-check the whole monorepo
pnpm typecheck

# Lint
pnpm lint

# Unit / integration tests
pnpm test

# Build all packages
pnpm build

# Run Storybook (for UI/design-system changes)
pnpm --filter @aero/ui storybook
```

If a change is scoped to a single package, prefer running the package-scoped equivalent (e.g. `pnpm --filter web typecheck`) for faster feedback, but run the full workspace check before finishing.

---

## 19. Subagent/Skill Usage Rules

- Prefer a focused subagent/skill invocation scoped to a single package or concern over one broad, cross-cutting task — this keeps changes reviewable and reduces the chance of violating dependency rules (§4).
- When a task spans multiple packages (e.g. a new harness needs an adapter, a UI surface, and a CLI command), break it into per-package steps rather than one undifferentiated change.
- Subagents working on `@aero/ui` should default to producing a Storybook story alongside any new component (§15).
- Subagents should stop and flag rather than proceed if a task appears to require one of the "forbidden without approval" changes in §17.

---

_This document is a living reference. Update it when architectural conventions change, rather than letting it drift out of sync with the codebase._
