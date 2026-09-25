# AGENTS.md

How to implement a feature in Aero. Work backend first, then frontend.

## 1. Backend (`packages/web/server`)

Start here. Add the route(s) and the service logic they delegate to.

- **Routes** go in `packages/web/server/routes/`. Use a single file (`routes/<name>.ts`) or a folder with `index.ts` + `service.ts` for grouped routes (see `routes/git/`, `routes/github/`). Keep routes thin: validate input, call a service, return the response.
- **Register the route** in `packages/web/server/index.ts` (import it and add `.route('/<name>', <name>Routes)`).
- **Services**:
  - opencode-related services: `packages/web/server/adapters/opencode/index.ts`
  - Ignore `packages/web/server/adapters/claude/` and `packages/web/server/adapters/codex/` — they are unused. Only `adapters/opencode/` is active.
  - other services: `packages/web/server/services/` (e.g. `settings.ts`, `snippets.ts`, or a folder like `workspace/`, `sessions/`). Look at the existing sibling files to match the pattern for the service you're adding to.
- **Types**: when new shared types are needed, add them to `packages/web/server/services/harness/types.ts` (this is the reference `types.ts` for backend service data). Follow the existing type style there.

## 2. Frontend hooks (`packages/web/app/hooks`)

After the backend is done, add hooks for the new routes.

- API hooks live in `packages/web/app/hooks/api/<name>.ts` — this is usually what you need to add.
- Follow the existing patterns there: import `honoClient` from `@/app/lib`, derive request/response types with `InferRequestType` / `InferResponseType` from `hono/client`, and wrap calls in `@tanstack/react-query` (`useQuery`, `useInfiniteQuery`, `useMutation`, `useQueryClient`) with a matching `*Keys` object.

## 3. UI (`packages/web/app`)

Once the hooks exist, build the UI.

- See how existing components and features are written in `packages/web/app/components/` and `packages/web/app/features/` and reuse their patterns — do not invent new UI conventions.
- For colors: use only the colors defined in `packages/ui/src/styles/default-theme.css`. Never use arbitrary colors outside that file, and follow how existing components apply them.
