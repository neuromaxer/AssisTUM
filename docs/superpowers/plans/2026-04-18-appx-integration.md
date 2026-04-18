# Appx Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run assistum as a managed project inside appx with zero appx code changes.

**Architecture:** Assistum runs as an opaque app behind appx's subdomain proxy. Express serves both API and built frontend from a single port assigned by appx. Assistum's own OpenCode instance runs on a separate port (4097). No changes to appx.

**Tech Stack:** Express 5, Vite, TypeScript, Taskfile

**Spec:** `docs/superpowers/specs/2026-04-18-appx-integration-design.md`

---

## File Map

- Modify: `backend/src/index.ts` — add static file serving + SPA fallback after API routes
- Modify: `Taskfile.yml` — add `start:appx` production task with env overrides

---

### Task 1: Add static file serving to Express

Express currently only handles `/api/*` routes. In production (inside appx), it must also serve the built React frontend from `frontend/dist/` on the same port.

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Add static file serving + SPA fallback after all API routes**

Add the following at the end of `backend/src/index.ts`, after the last `app.use(...)` line and before `getDb()`:

```typescript
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
```

These imports go at the top of the file with the existing imports. Then, after the last route (`app.use("/api/skills", skillsRouter);`) and before `getDb();`:

```typescript
const __frontendDist = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../frontend/dist"
);

if (existsSync(__frontendDist)) {
  app.use(express.static(__frontendDist));
  app.get("*", (_req, res) => {
    res.sendFile(resolve(__frontendDist, "index.html"));
  });
}
```

This is inert in dev mode — `frontend/dist/` doesn't exist when running `task dev` (Vite dev server handles the frontend). Only activates after `npm run build -w frontend`.

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit --project backend/tsconfig.json
```

Expected: exits 0, no errors.

- [ ] **Step 3: Verify dev mode still works**

Run:
```bash
task dev
```

Open `http://localhost:5173` in browser. Verify:
- Dashboard loads
- Calendar renders
- Chat panel connects (SSE stream active)
- Navigating to `/settings` works (React Router)

Then kill the dev servers (`task kill`).

- [ ] **Step 4: Verify production build + static serving**

Build frontend and backend:
```bash
npm run build -w frontend && npm run build -w backend
```

Start production server:
```bash
PORT=3001 OPENCODE_URL=http://127.0.0.1:4096 node backend/dist/index.js
```

(In a separate terminal, start OpenCode: `opencode serve --port 4096`)

Open `http://localhost:3001` in browser. Verify:
- React app loads (served by Express, not Vite)
- `/api/events` returns JSON
- Client-side routing works (navigate to `/settings`, refresh page — should load, not 404)
- SSE stream connects (`/api/stream`)

Kill both processes.

- [ ] **Step 5: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat: serve frontend static files from Express in production"
```

---

### Task 2: Add Taskfile `start:appx` task

Add a production start task that overrides PORT and OPENCODE_URL for running inside appx, so the default `.env` stays untouched for local dev.

**Files:**
- Modify: `Taskfile.yml`

- [ ] **Step 1: Add start:appx task to Taskfile.yml**

Add the following task after the existing `start` task:

```yaml
  start:appx:
    desc: Start assistum inside appx (production mode, custom ports)
    env:
      PORT: "{{.APPX_PORT | default \"10000\"}}"
      OPENCODE_URL: "http://127.0.0.1:{{.APPX_OC_PORT | default \"4097\"}}"
    cmds:
      - npx concurrently --kill-others -n oc,be -c blue,green "opencode serve --port {{.APPX_OC_PORT | default \"4097\"}}" "node backend/dist/index.js"
```

This uses Taskfile variables so the ports can be overridden at invocation: `task start:appx APPX_PORT=10001 APPX_OC_PORT=4098`.

- [ ] **Step 2: Verify task is recognized**

Run:
```bash
task --list
```

Expected: `start:appx` appears in the list with description "Start assistum inside appx (production mode, custom ports)".

- [ ] **Step 3: Verify task runs**

Build first (if not already built):
```bash
npm run build -w frontend && npm run build -w backend
```

Run:
```bash
task start:appx
```

Expected: concurrently starts two processes:
- `[oc]` OpenCode listening on port 4097
- `[be]` Express listening on port 10000

Open `http://localhost:10000` in browser. Verify React app loads and API responds. Kill with Ctrl+C.

- [ ] **Step 4: Verify local dev is unaffected**

Run:
```bash
task dev
```

Verify it still starts on the original ports (5173/3001/4096) as before. Kill with `task kill`.

- [ ] **Step 5: Commit**

```bash
git add Taskfile.yml
git commit -m "feat: add start:appx task for running inside appx"
```

---

### Task 3: End-to-end test inside appx

Deploy assistum into a running appx instance and verify the full flow.

**Prerequisites:** appx running locally (e.g., `./appx --http --port 8080` with `BaseDomain=localhost`).

- [ ] **Step 1: Create project in appx**

Open appx dashboard at `http://localhost:8080`. Click "Create Project", name: `assistum`. Note the assigned port (e.g., 10000).

- [ ] **Step 2: Replace scaffolded directory with assistum code**

The project directory is at `<appx ProjectRoot>/assistum/`. Replace its contents:

```bash
# From the appx project root
cd <ProjectRoot>/assistum
rm -rf *
# Copy assistum code (or git clone)
cp -r /path/to/assistum/* .
cp /path/to/assistum/.env .
```

Keep the `.env` as-is — `start:appx` overrides the ports.

- [ ] **Step 3: Build and start**

```bash
cd <ProjectRoot>/assistum
npm install
npm run build -w frontend && npm run build -w backend
task start:appx APPX_PORT=<assigned_port>
```

- [ ] **Step 4: Verify via appx**

1. Appx dashboard shows "assistum" with green health indicator
2. Navigate to `assistum.localhost:8080` — assistum UI loads
3. Calendar, todos, chat panel all function
4. Agent can be messaged and responds (SSE streaming works through appx proxy)
5. TUM credential setup in settings works

- [ ] **Step 5: Commit any adjustments**

If any tweaks were needed during integration, commit them:

```bash
git add -A
git commit -m "fix: adjustments from appx integration testing"
```
