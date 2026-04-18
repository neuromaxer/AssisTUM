# AssisTUM

## Deploying to Appx

AssisTUM can run as a managed project inside [Appx](https://github.com/neuromaxer/appx) — a self-hostable platform for hosting agentic applications. Appx handles TLS, auth, subdomain routing, and egress control.

### Architecture

```
appx (443/8080)
  └── assistum.<baseDomain> → reverse proxy → Express (<assigned_port>)

Express (<assigned_port>)
  ├── /api/*        → REST API + SSE
  ├── /health       → health check (appx polls this)
  └── /*            → React SPA (frontend/dist/)

OpenCode (4097)
  └── MCP tools (actions, fetch, live)
```

Assistum runs its own OpenCode instance on port 4097, separate from appx's OpenCode on 4096. Appx treats assistum as an opaque app — no appx code changes needed.

### Prerequisites

- Appx running (e.g., `./appx --http --port 8080`)
- Node.js, npm, [Task](https://taskfile.dev)
- `opencode` CLI installed

### Setup

1. **Create project** in the appx dashboard — name it `assistum`, note the assigned port (e.g., 10000)

2. **Replace the scaffolded directory** with assistum code:
   ```bash
   cd <appx-project-root>/assistum
   rm -rf *
   git clone <assistum-repo-url> .
   ```

3. **Install and build:**
   ```bash
   npm install
   npm run build -w frontend
   npm run build -w backend
   ```

4. **Start:**
   ```bash
   task start:appx APPX_PORT=<assigned_port>
   ```
   This launches Express on the assigned port and OpenCode on 4097. Override the OpenCode port with `APPX_OC_PORT=<port>` if needed.

5. **Verify:**
   - Appx dashboard shows "assistum" with green health
   - `assistum.<baseDomain>` loads the UI
   - Agent chat, calendar, and todos all work

### How it works

- `task start:appx` overrides `PORT` and `OPENCODE_URL` via Taskfile env vars — the default `.env` stays untouched so `task dev` works as before
- Express serves the built React frontend as static files alongside the API from a single port
- Appx's subdomain proxy forwards all requests for `assistum.<baseDomain>` to that port
- Auth is dual-layer: appx gates platform access, assistum handles TUM credentials internally

### Ports

| Process | Port | Configurable via |
|---------|------|------------------|
| Express | 10000 (default) | `APPX_PORT` |
| OpenCode | 4097 (default) | `APPX_OC_PORT` |
| Appx's OpenCode | 4096 | N/A (separate) |
