# Assistum → Appx Integration Design

## Goal

Run assistum as a managed project inside appx with zero appx code changes. Assistum appears in the appx dashboard, is accessible via subdomain, and functions identically to the standalone version.

## Approach

Assistum runs as an opaque app behind appx's subdomain proxy. It keeps its own OpenCode instance, Express backend, SQLite database, and TUM auth flows. Appx treats it like any other project — proxies traffic to its assigned port and shows health status in the dashboard.

## Architecture

```
appx (port 443/8080)
  │
  ├── subdomain proxy: assistum.<baseDomain> → 127.0.0.1:<assigned_port>
  │
  └── appx's own OpenCode (port 4096) — unrelated, serves other projects

assistum Express (port <assigned_port>, e.g. 10000)
  ├── serves frontend static files (frontend/dist/)
  ├── /api/* endpoints (events, todos, courses, agent, auth, etc.)
  ├── /api/stream (SSE)
  └── /health (appx health checker hits this)

assistum OpenCode (port 4097)
  └── MCP tools registered by assistum's backend
```

### Key points

- Appx's OpenCode (4096) is completely separate — assistum doesn't use it
- Assistum's OpenCode runs on 4097 (outside appx's 10000-10999 range, no collision with 4096)
- Appx health checker does TCP dial on the assigned port — Express's `/health` answers
- No CORS issues: browser sees single origin (`assistum.<baseDomain>`), appx proxy is invisible
- Appx strips cookies on subdomain proxy (router.go:161) — assistum doesn't use cookies, so this is fine

### Authentication

Dual auth: appx gates platform access (password login), assistum handles TUM credential setup internally (TUM Online tokens, Moodle Shibboleth, IMAP creds). Two separate login flows — assistum's TUM auth is domain-specific and can't be replaced by appx's generic auth.

## Changes Required

### 1. `backend/src/index.ts` — static file serving + SPA fallback

Add Express static middleware to serve `frontend/dist/` and a catch-all SPA fallback route. Currently the Vite dev server handles the frontend on port 5173, but inside appx we need Express to serve everything from a single port.

In dev mode this is inert — `frontend/dist/` doesn't exist, so the middleware does nothing and the Vite dev server handles the frontend as before.

```typescript
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendDist = resolve(__dirname, "../../frontend/dist");

// After all /api/* routes:
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (_req, res) => {
    res.sendFile(resolve(frontendDist, "index.html"));
  });
}
```

### 2. `Taskfile.yml` — new `start:appx` task

Adds a production-mode start command with env overrides, so the existing `.env` (PORT=3001, OPENCODE_URL on 4096) stays untouched and `task dev` works as before.

```yaml
start:appx:
  desc: Start assistum inside appx (production mode)
  env:
    PORT: "{{.APPX_PORT | default 10000}}"
    OPENCODE_URL: "http://127.0.0.1:4097"
  cmds:
    - npx concurrently --kill-others -n oc,be -c blue,green
        "opencode serve --port 4097"
        "node backend/dist/index.js"
```

### No changes to:

- **Appx** — existing project creation, subdomain proxy, and health checking work as-is
- **`.env`** — stays at PORT=3001 for local dev
- **Frontend code** — all API calls use relative paths (`/api/events`, `/api/stream`) which resolve correctly through appx's proxy
- **MCP tools, skills, database schema, agent logic** — all untouched

## Setup Steps

1. **Create project in appx dashboard** → name: `assistum` → gets assigned port and directory
2. **Replace scaffolded directory** with assistum codebase (clone/copy into `<ProjectRoot>/assistum/`)
3. **Build:** `npm install && npm run build -w frontend && npm run build -w backend`
4. **Start:** `task start:appx` (or `APPX_PORT=<assigned> task start:appx`)
5. **Verify:** appx dashboard shows green health, `assistum.<baseDomain>` loads the UI

## Request Flow

```
Browser on assistum.<baseDomain>
  │
  │  fetch("/api/events")
  │  → resolves to assistum.<baseDomain>/api/events
  │
  ▼
appx reverse proxy
  │  subdomain match: "assistum" → project port 10000
  │  strips cookie, forwards request
  │
  ▼
Express (port 10000)
  └── /api/events → handler → JSON response → back through proxy → browser
```

## Local Dev Compatibility

All changes are backward-compatible with standalone local development:

- Static file middleware is inert when `frontend/dist/` doesn't exist
- `start:appx` is a new Taskfile task; existing `dev` task unchanged
- `.env` not modified; `start:appx` overrides via task-level env vars
