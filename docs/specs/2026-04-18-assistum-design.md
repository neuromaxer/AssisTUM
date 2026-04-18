# AssisTUM — Design Spec

**Date:** 2026-04-18  
**Status:** Approved  
**Hackathon:** TUM.ai x Reply Makeathon 2026

## Overview

AssisTUM is an autonomous campus co-pilot for TUM students. It proactively plans a student's week by pulling data from TUM systems (lectures, Moodle deadlines, canteen menus, transit departures, study rooms, student clubs) and presenting an actionable schedule through a 3-panel UI with calendar, tasks, and agent chat.

Built as a standalone app with Node.js backend + React/Vite frontend, powered by OpenCode as the agent engine. Designed for easy future integration into the Appx platform as a first-party agentic app.

## Challenge Fit

The TUM.ai x Reply Makeathon challenge asks for:

- **Campus Co-Pilot Suite** — autonomous agent navigating university logistics
- **Action over Conversation** — agents that execute tasks, not just chat
- **Connecting the Disconnected** — unify fragmented student data sources

AssisTUM addresses all three: it connects 6+ disconnected TUM data sources through an AI agent that autonomously builds schedules, manages tasks, and takes action on the student's behalf.

## Demo Flow

1. Open AssisTUM → 3-panel UI (tasks, calendar, chat)
2. Type "Plan my next week"
3. Agent fetches lectures, Moodle deadlines, canteen menus, club events
4. Calendar and task list populate in real time
5. User asks agent to adjust ("move study session to Thursday", "remove overlapping event")
6. Agent modifies the plan and updates the UI
7. User asks agent to schedule study sessions based on assignment deadlines
8. Agent asks about workload, suggests a plan, adds to calendar

## Architecture

```
AssisTUM (standalone)
┌─────────────────────────────────────────────────┐
│  assistum-backend (Node.js + Express)            │
│  - Starts OpenCode server via @opencode-ai/sdk   │
│  - Campus API adapters (MCP tool server)          │
│  - SQLite (better-sqlite3)                        │
│  - REST API for frontend                          │
│  - Proxies agent chat to OpenCode                 │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  assistum-frontend (Vite + React)                │
│  - Left panel: tasks (deadline order)            │
│  - Center panel: calendar (FullCalendar)         │
│  - Right panel: agent chat                       │
└─────────────────────────────────────────────────┘
```

OpenCode runs as a local server spawned via the JS SDK. Campus APIs are exposed to the agent as MCP tools. Agent orchestration workflows are defined as OpenCode skills.

## MCP Tools (Data Fetching)

Each tool wraps a campus API and returns structured JSON to the agent.

| Tool | Source API | Returns |
|---|---|---|
| `tum_lectures` | TUM Online `veranstaltungenEigene` | User's lectures + times |
| `tum_calendar` | TUM Online `kalender` | Academic calendar events |
| `tum_grades` | TUM Online `noten` | Grades list |
| `moodle_assignments` | Moodle REST API | Deadlines + status |
| `moodle_courses` | Moodle REST API | Enrolled courses |
| `canteen_menu` | Eat-API `{location}/{year}/{week}.json` | Weekly meal plan |
| `canteen_occupancy` | Campus Backend gRPC `GetCanteenHeadCount` | Live headcount % |
| `mvv_departures` | MVV API `XML_DM_REQUEST` | Next departures for a stop |
| `study_rooms` | Iris API | Room availability |
| `navigatum_search` | NavigaTum `api/search` | Building/room locations |
| `student_clubs` | Campus Backend gRPC `ListStudentClub` | Club events/info |

MCP tools never expose credentials to the agent. Tools read tokens from the SQLite settings table at call time.

## Skills (Orchestration Workflows)

Skills are markdown files that instruct the agent on multi-step workflows. They define what tools to call, in what order, and how to structure output.

| Skill | What it instructs the agent to do |
|---|---|
| `plan-week` | Fetch lectures → Moodle deadlines → canteen menus → club events → synthesize into calendar events + tasks. Output as structured JSON. |
| `find-study-room` | Take building/lecture context → search NavigaTum → check Iris availability → suggest rooms sorted by proximity. |
| `schedule-study-sessions` | Ask user about workload → check calendar gaps → distribute study blocks before deadlines → output calendar events. |
| `commute-helper` | Resolve location via NavigaTum → find nearest MVV stop → get departures → suggest when to leave. |

## Agent Output Protocol

The agent responds conversationally and wraps actionable output in fenced blocks:

````
I found 4 lectures and 2 Moodle deadlines. Here's your plan:

```assistum-actions
[
  { "type": "calendar_event", "title": "Linear Algebra", "start": "2026-04-20T09:00", "end": "2026-04-20T11:00", "color": "blue" },
  { "type": "calendar_event", "title": "Lunch — Mensa Garching", "start": "2026-04-20T12:00", "end": "2026-04-20T13:00", "color": "orange" },
  { "type": "task", "title": "Submit ML homework", "deadline": "2026-04-21T23:59", "priority": "high" },
  { "type": "task", "title": "Read Chapter 5 for Databases", "deadline": "2026-04-23T09:00", "priority": "medium" }
]
```

Want me to also find study room slots before the ML deadline?
````

`parser.ts` extracts `assistum-actions` blocks, validates against a schema, and persists to SQLite. Frontend receives both the chat message and parsed actions via SSE.

## Frontend Layout

```
┌─────────────────────────────────────────────────────────┐
│  AssisTUM                                   [settings]  │
├──────────────┬──────────────────────┬───────────────────┤
│  TASKS       │  CALENDAR            │  AGENT CHAT       │
│              │                      │                   │
│  ☐ Submit ML │  FullCalendar        │  Streaming msgs   │
│    hw (Mon)  │  timeGridWeek view   │  via SSE          │
│  ☐ Read Ch.5 │                      │                   │
│    (Wed)     │  Color-coded:        │  Real-time        │
│  ☐ TUM.ai   │  - Lectures (blue)   │  calendar/task    │
│    meetup    │  - Study (green)     │  updates as agent │
│    (Thu)     │  - Meals (orange)    │  outputs actions  │
│              │  - Clubs (purple)    │                   │
├──────────────┴──────────────────────┴───────────────────┤
│  ● Connected to TUM Online, Moodle, Eat-API             │
└─────────────────────────────────────────────────────────┘
```

**Components reused from quaestor-lite:**
- `timeblock-calendar.tsx` → adapted as `WeekCalendar` (strip Next.js imports)
- `calendar-picker-popover.tsx` → date picker
- Radix UI primitives (dialog, checkbox, dropdown, label)

**Key interactions:**
- Agent `calendar_event` actions → events appear on calendar in real time
- Agent `task` actions → tasks appear in left panel in real time
- User edits/drags calendar events → backend updates SQLite
- Status bar shows connected services with green/red indicators

## Backend Structure

```
assistum/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express server, starts OpenCode
│   │   ├── config.ts             # Port, credentials, OpenCode URL
│   │   ├── db/
│   │   │   ├── schema.ts         # SQLite tables
│   │   │   └── client.ts         # better-sqlite3 instance
│   │   ├── api/
│   │   │   ├── events.ts         # CRUD routes for calendar events
│   │   │   ├── tasks.ts          # CRUD routes for tasks
│   │   │   ├── settings.ts       # Credential management routes
│   │   │   └── agent.ts          # Proxy to OpenCode sessions + SSE streaming
│   │   ├── mcp/
│   │   │   ├── server.ts         # MCP tool server (stdio transport)
│   │   │   ├── tools/
│   │   │   │   ├── tum-online.ts # TUM Online API adapter
│   │   │   │   ├── moodle.ts     # Moodle REST API adapter
│   │   │   │   ├── eat-api.ts    # Eat-API adapter
│   │   │   │   ├── mvv.ts        # MVV departures adapter
│   │   │   │   ├── iris.ts       # Study rooms adapter
│   │   │   │   ├── navigatum.ts  # NavigaTum adapter
│   │   │   │   └── clubs.ts      # Campus Backend gRPC adapter
│   │   │   └── index.ts          # Register all tools
│   │   ├── agent/
│   │   │   ├── opencode.ts       # OpenCode SDK wrapper
│   │   │   ├── parser.ts         # Parse assistum-actions blocks
│   │   │   └── actions.ts        # Persist parsed actions to SQLite
│   │   └── skills/
│   │       ├── plan-week.md
│   │       ├── find-study-room.md
│   │       ├── schedule-study-sessions.md
│   │       └── commute-helper.md
│   ├── package.json
│   └── tsconfig.json
├── frontend/                     # Vite + React
├── opencode.json                 # OpenCode config
├── .env                          # Credentials (gitignored)
└── package.json                  # Workspace scripts
```

## SQLite Schema

```sql
-- Calendar events (lectures, meals, study sessions, etc.)
events (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  start       TEXT NOT NULL,   -- ISO 8601
  end         TEXT NOT NULL,   -- ISO 8601
  type        TEXT NOT NULL,   -- lecture, meal, study, club, custom
  color       TEXT,
  source      TEXT NOT NULL,   -- "agent" or "user"
  session_id  TEXT,            -- OpenCode session that created it
  created_at  TEXT NOT NULL
)

-- Tasks with deadlines
tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  deadline    TEXT,            -- ISO 8601
  priority    TEXT,            -- high, medium, low
  completed   INTEGER DEFAULT 0,
  source      TEXT NOT NULL,   -- "agent" or "user"
  session_id  TEXT,
  created_at  TEXT NOT NULL
)

-- Agent sessions
sessions (
  id                  TEXT PRIMARY KEY,
  opencode_session_id TEXT NOT NULL,
  summary             TEXT,
  created_at          TEXT NOT NULL
)

-- Credential and settings storage
settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
)
```

## Credentials & Settings UI

**Settings page (gear icon in top bar):**

- **TUM Online:** TUM ID input → "Connect" → backend calls `requestToken` → "Check your email" → polls `isTokenConfirmed` → stores token in `settings` table
- **Moodle:** Username + password → "Connect" → backend calls `login/token.php` → stores Moodle token in `settings` table
- Status indicators: green/red dot per connected service

MCP tools read credentials from the `settings` table at call time. The agent never sees raw tokens.

For the demo: pre-populate settings DB so the flow starts immediately. Settings page exists as proof of real integration.

## Tech Stack

**Backend:**

| Dependency | Purpose |
|---|---|
| `express` | HTTP server |
| `@opencode-ai/sdk` | Start OpenCode, manage sessions |
| `@modelcontextprotocol/sdk` | Build MCP tool server |
| `better-sqlite3` | SQLite persistence |
| `tsx` | TypeScript execution |
| `dotenv` | Env vars fallback |
| `xml2js` | Parse TUM Online XML responses |
| `@grpc/grpc-js` + `@grpc/proto-loader` | Campus Backend gRPC (clubs, occupancy) |

**Frontend:**

| Dependency | Purpose |
|---|---|
| `react` + `react-dom` | UI framework |
| `vite` | Build tool |
| `@fullcalendar/react` + `/timegrid` + `/interaction` | Calendar |
| `@radix-ui/react-*` | Primitives |
| `tailwindcss` | Styling |
| `@tanstack/react-query` | Data fetching |
| `react-router-dom` | Settings page routing |

## OpenCode Configuration

```json
{
  "model": "anthropic/claude-sonnet-4-6",
  "mcp": {
    "assistum-tools": {
      "type": "local",
      "command": ["npx", "tsx", "backend/src/mcp/server.ts"]
    }
  },
  "instructions": "You are AssisTUM, a campus co-pilot for TUM students. When the user asks you to plan, schedule, or find information, use the available MCP tools to fetch real data. Always output actions as structured JSON in a ```assistum-actions``` code block so the UI can parse them. Be proactive: suggest lunch breaks between lectures, study sessions before deadlines, and efficient commute times."
}
```

## Appx Integration Path

AssisTUM is standalone but designed for zero-friction Appx integration:

1. **Configurable port** — `PORT` env var (default 3001, Appx assigns from 10000–10999)
2. **No built-in auth/TLS** — Appx adds these via proxy
3. **Configurable OpenCode URL** — standalone spawns its own, Appx mode uses `localhost:4096`
4. **Static frontend served by backend** — single TCP listener, Appx health check works
5. **Settings in SQLite** — credentials move to Appx's settings store when integrated

Integration command:
```bash
PORT=10001 OPENCODE_URL=http://localhost:4096 npm start
```

## Connected Services

| Service | API | Auth required |
|---|---|---|
| TUM Online | REST (`campus.tum.de/tumonline/`) | Yes — TUM token |
| Moodle | REST (`moodle.tum.de`) | Yes — Moodle token |
| Eat-API | Static JSON (`tum-dev.github.io/eat-api/`) | No |
| MVV Departures | REST (`efa.mvv-muenchen.de/ng/`) | No |
| Iris (Study Rooms) | REST (`iris.asta.tum.de`) | No |
| NavigaTum | REST (`nav.tum.de`) | No |
| Campus Backend | gRPC (`api.tum.app:443`) | No |
