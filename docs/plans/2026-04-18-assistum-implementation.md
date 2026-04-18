# AssisTUM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone campus co-pilot app (Node.js backend + React frontend) that uses OpenCode as the agent engine to autonomously plan a TUM student's week from real university data sources.

**Architecture:** Express backend spawns OpenCode via JS SDK, registers campus API adapters as an MCP tool server. React/Vite frontend connects to the backend via REST + SSE. Agent creates events and todos via MCP tool calls which persist to SQLite and stream to the frontend in real time.

**Tech Stack:** Node.js, Express, TypeScript, better-sqlite3, @opencode-ai/sdk, @modelcontextprotocol/sdk, React, Vite, FullCalendar, TailwindCSS, Radix UI

**Spec:** `docs/specs/2026-04-18-assistum-design.md`

**Reference repos:**
- OpenCode SDK: `/Users/max/misc/pj/misc/opencode/packages/sdk/js/`
- MCP SDK: `@modelcontextprotocol/sdk` (npm)
- Campus Flutter (API reference): `/Users/max/misc/pj/hackathons/makeathon_2026/campus_flutter/`
- Quaestor-lite (calendar components): `/Users/max/misc/pj/quaestor/quaestor-lite/apps/frontend/`

---

## Phase 1: Backend Foundation

### Task 1: Project scaffolding + workspace setup

**Files:**
- Create: `package.json` (root workspace)
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/src/index.ts`
- Create: `backend/src/config.ts`
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `opencode.json`

- [ ] **Step 1: Create root `package.json` with npm workspaces**

```json
{
  "name": "assistum",
  "private": true,
  "workspaces": ["backend", "frontend"],
  "scripts": {
    "dev": "concurrently \"npm run dev -w backend\" \"npm run dev -w frontend\"",
    "build": "npm run build -w frontend && npm run build -w backend",
    "start": "npm run start -w backend"
  },
  "devDependencies": {
    "concurrently": "^9.0.0"
  }
}
```

- [ ] **Step 2: Create `backend/package.json`**

```json
{
  "name": "assistum-backend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^5.1.0",
    "@opencode-ai/sdk": "^1.3.0",
    "@modelcontextprotocol/sdk": "^1.12.0",
    "better-sqlite3": "^11.0.0",
    "dotenv": "^16.5.0",
    "xml2js": "^0.6.0",
    "node-ical": "^0.19.0",
    "imapflow": "^1.0.0",
    "nodemailer": "^7.0.0",
    "@grpc/grpc-js": "^1.12.0",
    "@grpc/proto-loader": "^0.7.0",
    "uuid": "^11.0.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "@types/express": "^5.0.0",
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^22.0.0",
    "@types/xml2js": "^0.4.0",
    "@types/nodemailer": "^6.4.0",
    "@types/cors": "^2.8.0",
    "@types/uuid": "^10.0.0"
  }
}
```

- [ ] **Step 3: Create `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create `backend/src/config.ts`**

```typescript
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

export const config = {
  port: parseInt(process.env.PORT || "3001"),
  openCodeUrl: process.env.OPENCODE_URL || "",
  dbPath: process.env.DB_PATH || "./assistum.db",
};
```

- [ ] **Step 5: Create `backend/src/index.ts` with minimal Express server**

```typescript
import express from "express";
import cors from "cors";
import { config } from "./config.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(config.port, () => {
  console.log(`AssisTUM backend listening on port ${config.port}`);
});
```

- [ ] **Step 6: Create `.env.example`**

```
PORT=3001
OPENCODE_URL=
DB_PATH=./assistum.db
```

- [ ] **Step 7: Create `.gitignore`**

```
node_modules/
dist/
.env
*.db
```

- [ ] **Step 8: Create minimal frontend scaffolding**

Create `frontend/package.json`:
```json
{
  "name": "assistum-frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.4.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

Create `frontend/vite.config.ts`:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
```

Create `frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

Create `frontend/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AssisTUM</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `frontend/src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

Create `frontend/src/App.tsx`:
```tsx
export function App() {
  return <div>AssisTUM</div>;
}
```

- [ ] **Step 9: Create `opencode.json`**

```json
{
  "model": "anthropic/claude-sonnet-4-6",
  "mcp": {
    "assistum-tools": {
      "type": "local",
      "command": ["npx", "tsx", "backend/src/mcp/server.ts"]
    }
  },
  "instructions": "You are AssisTUM, a campus co-pilot for TUM students. When the user asks you to plan, schedule, or find information, use fetch tools to get real data and action tools (create_event, create_todo, etc.) to populate the calendar and task list. Each tool call persists immediately and shows in the UI. Be proactive: suggest lunch breaks between lectures, study sessions before deadlines, and efficient commute times."
}
```

- [ ] **Step 10: Install dependencies and verify server starts**

Run: `npm install && npm run dev -w backend`
Expected: "AssisTUM backend listening on port 3001"

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: project scaffolding with backend + frontend workspaces"
```

---

### Task 2: SQLite database layer

**Files:**
- Create: `backend/src/db/client.ts`
- Create: `backend/src/db/schema.ts`

- [ ] **Step 1: Create `backend/src/db/client.ts`**

```typescript
import Database from "better-sqlite3";
import { config } from "../config.js";
import { runMigrations } from "./schema.js";

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(config.dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    runMigrations(db);
  }
  return db;
}
```

- [ ] **Step 2: Create `backend/src/db/schema.ts`**

```typescript
import type Database from "better-sqlite3";

export function runMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      description       TEXT,
      moodle_course_id  TEXT,
      tum_course_id     TEXT,
      exam_date         TEXT,
      source            TEXT NOT NULL DEFAULT 'agent',
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT,
      start       TEXT NOT NULL,
      end         TEXT NOT NULL,
      type        TEXT NOT NULL,
      color       TEXT,
      course_id   TEXT REFERENCES courses(id),
      source      TEXT NOT NULL DEFAULT 'agent',
      session_id  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS todos (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT,
      type        TEXT NOT NULL,
      deadline    TEXT,
      priority    TEXT,
      completed   INTEGER NOT NULL DEFAULT 0,
      course_id   TEXT REFERENCES courses(id),
      source      TEXT NOT NULL DEFAULT 'agent',
      session_id  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS course_content (
      id            TEXT PRIMARY KEY,
      course_id     TEXT NOT NULL REFERENCES courses(id),
      title         TEXT NOT NULL,
      content_type  TEXT NOT NULL,
      url           TEXT,
      summary       TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS emails (
      id            TEXT PRIMARY KEY,
      message_id    TEXT UNIQUE,
      subject       TEXT NOT NULL,
      sender        TEXT NOT NULL,
      recipients    TEXT,
      body_snippet  TEXT,
      date          TEXT NOT NULL,
      course_id     TEXT REFERENCES courses(id),
      summary       TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clubs (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      url         TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id                  TEXT PRIMARY KEY,
      opencode_session_id TEXT NOT NULL,
      summary             TEXT,
      created_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
```

- [ ] **Step 3: Wire database into server startup in `backend/src/index.ts`**

Add before `app.listen`:
```typescript
import { getDb } from "./db/client.js";

// Initialize database
getDb();
console.log("Database initialized");
```

- [ ] **Step 4: Run server, verify DB file is created**

Run: `npm run dev -w backend`
Expected: "Database initialized" printed, `assistum.db` file created in `backend/`

- [ ] **Step 5: Commit**

```bash
git add backend/src/db/
git commit -m "feat: SQLite database layer with schema migrations"
```

---

### Task 3: Backend REST API for events, todos, courses, settings, clubs

**Files:**
- Create: `backend/src/api/events.ts`
- Create: `backend/src/api/todos.ts`
- Create: `backend/src/api/courses.ts`
- Create: `backend/src/api/settings.ts`
- Create: `backend/src/api/clubs.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Create `backend/src/api/events.ts`**

```typescript
import { Router } from "express";
import { getDb } from "../db/client.js";
import { v4 as uuid } from "uuid";

export const eventsRouter = Router();

eventsRouter.get("/", (req, res) => {
  const db = getDb();
  const { start, end, course_id, type } = req.query;
  let sql = "SELECT * FROM events WHERE 1=1";
  const params: unknown[] = [];
  if (start) { sql += " AND end >= ?"; params.push(start); }
  if (end) { sql += " AND start <= ?"; params.push(end); }
  if (course_id) { sql += " AND course_id = ?"; params.push(course_id); }
  if (type) { sql += " AND type = ?"; params.push(type); }
  sql += " ORDER BY start ASC";
  res.json(db.prepare(sql).all(...params));
});

eventsRouter.get("/:id", (req, res) => {
  const db = getDb();
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  res.json(event);
});

eventsRouter.post("/", (req, res) => {
  const db = getDb();
  const { title, description, start, end, type, color, course_id, source, session_id } = req.body;
  if (!title || !start || !end || !type) {
    return res.status(400).json({ error: "Missing required fields: title, start, end, type" });
  }
  const id = uuid();
  db.prepare(
    `INSERT INTO events (id, title, description, start, end, type, color, course_id, source, session_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, title, description ?? null, start, end, type, color ?? null, course_id ?? null, source ?? "user", session_id ?? null);
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(id);
  res.status(201).json(event);
});

eventsRouter.patch("/:id", (req, res) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.id) as Record<string, unknown> | undefined;
  if (!existing) return res.status(404).json({ error: "Event not found" });
  const fields = ["title", "description", "start", "end", "type", "color", "course_id"];
  const updates: string[] = [];
  const values: unknown[] = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(req.body[f]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
  values.push(req.params.id);
  db.prepare(`UPDATE events SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  res.json(db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.id));
});

eventsRouter.delete("/:id", (req, res) => {
  const db = getDb();
  const result = db.prepare("DELETE FROM events WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Event not found" });
  res.json({ deleted: true, id: req.params.id });
});
```

- [ ] **Step 2: Create `backend/src/api/todos.ts`**

```typescript
import { Router } from "express";
import { getDb } from "../db/client.js";
import { v4 as uuid } from "uuid";

export const todosRouter = Router();

todosRouter.get("/", (req, res) => {
  const db = getDb();
  const { course_id, type, completed } = req.query;
  let sql = "SELECT * FROM todos WHERE 1=1";
  const params: unknown[] = [];
  if (course_id) { sql += " AND course_id = ?"; params.push(course_id); }
  if (type) { sql += " AND type = ?"; params.push(type); }
  if (completed !== undefined) { sql += " AND completed = ?"; params.push(completed === "true" ? 1 : 0); }
  sql += " ORDER BY COALESCE(deadline, '9999-12-31') ASC, created_at ASC";
  res.json(db.prepare(sql).all(...params));
});

todosRouter.get("/:id", (req, res) => {
  const db = getDb();
  const todo = db.prepare("SELECT * FROM todos WHERE id = ?").get(req.params.id);
  if (!todo) return res.status(404).json({ error: "Todo not found" });
  res.json(todo);
});

todosRouter.post("/", (req, res) => {
  const db = getDb();
  const { title, description, type, deadline, priority, course_id, source, session_id } = req.body;
  if (!title || !type) {
    return res.status(400).json({ error: "Missing required fields: title, type" });
  }
  const id = uuid();
  db.prepare(
    `INSERT INTO todos (id, title, description, type, deadline, priority, course_id, source, session_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, title, description ?? null, type, deadline ?? null, priority ?? null, course_id ?? null, source ?? "user", session_id ?? null);
  res.status(201).json(db.prepare("SELECT * FROM todos WHERE id = ?").get(id));
});

todosRouter.patch("/:id", (req, res) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM todos WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Todo not found" });
  const fields = ["title", "description", "type", "deadline", "priority", "completed", "course_id"];
  const updates: string[] = [];
  const values: unknown[] = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(req.body[f]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
  values.push(req.params.id);
  db.prepare(`UPDATE todos SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  res.json(db.prepare("SELECT * FROM todos WHERE id = ?").get(req.params.id));
});

todosRouter.delete("/:id", (req, res) => {
  const db = getDb();
  const result = db.prepare("DELETE FROM todos WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Todo not found" });
  res.json({ deleted: true, id: req.params.id });
});
```

- [ ] **Step 3: Create `backend/src/api/courses.ts`**

```typescript
import { Router } from "express";
import { getDb } from "../db/client.js";
import { v4 as uuid } from "uuid";

export const coursesRouter = Router();

coursesRouter.get("/", (_req, res) => {
  const db = getDb();
  const courses = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM events WHERE course_id = c.id) as event_count,
      (SELECT COUNT(*) FROM todos WHERE course_id = c.id) as todo_count
    FROM courses c ORDER BY c.name ASC
  `).all();
  res.json(courses);
});

coursesRouter.get("/:id", (req, res) => {
  const db = getDb();
  const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(req.params.id);
  if (!course) return res.status(404).json({ error: "Course not found" });
  res.json(course);
});

coursesRouter.post("/", (req, res) => {
  const db = getDb();
  const { name, description, moodle_course_id, tum_course_id, exam_date, source } = req.body;
  if (!name) return res.status(400).json({ error: "Missing required field: name" });
  const id = uuid();
  db.prepare(
    `INSERT INTO courses (id, name, description, moodle_course_id, tum_course_id, exam_date, source)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, description ?? null, moodle_course_id ?? null, tum_course_id ?? null, exam_date ?? null, source ?? "user");
  res.status(201).json(db.prepare("SELECT * FROM courses WHERE id = ?").get(id));
});

coursesRouter.delete("/:id", (req, res) => {
  const db = getDb();
  const result = db.prepare("DELETE FROM courses WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Course not found" });
  res.json({ deleted: true, id: req.params.id });
});
```

- [ ] **Step 4: Create `backend/src/api/settings.ts`**

```typescript
import { Router } from "express";
import { getDb } from "../db/client.js";

export const settingsRouter = Router();

settingsRouter.get("/", (_req, res) => {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of rows) {
    if (row.key.includes("password") || row.key.includes("token")) {
      settings[row.key] = "***";
    } else {
      settings[row.key] = row.value;
    }
  }
  res.json(settings);
});

settingsRouter.put("/:key", (req, res) => {
  const db = getDb();
  const { value } = req.body;
  if (value === undefined) return res.status(400).json({ error: "Missing value" });
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(req.params.key, value);
  res.json({ key: req.params.key, saved: true });
});

settingsRouter.delete("/:key", (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM settings WHERE key = ?").run(req.params.key);
  res.json({ key: req.params.key, deleted: true });
});

export function getSetting(key: string): string | undefined {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value;
}
```

- [ ] **Step 5: Create `backend/src/api/clubs.ts`**

```typescript
import { Router } from "express";
import { getDb } from "../db/client.js";
import { v4 as uuid } from "uuid";

export const clubsRouter = Router();

clubsRouter.get("/", (_req, res) => {
  const db = getDb();
  res.json(db.prepare("SELECT * FROM clubs ORDER BY name ASC").all());
});

clubsRouter.post("/", (req, res) => {
  const db = getDb();
  const { name, url } = req.body;
  if (!name || !url) return res.status(400).json({ error: "Missing required fields: name, url" });
  const id = uuid();
  db.prepare("INSERT INTO clubs (id, name, url) VALUES (?, ?, ?)").run(id, name, url);
  res.status(201).json(db.prepare("SELECT * FROM clubs WHERE id = ?").get(id));
});

clubsRouter.delete("/:id", (req, res) => {
  const db = getDb();
  const result = db.prepare("DELETE FROM clubs WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Club not found" });
  res.json({ deleted: true, id: req.params.id });
});
```

- [ ] **Step 6: Wire all routers into `backend/src/index.ts`**

Replace the full file:
```typescript
import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { getDb } from "./db/client.js";
import { eventsRouter } from "./api/events.js";
import { todosRouter } from "./api/todos.js";
import { coursesRouter } from "./api/courses.js";
import { settingsRouter } from "./api/settings.js";
import { clubsRouter } from "./api/clubs.js";

const app = express();
app.use(cors());
app.use(express.json());

getDb();

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/events", eventsRouter);
app.use("/api/todos", todosRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/clubs", clubsRouter);

app.listen(config.port, () => {
  console.log(`AssisTUM backend listening on port ${config.port}`);
});
```

- [ ] **Step 7: Test manually with curl**

Run: `npm run dev -w backend`

```bash
# Create a course
curl -s -X POST http://localhost:3001/api/courses -H 'Content-Type: application/json' -d '{"name":"Linear Algebra"}'

# Create an event
curl -s -X POST http://localhost:3001/api/events -H 'Content-Type: application/json' -d '{"title":"LinAlg Lecture","start":"2026-04-20T09:00","end":"2026-04-20T11:00","type":"lecture"}'

# Create a todo
curl -s -X POST http://localhost:3001/api/todos -H 'Content-Type: application/json' -d '{"title":"Submit homework","type":"assignment","deadline":"2026-04-21T23:59","priority":"high"}'

# List all
curl -s http://localhost:3001/api/events
curl -s http://localhost:3001/api/todos
curl -s http://localhost:3001/api/courses
```

Expected: All CRUD operations return correct JSON responses.

- [ ] **Step 8: Commit**

```bash
git add backend/src/api/ backend/src/index.ts
git commit -m "feat: REST API for events, todos, courses, settings, clubs"
```

---

### Task 4: SSE endpoint for real-time frontend updates

**Files:**
- Create: `backend/src/api/sse.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Create `backend/src/api/sse.ts`**

```typescript
import { Request, Response } from "express";

type SseClient = {
  id: string;
  res: Response;
};

const clients: SseClient[] = [];
let clientIdCounter = 0;

export function sseHandler(req: Request, res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const clientId = String(++clientIdCounter);
  clients.push({ id: clientId, res });

  req.on("close", () => {
    const idx = clients.findIndex((c) => c.id === clientId);
    if (idx !== -1) clients.splice(idx, 1);
  });
}

export function broadcast(eventType: string, data: unknown) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.res.write(payload);
  }
}
```

- [ ] **Step 2: Add SSE route and hook broadcasts into CRUD operations**

In `backend/src/index.ts`, add:
```typescript
import { sseHandler } from "./api/sse.js";
app.get("/api/events/stream", sseHandler);
```

In each POST/PATCH/DELETE handler in `events.ts` and `todos.ts`, add a broadcast call after the database write. Import `broadcast` from `../api/sse.js` and call:
```typescript
import { broadcast } from "./sse.js";
// After successful POST:
broadcast("event_created", event);
// After successful PATCH:
broadcast("event_updated", updated);
// After successful DELETE:
broadcast("event_deleted", { id: req.params.id });
// Same pattern for todos: todo_created, todo_updated, todo_deleted
```

- [ ] **Step 3: Test SSE with curl**

In one terminal: `curl -N http://localhost:3001/api/events/stream`
In another: `curl -X POST http://localhost:3001/api/events -H 'Content-Type: application/json' -d '{"title":"Test","start":"2026-04-20T09:00","end":"2026-04-20T10:00","type":"custom"}'`

Expected: First terminal receives `event: event_created` with the event data.

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/sse.ts backend/src/api/events.ts backend/src/api/todos.ts backend/src/index.ts
git commit -m "feat: SSE endpoint for real-time event and todo streaming"
```

---

## Phase 2: MCP Tool Server

### Task 5: MCP server scaffold with action tools

**Files:**
- Create: `backend/src/mcp/server.ts`
- Create: `backend/src/mcp/tools/actions.ts`
- Create: `backend/src/mcp/index.ts`

- [ ] **Step 1: Create `backend/src/mcp/tools/actions.ts`**

This file registers all action tools (create/update/delete/query for events, todos, courses) with the MCP server. Each tool validates input and returns structured results.

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDb } from "../../db/client.js";
import { v4 as uuid } from "uuid";

export function registerActionTools(server: McpServer) {
  server.tool("create_event", "Create a calendar event", {
    title: z.string(),
    description: z.string().optional(),
    start: z.string().describe("ISO 8601 datetime"),
    end: z.string().describe("ISO 8601 datetime"),
    type: z.enum(["lecture", "study", "club", "recreation", "meal", "custom"]),
    color: z.string().optional(),
    course_id: z.string().optional(),
  }, async (params) => {
    const db = getDb();
    if (params.course_id) {
      const course = db.prepare("SELECT id FROM courses WHERE id = ?").get(params.course_id);
      if (!course) return { content: [{ type: "text", text: `Error: course_id '${params.course_id}' not found` }] };
    }
    const id = uuid();
    db.prepare(
      `INSERT INTO events (id, title, description, start, end, type, color, course_id, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'agent')`
    ).run(id, params.title, params.description ?? null, params.start, params.end, params.type, params.color ?? null, params.course_id ?? null);
    const event = db.prepare("SELECT * FROM events WHERE id = ?").get(id);
    return { content: [{ type: "text", text: JSON.stringify(event) }] };
  });

  server.tool("update_event", "Update a calendar event", {
    event_id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    type: z.enum(["lecture", "study", "club", "recreation", "meal", "custom"]).optional(),
    color: z.string().optional(),
    course_id: z.string().nullable().optional(),
  }, async (params) => {
    const db = getDb();
    const existing = db.prepare("SELECT * FROM events WHERE id = ?").get(params.event_id);
    if (!existing) return { content: [{ type: "text", text: `Error: event '${params.event_id}' not found` }] };
    const { event_id, ...updates } = params;
    const fields = Object.entries(updates).filter(([_, v]) => v !== undefined);
    if (fields.length === 0) return { content: [{ type: "text", text: "Error: no fields to update" }] };
    const setClause = fields.map(([k]) => `${k} = ?`).join(", ");
    const values = fields.map(([_, v]) => v);
    db.prepare(`UPDATE events SET ${setClause} WHERE id = ?`).run(...values, event_id);
    const updated = db.prepare("SELECT * FROM events WHERE id = ?").get(event_id);
    return { content: [{ type: "text", text: JSON.stringify(updated) }] };
  });

  server.tool("delete_event", "Delete a calendar event", {
    event_id: z.string(),
  }, async (params) => {
    const db = getDb();
    const result = db.prepare("DELETE FROM events WHERE id = ?").run(params.event_id);
    if (result.changes === 0) return { content: [{ type: "text", text: `Error: event '${params.event_id}' not found` }] };
    return { content: [{ type: "text", text: `Deleted event ${params.event_id}` }] };
  });

  server.tool("create_todo", "Create a todo item", {
    title: z.string(),
    description: z.string().optional(),
    type: z.enum(["assignment", "email_action", "personal", "revision"]),
    deadline: z.string().optional().describe("ISO 8601 datetime"),
    priority: z.enum(["high", "medium", "low"]),
    course_id: z.string().optional(),
  }, async (params) => {
    const db = getDb();
    if (params.course_id) {
      const course = db.prepare("SELECT id FROM courses WHERE id = ?").get(params.course_id);
      if (!course) return { content: [{ type: "text", text: `Error: course_id '${params.course_id}' not found` }] };
    }
    const id = uuid();
    db.prepare(
      `INSERT INTO todos (id, title, description, type, deadline, priority, course_id, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'agent')`
    ).run(id, params.title, params.description ?? null, params.type, params.deadline ?? null, params.priority, params.course_id ?? null);
    const todo = db.prepare("SELECT * FROM todos WHERE id = ?").get(id);
    return { content: [{ type: "text", text: JSON.stringify(todo) }] };
  });

  server.tool("update_todo", "Update a todo item", {
    todo_id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    type: z.enum(["assignment", "email_action", "personal", "revision"]).optional(),
    deadline: z.string().nullable().optional(),
    priority: z.enum(["high", "medium", "low"]).optional(),
    completed: z.boolean().optional(),
    course_id: z.string().nullable().optional(),
  }, async (params) => {
    const db = getDb();
    const existing = db.prepare("SELECT * FROM todos WHERE id = ?").get(params.todo_id);
    if (!existing) return { content: [{ type: "text", text: `Error: todo '${params.todo_id}' not found` }] };
    const { todo_id, ...updates } = params;
    const fields = Object.entries(updates).filter(([_, v]) => v !== undefined);
    if (fields.length === 0) return { content: [{ type: "text", text: "Error: no fields to update" }] };
    const setClause = fields.map(([k]) => `${k === "completed" ? k : k} = ?`).join(", ");
    const values = fields.map(([_, v]) => typeof v === "boolean" ? (v ? 1 : 0) : v);
    db.prepare(`UPDATE todos SET ${setClause} WHERE id = ?`).run(...values, todo_id);
    const updated = db.prepare("SELECT * FROM todos WHERE id = ?").get(todo_id);
    return { content: [{ type: "text", text: JSON.stringify(updated) }] };
  });

  server.tool("delete_todo", "Delete a todo item", {
    todo_id: z.string(),
  }, async (params) => {
    const db = getDb();
    const result = db.prepare("DELETE FROM todos WHERE id = ?").run(params.todo_id);
    if (result.changes === 0) return { content: [{ type: "text", text: `Error: todo '${params.todo_id}' not found` }] };
    return { content: [{ type: "text", text: `Deleted todo ${params.todo_id}` }] };
  });

  server.tool("create_course", "Create a course", {
    name: z.string(),
    description: z.string().optional(),
    moodle_course_id: z.string().optional(),
    tum_course_id: z.string().optional(),
    exam_date: z.string().optional(),
  }, async (params) => {
    const db = getDb();
    const id = uuid();
    db.prepare(
      `INSERT INTO courses (id, name, description, moodle_course_id, tum_course_id, exam_date, source)
       VALUES (?, ?, ?, ?, ?, ?, 'agent')`
    ).run(id, params.name, params.description ?? null, params.moodle_course_id ?? null, params.tum_course_id ?? null, params.exam_date ?? null);
    const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(id);
    return { content: [{ type: "text", text: JSON.stringify(course) }] };
  });

  server.tool("query_events", "Query calendar events with filters", {
    start: z.string().optional().describe("ISO 8601 lower bound"),
    end: z.string().optional().describe("ISO 8601 upper bound"),
    course_id: z.string().optional(),
    type: z.string().optional(),
  }, async (params) => {
    const db = getDb();
    let sql = "SELECT * FROM events WHERE 1=1";
    const p: unknown[] = [];
    if (params.start) { sql += " AND end >= ?"; p.push(params.start); }
    if (params.end) { sql += " AND start <= ?"; p.push(params.end); }
    if (params.course_id) { sql += " AND course_id = ?"; p.push(params.course_id); }
    if (params.type) { sql += " AND type = ?"; p.push(params.type); }
    sql += " ORDER BY start ASC";
    const events = db.prepare(sql).all(...p);
    return { content: [{ type: "text", text: JSON.stringify(events) }] };
  });

  server.tool("query_todos", "Query todos with filters", {
    course_id: z.string().optional(),
    type: z.string().optional(),
    completed: z.boolean().optional(),
  }, async (params) => {
    const db = getDb();
    let sql = "SELECT * FROM todos WHERE 1=1";
    const p: unknown[] = [];
    if (params.course_id) { sql += " AND course_id = ?"; p.push(params.course_id); }
    if (params.type) { sql += " AND type = ?"; p.push(params.type); }
    if (params.completed !== undefined) { sql += " AND completed = ?"; p.push(params.completed ? 1 : 0); }
    sql += " ORDER BY COALESCE(deadline, '9999-12-31') ASC";
    const todos = db.prepare(sql).all(...p);
    return { content: [{ type: "text", text: JSON.stringify(todos) }] };
  });

  server.tool("query_courses", "List all courses with event and todo counts", {}, async () => {
    const db = getDb();
    const courses = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM events WHERE course_id = c.id) as event_count,
        (SELECT COUNT(*) FROM todos WHERE course_id = c.id) as todo_count
      FROM courses c ORDER BY c.name ASC
    `).all();
    return { content: [{ type: "text", text: JSON.stringify(courses) }] };
  });
}
```

- [ ] **Step 2: Create `backend/src/mcp/index.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerActionTools } from "./tools/actions.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "assistum-tools",
    version: "1.0.0",
  });

  registerActionTools(server);

  return server;
}
```

- [ ] **Step 3: Create `backend/src/mcp/server.ts`** (standalone entry point for OpenCode)

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./index.js";

const server = createMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **Step 4: Verify MCP server starts without errors**

Run: `npx tsx backend/src/mcp/server.ts`
Expected: Process starts and waits for stdio input (no crash)

- [ ] **Step 5: Commit**

```bash
git add backend/src/mcp/
git commit -m "feat: MCP tool server with action tools for events, todos, courses"
```

---

### Task 6: MCP fetch tools (TUM Online, iCal, Moodle, Eat-API, Email, Clubs)

**Files:**
- Create: `backend/src/mcp/tools/fetch.ts`
- Modify: `backend/src/mcp/index.ts`

- [ ] **Step 1: Create `backend/src/mcp/tools/fetch.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { parseString } from "xml2js";
import { promisify } from "util";

const parseXml = promisify(parseString);

function getSetting(key: string): string | undefined {
  const { getDb } = require("../../db/client.js");
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value;
}

export function registerFetchTools(server: McpServer) {
  server.tool("tum_lectures", "Fetch enrolled lectures from TUM Online", {}, async () => {
    const token = getSetting("tum_online_token");
    if (!token) return { content: [{ type: "text", text: "Error: TUM Online token not configured. Ask user to set it up in Settings." }] };
    const url = `https://campus.tum.de/tumonline/wbservicesbasic.veranstaltungenEigene?pToken=${encodeURIComponent(token)}`;
    const resp = await fetch(url);
    const xml = await resp.text();
    if (xml.includes("<error>")) return { content: [{ type: "text", text: `TUM Online error: ${xml}` }] };
    const parsed = await parseXml(xml);
    return { content: [{ type: "text", text: JSON.stringify(parsed) }] };
  });

  server.tool("tum_calendar", "Fetch TUM calendar events from iCal feed", {}, async () => {
    const icalUrl = getSetting("tum_ical_url");
    if (!icalUrl) return { content: [{ type: "text", text: "Error: TUM iCal URL not configured. Ask user to paste it in Settings." }] };
    const ical = await import("node-ical");
    const events = await ical.async.fromURL(icalUrl);
    const parsed = Object.values(events)
      .filter((e: any) => e.type === "VEVENT")
      .map((e: any) => ({
        title: e.summary,
        description: e.description,
        start: e.start?.toISOString(),
        end: e.end?.toISOString(),
        location: e.location,
      }));
    return { content: [{ type: "text", text: JSON.stringify(parsed) }] };
  });

  server.tool("tum_grades", "Fetch grades from TUM Online", {}, async () => {
    const token = getSetting("tum_online_token");
    if (!token) return { content: [{ type: "text", text: "Error: TUM Online token not configured." }] };
    const url = `https://campus.tum.de/tumonline/wbservicesbasic.noten?pToken=${encodeURIComponent(token)}`;
    const resp = await fetch(url);
    const xml = await resp.text();
    if (xml.includes("<error>")) return { content: [{ type: "text", text: `TUM Online error: ${xml}` }] };
    const parsed = await parseXml(xml);
    return { content: [{ type: "text", text: JSON.stringify(parsed) }] };
  });

  server.tool("moodle_courses", "Fetch enrolled courses from Moodle", {}, async () => {
    const token = getSetting("moodle_token");
    if (!token) return { content: [{ type: "text", text: "Error: Moodle token not configured." }] };
    const url = `https://www.moodle.tum.de/webservice/rest/server.php?wstoken=${token}&wsfunction=core_enrol_get_users_courses&moodlewsrestformat=json&userid=0`;
    const resp = await fetch(url);
    const data = await resp.json();
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  });

  server.tool("moodle_assignments", "Fetch assignments from Moodle", {
    course_ids: z.array(z.number()).optional().describe("Moodle course IDs to filter by"),
  }, async (params) => {
    const token = getSetting("moodle_token");
    if (!token) return { content: [{ type: "text", text: "Error: Moodle token not configured." }] };
    let url = `https://www.moodle.tum.de/webservice/rest/server.php?wstoken=${token}&wsfunction=mod_assign_get_assignments&moodlewsrestformat=json`;
    if (params.course_ids) {
      params.course_ids.forEach((id, i) => { url += `&courseids[${i}]=${id}`; });
    }
    const resp = await fetch(url);
    const data = await resp.json();
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  });

  server.tool("moodle_course_content", "Fetch course content (slides, readings) from Moodle", {
    course_id: z.number().describe("Moodle course ID"),
  }, async (params) => {
    const token = getSetting("moodle_token");
    if (!token) return { content: [{ type: "text", text: "Error: Moodle token not configured." }] };
    const url = `https://www.moodle.tum.de/webservice/rest/server.php?wstoken=${token}&wsfunction=core_course_get_contents&moodlewsrestformat=json&courseid=${params.course_id}`;
    const resp = await fetch(url);
    const data = await resp.json();
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  });

  server.tool("canteen_menu", "Fetch weekly canteen menu", {
    location: z.string().describe("Canteen ID, e.g. mensa-garching"),
    year: z.number().optional(),
    week: z.number().optional(),
  }, async (params) => {
    const now = new Date();
    const year = params.year ?? now.getFullYear();
    const week = params.week ?? getWeekNumber(now);
    const weekStr = String(week).padStart(2, "0");
    const url = `https://tum-dev.github.io/eat-api/${params.location}/${year}/${weekStr}.json`;
    const resp = await fetch(url);
    if (!resp.ok) return { content: [{ type: "text", text: `Error: canteen menu not found for ${params.location} week ${week}` }] };
    const data = await resp.json();
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  });

  server.tool("tum_email_read", "Fetch recent emails from TUM inbox via IMAP", {
    limit: z.number().optional().describe("Max emails to fetch, default 20"),
    since_days: z.number().optional().describe("Fetch emails from last N days, default 7"),
  }, async (params) => {
    const user = getSetting("tum_email_user");
    const pass = getSetting("tum_email_password");
    if (!user || !pass) return { content: [{ type: "text", text: "Error: TUM email credentials not configured." }] };
    const { ImapFlow } = await import("imapflow");
    const client = new ImapFlow({
      host: "mail.tum.de",
      port: 993,
      secure: true,
      auth: { user, pass },
      logger: false,
    });
    try {
      await client.connect();
      const lock = await client.getMailboxLock("INBOX");
      try {
        const since = new Date();
        since.setDate(since.getDate() - (params.since_days ?? 7));
        const messages: unknown[] = [];
        const limit = params.limit ?? 20;
        let count = 0;
        for await (const msg of client.fetch(
          { since },
          { envelope: true, bodyStructure: true, source: { start: 0, maxLength: 2000 } }
        )) {
          if (count >= limit) break;
          messages.push({
            message_id: msg.envelope.messageId,
            subject: msg.envelope.subject,
            sender: msg.envelope.from?.[0]?.address,
            date: msg.envelope.date?.toISOString(),
            body_snippet: msg.source?.toString().slice(0, 500),
          });
          count++;
        }
        return { content: [{ type: "text", text: JSON.stringify(messages) }] };
      } finally {
        lock.release();
      }
    } catch (err: any) {
      return { content: [{ type: "text", text: `IMAP error: ${err.message}` }] };
    } finally {
      await client.logout();
    }
  });

  server.tool("club_events", "Fetch events from curated student club URLs", {}, async () => {
    const { getDb } = require("../../db/client.js");
    const db = getDb();
    const clubs = db.prepare("SELECT * FROM clubs").all() as { name: string; url: string }[];
    if (clubs.length === 0) return { content: [{ type: "text", text: "No clubs configured. Ask user to add club URLs in Settings." }] };
    const results: unknown[] = [];
    for (const club of clubs) {
      try {
        const resp = await fetch(club.url);
        const html = await resp.text();
        results.push({ club: club.name, url: club.url, html_snippet: html.slice(0, 3000) });
      } catch (err: any) {
        results.push({ club: club.name, url: club.url, error: err.message });
      }
    }
    return { content: [{ type: "text", text: JSON.stringify(results) }] };
  });
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
```

- [ ] **Step 2: Register fetch tools in `backend/src/mcp/index.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerActionTools } from "./tools/actions.js";
import { registerFetchTools } from "./tools/fetch.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "assistum-tools",
    version: "1.0.0",
  });

  registerActionTools(server);
  registerFetchTools(server);

  return server;
}
```

- [ ] **Step 3: Verify MCP server compiles**

Run: `npx tsx --no-warnings backend/src/mcp/server.ts`
Expected: Process starts without errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/mcp/
git commit -m "feat: MCP fetch tools for TUM Online, iCal, Moodle, Eat-API, email, clubs"
```

---

### Task 7: MCP live tools (MVV, canteen occupancy, study rooms, NavigaTum, email send)

**Files:**
- Create: `backend/src/mcp/tools/live.ts`
- Modify: `backend/src/mcp/index.ts`

- [ ] **Step 1: Create `backend/src/mcp/tools/live.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

function getSetting(key: string): string | undefined {
  const { getDb } = require("../../db/client.js");
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value;
}

export function registerLiveTools(server: McpServer) {
  server.tool("mvv_departures", "Get live MVV departures for a station", {
    station: z.string().describe("Station name, e.g. 'Garching-Forschungszentrum'"),
  }, async (params) => {
    const searchParams = new URLSearchParams({
      outputFormat: "JSON",
      language: "en",
      stateless: "1",
      coordOutputFormat: "WGS84",
      type_dm: "stop",
      name_dm: params.station,
      useRealtime: "1",
      itOptionsActive: "1",
      ptOptionsActive: "1",
      limit: "10",
      mergeDep: "1",
      useAllStops: "1",
      mode: "direct",
    });
    const url = `https://efa.mvv-muenchen.de/ng/XML_DM_REQUEST?${searchParams}`;
    const resp = await fetch(url);
    const data = await resp.json();
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  });

  server.tool("study_rooms", "Get available study rooms from Iris API", {}, async () => {
    const resp = await fetch("https://iris.asta.tum.de/api");
    const data = await resp.json();
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  });

  server.tool("navigatum_search", "Search for TUM buildings and rooms", {
    query: z.string().describe("Search query, e.g. room code or building name"),
  }, async (params) => {
    const url = `https://nav.tum.de/api/search?q=${encodeURIComponent(params.query)}`;
    const resp = await fetch(url);
    const data = await resp.json();
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  });

  server.tool("tum_email_send", "Send an email via TUM SMTP", {
    to: z.string().describe("Recipient email address"),
    subject: z.string(),
    body: z.string(),
    in_reply_to: z.string().optional().describe("Message-ID to reply to"),
  }, async (params) => {
    const user = getSetting("tum_email_user");
    const pass = getSetting("tum_email_password");
    if (!user || !pass) return { content: [{ type: "text", text: "Error: TUM email credentials not configured." }] };
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host: "mail.tum.de",
      port: 587,
      secure: false,
      auth: { user, pass },
    });
    try {
      const info = await transport.sendMail({
        from: user,
        to: params.to,
        subject: params.subject,
        text: params.body,
        ...(params.in_reply_to ? { inReplyTo: params.in_reply_to } : {}),
      });
      return { content: [{ type: "text", text: `Email sent: ${info.messageId}` }] };
    } catch (err: any) {
      return { content: [{ type: "text", text: `SMTP error: ${err.message}` }] };
    }
  });

  server.tool("canteen_occupancy", "Get live canteen head count", {
    canteen_id: z.string().describe("Canteen ID, e.g. 'mensa-garching'"),
  }, async (params) => {
    // gRPC call to api.tum.app - simplified to REST fallback for hackathon
    const url = `https://api.tum.app/v1/canteen/headCount/${encodeURIComponent(params.canteen_id)}`;
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    } catch (err: any) {
      return { content: [{ type: "text", text: `Canteen occupancy error: ${err.message}` }] };
    }
  });
}
```

- [ ] **Step 2: Register live tools in `backend/src/mcp/index.ts`**

Add import and call:
```typescript
import { registerLiveTools } from "./tools/live.js";

// Inside createMcpServer():
registerLiveTools(server);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/mcp/
git commit -m "feat: MCP live tools for MVV, study rooms, NavigaTum, email send, canteen occupancy"
```

---

### Task 8: OpenCode integration (agent proxy + SSE)

**Files:**
- Create: `backend/src/agent/opencode.ts`
- Create: `backend/src/api/agent.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Create `backend/src/agent/opencode.ts`**

```typescript
import { createOpencodeClient } from "@opencode-ai/sdk/client";
import { createOpencodeServer } from "@opencode-ai/sdk/server";
import { config } from "../config.js";

let clientInstance: ReturnType<typeof createOpencodeClient> | null = null;

export async function getOpenCodeClient() {
  if (clientInstance) return clientInstance;

  if (config.openCodeUrl) {
    clientInstance = createOpencodeClient({ baseUrl: config.openCodeUrl });
  } else {
    const server = await createOpencodeServer({ port: 4096, timeout: 15000 });
    clientInstance = createOpencodeClient({ baseUrl: server.url });
  }
  return clientInstance;
}
```

- [ ] **Step 2: Create `backend/src/api/agent.ts`**

```typescript
import { Router, Request, Response } from "express";
import { getOpenCodeClient } from "../agent/opencode.js";

export const agentRouter = Router();

agentRouter.post("/session", async (_req, res) => {
  try {
    const client = await getOpenCodeClient();
    const result = await client.session.create();
    res.json(result.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

agentRouter.post("/session/:id/message", async (req, res) => {
  try {
    const client = await getOpenCodeClient();
    const result = await client.session.prompt({
      path: { id: req.params.id },
      body: {
        parts: [{ type: "text", text: req.body.message }],
      },
    });
    res.json(result.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

agentRouter.post("/session/:id/message/async", async (req, res) => {
  try {
    const client = await getOpenCodeClient();
    const result = await client.session.promptAsync({
      path: { id: req.params.id },
      body: {
        parts: [{ type: "text", text: req.body.message }],
      },
    });
    res.json(result.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

agentRouter.get("/session/:id/messages", async (req, res) => {
  try {
    const client = await getOpenCodeClient();
    const result = await client.session.messages({
      path: { id: req.params.id },
    });
    res.json(result.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

agentRouter.get("/session/:id/status", async (req, res) => {
  try {
    const client = await getOpenCodeClient();
    const result = await client.session.status({
      query: { directory: undefined },
    });
    res.json(result.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

agentRouter.get("/events", async (req: Request, res: Response) => {
  try {
    const client = await getOpenCodeClient();
    const stream = await client.global.event();

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    if (stream.data) {
      for await (const event of stream.data as AsyncIterable<{ data: string; event?: string }>) {
        res.write(`event: ${event.event ?? "message"}\ndata: ${event.data}\n\n`);
      }
    }

    req.on("close", () => {
      res.end();
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **Step 3: Wire agent router into `backend/src/index.ts`**

Add:
```typescript
import { agentRouter } from "./api/agent.js";
app.use("/api/agent", agentRouter);
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/agent/ backend/src/api/agent.ts backend/src/index.ts
git commit -m "feat: OpenCode integration with session management and event streaming"
```

---

## Phase 3: Frontend

### Task 9: Frontend scaffolding with TailwindCSS and 3-panel layout

**Files:**
- Create: `frontend/src/App.tsx` (replace)
- Create: `frontend/src/components/Layout.tsx`
- Create: `frontend/src/index.css`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Modify: `frontend/package.json` (add deps)

- [ ] **Step 1: Add frontend dependencies**

Add to `frontend/package.json` dependencies:
```json
{
  "@fullcalendar/core": "^6.1.20",
  "@fullcalendar/interaction": "^6.1.20",
  "@fullcalendar/react": "^6.1.20",
  "@fullcalendar/timegrid": "^6.1.20",
  "@radix-ui/react-checkbox": "^1.3.0",
  "@radix-ui/react-dialog": "^1.1.0",
  "@radix-ui/react-label": "^2.1.0",
  "@tanstack/react-query": "^5.90.0",
  "tailwindcss": "^4.0.0",
  "@tailwindcss/vite": "^4.0.0",
  "react-router-dom": "^7.0.0"
}
```

- [ ] **Step 2: Create `frontend/src/index.css`**

```css
@import "tailwindcss";
```

- [ ] **Step 3: Update `frontend/vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
```

- [ ] **Step 4: Create `frontend/src/components/Layout.tsx`**

```tsx
import { ReactNode } from "react";

export function Layout({
  sidebar,
  main,
  chat,
}: {
  sidebar: ReactNode;
  main: ReactNode;
  chat: ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <h1 className="text-lg font-semibold">AssisTUM</h1>
        <button className="text-sm text-zinc-400 hover:text-zinc-200">Settings</button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 border-r border-zinc-800 overflow-y-auto p-4">
          {sidebar}
        </aside>
        <main className="flex-1 overflow-y-auto p-4">{main}</main>
        <aside className="w-96 border-l border-zinc-800 flex flex-col">
          {chat}
        </aside>
      </div>
      <footer className="px-4 py-1 border-t border-zinc-800 text-xs text-zinc-500">
        Connecting to services...
      </footer>
    </div>
  );
}
```

- [ ] **Step 5: Update `frontend/src/App.tsx`**

```tsx
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./components/Layout";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout
        sidebar={<div className="text-zinc-500">Todos will appear here</div>}
        main={<div className="text-zinc-500">Calendar will appear here</div>}
        chat={<div className="text-zinc-500 p-4">Agent chat will appear here</div>}
      />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 6: Install and run frontend**

Run: `npm install -w frontend && npm run dev -w frontend`
Expected: Vite dev server starts, browser shows 3-panel layout at `localhost:5173`

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat: frontend scaffolding with TailwindCSS and 3-panel layout"
```

---

### Task 10: Calendar panel with FullCalendar

**Files:**
- Create: `frontend/src/components/Calendar.tsx`
- Create: `frontend/src/hooks/useEvents.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `frontend/src/hooks/useEvents.ts`**

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type Event = {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  type: string;
  color: string | null;
  course_id: string | null;
  source: string;
};

export function useEvents() {
  return useQuery<Event[]>({
    queryKey: ["events"],
    queryFn: async () => {
      const res = await fetch("/api/events");
      return res.json();
    },
    refetchInterval: 2000,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (event: Partial<Event>) => {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...event, source: "user" }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<Event> & { id: string }) => {
      const res = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}
```

- [ ] **Step 2: Create `frontend/src/components/Calendar.tsx`**

```tsx
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useEvents, useCreateEvent, useUpdateEvent } from "../hooks/useEvents";

const typeColors: Record<string, string> = {
  lecture: "#3b82f6",
  study: "#22c55e",
  meal: "#f97316",
  club: "#a855f7",
  recreation: "#ec4899",
  custom: "#6b7280",
};

export function Calendar() {
  const { data: events } = useEvents();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();

  const calendarEvents = (events ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    backgroundColor: e.color ?? typeColors[e.type] ?? "#6b7280",
    borderColor: "transparent",
    extendedProps: { type: e.type, description: e.description },
  }));

  return (
    <FullCalendar
      plugins={[timeGridPlugin, interactionPlugin]}
      initialView="timeGridWeek"
      headerToolbar={{
        left: "prev,next today",
        center: "title",
        right: "",
      }}
      events={calendarEvents}
      editable={true}
      selectable={true}
      nowIndicator={true}
      allDaySlot={false}
      slotMinTime="07:00:00"
      slotMaxTime="22:00:00"
      height="100%"
      select={(info) => {
        const title = prompt("Event title:");
        if (title) {
          createEvent.mutate({
            title,
            start: info.startStr,
            end: info.endStr,
            type: "custom",
          });
        }
      }}
      eventDrop={(info) => {
        updateEvent.mutate({
          id: info.event.id,
          start: info.event.startStr,
          end: info.event.endStr,
        });
      }}
      eventResize={(info) => {
        updateEvent.mutate({
          id: info.event.id,
          start: info.event.startStr,
          end: info.event.endStr,
        });
      }}
    />
  );
}
```

- [ ] **Step 3: Wire Calendar into App**

In `frontend/src/App.tsx`, replace the main placeholder:
```tsx
import { Calendar } from "./components/Calendar";
// ...
main={<Calendar />}
```

- [ ] **Step 4: Run both backend + frontend, verify calendar renders**

Run: `npm run dev` (starts both via concurrently)
Expected: Calendar shows in center panel, can create events by selecting time slots

- [ ] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: FullCalendar integration with event CRUD"
```

---

### Task 11: Todo panel with deadline bucketing

**Files:**
- Create: `frontend/src/hooks/useTodos.ts`
- Create: `frontend/src/components/TodoPanel.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `frontend/src/hooks/useTodos.ts`**

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type Todo = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  deadline: string | null;
  priority: string | null;
  completed: number;
  course_id: string | null;
  source: string;
};

export function useTodos() {
  return useQuery<Todo[]>({
    queryKey: ["todos"],
    queryFn: async () => {
      const res = await fetch("/api/todos");
      return res.json();
    },
    refetchInterval: 2000,
  });
}

export function useToggleTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todos"] }),
  });
}
```

- [ ] **Step 2: Create `frontend/src/components/TodoPanel.tsx`**

```tsx
import { useTodos, useToggleTodo } from "../hooks/useTodos";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const priorityColors: Record<string, string> = {
  high: "text-red-400",
  medium: "text-yellow-400",
  low: "text-zinc-400",
};

export function TodoPanel() {
  const { data: todos } = useTodos();
  const toggleTodo = useToggleTodo();

  const buckets = new Map<string, typeof todos>();
  for (const todo of todos ?? []) {
    const key = todo.deadline ? formatDate(todo.deadline) : "No deadline";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(todo);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Todos</h2>
      {buckets.size === 0 && (
        <p className="text-sm text-zinc-500">No todos yet</p>
      )}
      {[...buckets.entries()].map(([date, items]) => (
        <div key={date}>
          <div className="text-xs font-medium text-zinc-500 mb-1 border-b border-zinc-800 pb-1">
            {date}
          </div>
          {items!.map((todo) => (
            <label
              key={todo.id}
              className="flex items-start gap-2 py-1 cursor-pointer hover:bg-zinc-900 rounded px-1"
            >
              <input
                type="checkbox"
                checked={!!todo.completed}
                onChange={() => toggleTodo.mutate({ id: todo.id, completed: !todo.completed })}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <span className={`text-sm ${todo.completed ? "line-through text-zinc-600" : ""}`}>
                  {todo.title}
                </span>
                {todo.priority && (
                  <span className={`text-xs ml-2 ${priorityColors[todo.priority] ?? ""}`}>
                    {todo.priority}
                  </span>
                )}
              </div>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Wire TodoPanel into App**

In `frontend/src/App.tsx`, replace sidebar placeholder:
```tsx
import { TodoPanel } from "./components/TodoPanel";
// ...
sidebar={<TodoPanel />}
```

- [ ] **Step 4: Verify todos render with deadline bucketing**

Create some test todos via curl with different deadlines, verify the panel groups and sorts them.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: todo panel with deadline bucketing and checkbox toggle"
```

---

### Task 12: Agent chat panel

**Files:**
- Create: `frontend/src/hooks/useAgent.ts`
- Create: `frontend/src/components/ChatPanel.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `frontend/src/hooks/useAgent.ts`**

```tsx
import { useState, useCallback } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

export function useAgent() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    setMessages((prev) => [...prev, { role: "user", content: text, timestamp: Date.now() }]);
    setLoading(true);

    try {
      let sid = sessionId;
      if (!sid) {
        const createRes = await fetch("/api/agent/session", { method: "POST" });
        const session = await createRes.json();
        sid = session.id;
        setSessionId(sid);
      }

      const res = await fetch(`/api/agent/session/${sid}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      const textParts = (data.parts ?? [])
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("\n");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: textParts || "(Agent is working...)", timestamp: Date.now() },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message}`, timestamp: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  return { messages, sendMessage, loading };
}
```

- [ ] **Step 2: Create `frontend/src/components/ChatPanel.tsx`**

```tsx
import { useState, useRef, useEffect } from "react";
import { useAgent } from "../hooks/useAgent";

export function ChatPanel() {
  const { messages, sendMessage, loading } = useAgent();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500">
            Type a message to start planning your week...
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`text-sm ${msg.role === "user" ? "text-zinc-300" : "text-zinc-100"}`}>
            <span className="text-xs text-zinc-500 block mb-0.5">
              {msg.role === "user" ? "You" : "AssisTUM"}
            </span>
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="text-sm text-zinc-500 animate-pulse">Agent is working...</div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Plan my next week..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-sm px-4 py-2 rounded"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Wire ChatPanel into App**

In `frontend/src/App.tsx`:
```tsx
import { ChatPanel } from "./components/ChatPanel";
// ...
chat={<ChatPanel />}
```

- [ ] **Step 4: Run full app, test sending a message**

Run: `npm run dev`
Expected: Sending "hello" in the chat panel → triggers OpenCode session creation → agent responds

- [ ] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: agent chat panel with OpenCode session management"
```

---

## Phase 4: Skills and Demo Polish

### Task 13: Write OpenCode skills

**Files:**
- Create: `backend/src/skills/plan-week.md`
- Create: `backend/src/skills/schedule-study-sessions.md`
- Create: `backend/src/skills/conflict-resolver.md`
- Create: `backend/src/skills/course-brainstorm.md`
- Create: `backend/src/skills/find-study-room.md`
- Create: `backend/src/skills/commute-helper.md`

- [ ] **Step 1: Create `backend/src/skills/plan-week.md`**

```markdown
---
name: plan-week
description: Plan the student's upcoming week by fetching all data sources and populating the calendar and todo list
---

You are planning a student's week. Follow these steps:

1. **Fetch lectures:** Call `tum_lectures` to get enrolled lectures. For each lecture, call `create_event` with type "lecture" and color "#3b82f6".

2. **Fetch calendar:** Call `tum_calendar` to get iCal events. For each event not already added as a lecture, call `create_event` with the appropriate type.

3. **Fetch Moodle data:** Call `moodle_courses` to get enrolled courses. For each course, call `create_course`. Then call `moodle_assignments` to get deadlines. For each assignment, call `create_todo` with type "assignment" and link to the course.

4. **Fetch emails:** Call `tum_email_read` to get recent emails. Summarize important emails and create `email_action` todos for any that need a response.

5. **Fetch canteen menus:** Call `canteen_menu` for the student's preferred canteen. Suggest lunch events between lectures.

6. **Fetch club events:** Call `club_events`. For each relevant event, call `create_event` with type "club" and color "#a855f7".

7. **Detect conflicts:** Call `query_events` for the week. Check for overlapping events. Report any conflicts to the user and suggest resolutions.

8. **Summarize:** Tell the user what you've added: N lectures, N todos, N lunch suggestions, any conflicts found.

Important:
- Use `create_event` and `create_todo` tool calls for every item — these persist to the database and show in the UI immediately.
- Set appropriate colors: lectures blue (#3b82f6), study green (#22c55e), meals orange (#f97316), clubs purple (#a855f7).
- Link todos and events to courses via course_id when applicable.
- Set todo priorities: assignments due within 3 days = high, within 7 days = medium, else low.
```

- [ ] **Step 2: Create remaining skills**

Create `backend/src/skills/schedule-study-sessions.md`:
```markdown
---
name: schedule-study-sessions
description: Schedule study blocks based on assignment deadlines and calendar availability
---

Help the student schedule study time:

1. Ask about their workload preferences (hours per day, preferred study times).
2. Call `moodle_course_content` for relevant courses to understand prep needed.
3. Call `query_events` to find free time slots in the week.
4. Call `query_todos` to see upcoming deadlines.
5. Propose study blocks distributed before deadlines.
6. Once agreed, call `create_event` for each study session with type "study" and color "#22c55e".
```

Create `backend/src/skills/conflict-resolver.md`:
```markdown
---
name: conflict-resolver
description: Detect and resolve overlapping calendar events
---

1. Call `query_events` to get all events in the relevant time range.
2. Check for overlapping time ranges.
3. Present each conflict to the user: "Event A (time) overlaps with Event B (time)".
4. Ask which to keep, remove, or reschedule.
5. Execute the user's choice with `delete_event` or `update_event`.
```

Create `backend/src/skills/course-brainstorm.md`:
```markdown
---
name: course-brainstorm
description: Discuss course prep strategy and create study sessions
---

1. Call `query_courses` to find the course.
2. Call `moodle_course_content` for the course materials.
3. Call `query_todos` filtered by the course to see existing tasks.
4. Discuss with the user: what topics to focus on, estimated hours needed, preferred schedule.
5. Once agreed, call `create_event` for each study session linked to the course.
```

Create `backend/src/skills/find-study-room.md`:
```markdown
---
name: find-study-room
description: Find available study rooms near a building or lecture
---

1. Call `navigatum_search` with the building name or room code.
2. Call `study_rooms` to check availability.
3. Present available rooms sorted by proximity, with times.
```

Create `backend/src/skills/commute-helper.md`:
```markdown
---
name: commute-helper
description: Help plan commute to campus
---

1. Call `navigatum_search` to resolve the destination building/room.
2. Call `mvv_departures` for the nearest station.
3. Suggest when to leave based on the next departure and lecture start time.
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/skills/
git commit -m "feat: OpenCode skills for plan-week, study sessions, conflicts, brainstorm, rooms, commute"
```

---

### Task 14: Settings page

**Files:**
- Create: `frontend/src/components/SettingsDialog.tsx`
- Create: `frontend/src/hooks/useSettings.ts`
- Modify: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: Create `frontend/src/hooks/useSettings.ts`**

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useSettings() {
  return useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      return res.json();
    },
  });
}

export function useSaveSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await fetch(`/api/settings/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}
```

- [ ] **Step 2: Create `frontend/src/components/SettingsDialog.tsx`**

```tsx
import { useState } from "react";
import { useSettings, useSaveSetting } from "../hooks/useSettings";

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: settings } = useSettings();
  const saveSetting = useSaveSetting();
  const [tumId, setTumId] = useState("");
  const [icalUrl, setIcalUrl] = useState("");
  const [moodleUser, setMoodleUser] = useState("");
  const [moodlePass, setMoodlePass] = useState("");
  const [emailUser, setEmailUser] = useState("");
  const [emailPass, setEmailPass] = useState("");

  if (!open) return null;

  const isConnected = (key: string) => settings?.[key] && settings[key] !== "***" ? false : !!settings?.[key];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Settings</h2>

        <section className="mb-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-2">TUM Online API</h3>
          <div className="flex gap-2">
            <input value={tumId} onChange={(e) => setTumId(e.target.value)} placeholder="TUM ID (e.g. ab12xyz)" className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm" />
            <button onClick={() => { /* TODO: token request flow */ }} className="bg-zinc-700 hover:bg-zinc-600 text-sm px-3 py-1.5 rounded">Connect</button>
          </div>
          {settings?.tum_online_token && <span className="text-xs text-green-400 mt-1 block">Connected</span>}
        </section>

        <section className="mb-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-2">TUM Calendar (iCal)</h3>
          <div className="flex gap-2">
            <input value={icalUrl} onChange={(e) => setIcalUrl(e.target.value)} placeholder="Paste iCal subscription URL" className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm" />
            <button onClick={() => saveSetting.mutate({ key: "tum_ical_url", value: icalUrl })} className="bg-zinc-700 hover:bg-zinc-600 text-sm px-3 py-1.5 rounded">Save</button>
          </div>
          {settings?.tum_ical_url && <span className="text-xs text-green-400 mt-1 block">Connected</span>}
        </section>

        <section className="mb-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-2">Moodle</h3>
          <div className="flex gap-2 mb-1">
            <input value={moodleUser} onChange={(e) => setMoodleUser(e.target.value)} placeholder="Username" className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm" />
            <input value={moodlePass} onChange={(e) => setMoodlePass(e.target.value)} type="password" placeholder="Password" className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm" />
          </div>
          <button onClick={async () => {
            const res = await fetch("/api/settings/moodle_auth", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: JSON.stringify({ username: moodleUser, password: moodlePass }) }) });
          }} className="bg-zinc-700 hover:bg-zinc-600 text-sm px-3 py-1.5 rounded">Connect</button>
          {settings?.moodle_token && <span className="text-xs text-green-400 mt-1 block">Connected</span>}
        </section>

        <section className="mb-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-2">TUM Email</h3>
          <div className="flex gap-2 mb-1">
            <input value={emailUser} onChange={(e) => setEmailUser(e.target.value)} placeholder="TUM ID" className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm" />
            <input value={emailPass} onChange={(e) => setEmailPass(e.target.value)} type="password" placeholder="Password" className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm" />
          </div>
          <button onClick={() => {
            saveSetting.mutate({ key: "tum_email_user", value: emailUser });
            saveSetting.mutate({ key: "tum_email_password", value: emailPass });
          }} className="bg-zinc-700 hover:bg-zinc-600 text-sm px-3 py-1.5 rounded">Connect</button>
          {settings?.tum_email_user && <span className="text-xs text-green-400 mt-1 block">Connected</span>}
        </section>

        <button onClick={onClose} className="w-full bg-zinc-800 hover:bg-zinc-700 text-sm py-2 rounded mt-2">Close</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire settings button in Layout**

In `frontend/src/components/Layout.tsx`, add state and dialog:
```tsx
import { useState } from "react";
import { SettingsDialog } from "./SettingsDialog";

// Inside Layout component:
const [settingsOpen, setSettingsOpen] = useState(false);

// Replace button:
<button onClick={() => setSettingsOpen(true)} className="text-sm text-zinc-400 hover:text-zinc-200">Settings</button>

// After closing </div> for the main layout, before return close:
<SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: settings dialog with TUM Online, iCal, Moodle, email configuration"
```

---

### Task 15: Status bar with connection indicators

**Files:**
- Create: `frontend/src/components/StatusBar.tsx`
- Modify: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: Create `frontend/src/components/StatusBar.tsx`**

```tsx
import { useSettings } from "../hooks/useSettings";

const services = [
  { key: "tum_online_token", label: "TUM Online" },
  { key: "tum_ical_url", label: "TUM Calendar" },
  { key: "moodle_token", label: "Moodle" },
  { key: "tum_email_user", label: "TUM Email" },
];

export function StatusBar() {
  const { data: settings } = useSettings();

  return (
    <div className="flex items-center gap-4 text-xs text-zinc-500">
      {services.map((svc) => (
        <span key={svc.key} className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${settings?.[svc.key] ? "bg-green-400" : "bg-zinc-600"}`} />
          {svc.label}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Use StatusBar in Layout footer**

```tsx
import { StatusBar } from "./StatusBar";
// Replace footer content:
<footer className="px-4 py-1 border-t border-zinc-800">
  <StatusBar />
</footer>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/
git commit -m "feat: status bar with service connection indicators"
```

---

### Task 16: End-to-end demo test

**Files:** None (manual testing)

- [ ] **Step 1: Pre-populate settings for demo**

```bash
# Set TUM Online token (get from TUM Online token management)
curl -X PUT http://localhost:3001/api/settings/tum_online_token -H 'Content-Type: application/json' -d '{"value":"YOUR_TOKEN"}'

# Set iCal URL
curl -X PUT http://localhost:3001/api/settings/tum_ical_url -H 'Content-Type: application/json' -d '{"value":"https://campus.tum.de/tumonlinej/ws/termin/ical?pStud=...&pToken=..."}'

# Set Moodle token
curl -X PUT http://localhost:3001/api/settings/moodle_token -H 'Content-Type: application/json' -d '{"value":"YOUR_MOODLE_TOKEN"}'

# Set email credentials
curl -X PUT http://localhost:3001/api/settings/tum_email_user -H 'Content-Type: application/json' -d '{"value":"ab12xyz@mytum.de"}'
curl -X PUT http://localhost:3001/api/settings/tum_email_password -H 'Content-Type: application/json' -d '{"value":"YOUR_PASSWORD"}'

# Add a club
curl -X POST http://localhost:3001/api/clubs -H 'Content-Type: application/json' -d '{"name":"TUM.ai","url":"https://www.tum-ai.com/events"}'
```

- [ ] **Step 2: Run full app**

Run: `npm run dev`

- [ ] **Step 3: Test core demo flow**

1. Open `http://localhost:5173`
2. Type "Plan my next week" in the chat
3. Verify: calendar populates with lectures, todos appear in left panel
4. Manually add an event by clicking on the calendar
5. Type "check for conflicts"
6. Type "how much time do I need to prep for Discrete Structures?"

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: demo flow adjustments"
```
