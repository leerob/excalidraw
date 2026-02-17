# AGENTS.md

## Cloud-specific instructions

### Overview

Excalidraw is a Yarn workspaces monorepo containing a whiteboard web app (`excalidraw-app/`) and supporting packages (`packages/*`). The core drawing functionality is entirely client-side; no backend services are required for local development.

### Running the dev server

- `yarn start` launches the Vite dev server on `http://localhost:3001` (port configured in `.env.development`).
- The app works standalone without any external services (Firebase, WebSocket, AI backend are all optional and pre-configured in `.env.development` to use hosted dev endpoints where applicable).

### Key development commands

See `CLAUDE.md` and `package.json` scripts for the full list. The most important:

| Command | Purpose |
| --- | --- |
| `yarn start` | Dev server on port 3001 |
| `yarn test:update` | Run all tests with snapshot updates (non-interactive) |
| `yarn test:typecheck` | TypeScript type checking via `tsc` |
| `yarn test:code` | ESLint (`--max-warnings=0`) |
| `yarn fix` | Auto-fix formatting and linting |

### Gotchas

- The ESLint checker in the Vite dev server may emit warnings about `@typescript-eslint/typescript-estree` not officially supporting TS 5.9.3. These are informational and do not affect functionality.
- `yarn test:app` runs Vitest in watch mode by default; for CI or one-off runs use `yarn test:update` (adds `--watch=false`).
- The pre-commit hook in `.husky/pre-commit` is currently commented out (`# yarn lint-staged`), so no hooks run on commit.
- Some test stderr output about "Error JSON parsing firebase config" is expected when running tests without `VITE_APP_FIREBASE_CONFIG` set in the test environment. Tests still pass.
