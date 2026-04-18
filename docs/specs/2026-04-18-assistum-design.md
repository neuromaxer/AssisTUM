# AssisTUM — Design Spec

**Date:** 2026-04-18  
**Status:** Approved  
**Hackathon:** TUM.ai x Reply Makeathon 2026

## Overview

AssisTUM is an autonomous campus co-pilot for TUM students. It proactively plans a student's week by pulling data from TUM systems (lectures, Moodle deadlines, email inbox, canteen menus, transit departures, study rooms, student clubs) and presenting an actionable schedule through a 3-panel UI with calendar, tasks, and agent chat.

Built as a standalone app with Node.js backend + React/Vite frontend, powered by OpenCode as the agent engine. Designed for easy future integration into the Appx platform as a first-party agentic app.

## Challenge Fit

The TUM.ai x Reply Makeathon challenge asks for:

- **Campus Co-Pilot Suite** — autonomous agent navigating university logistics
- **Action over Conversation** — agents that execute tasks, not just chat
- **Connecting the Disconnected** — unify fragmented student data sources

AssisTUM addresses all three: it connects 8+ disconnected TUM data sources (including email, Moodle, and lecture systems) through an AI agent that autonomously builds schedules, manages tasks, and takes action on the student's behalf.

## Demo Flow

**Schedule mandatory stuff:**

1. Open AssisTUM → 3-panel UI (tasks, calendar, chat)
2. Type "Plan my next week"
3. Agent fetches lectures, Moodle deadlines + prep materials, email inbox TODOs, canteen menus, club events
4. Calendar and task list populate in real time
5. User manually adds ad-hoc personal events the agent doesn't know about
6. Agent detects overlapping events and surfaces conflicts for resolution

**Additional planning:**

7. User asks agent to help plan study sessions based on assignment deadlines
8. Agent asks about workload, suggests a plan, adds study blocks to calendar
9. User asks a brainstorm question ("how much time do I need to prep for Discrete Structures?")
10. Agent reasons about the course content (via Moodle materials), discusses with user, then creates calendar events for the agreed prep sessions

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

## Agent Pipeline (On-Demand)

Data fetching and processing happens **on demand only** — no background sync, no scheduled refresh, no staleness detection. The demo starts from a clean slate: Nico has nothing, asks "plan my week," and watches everything populate in real time.

**Core flow (triggered by `plan-week` skill):**

```
1. Orchestrator agent receives "plan my week"
2. Spawns subagents in parallel:
   ├── Lectures subagent    → fetches TUM Online lectures + iCal calendar → creates events
   ├── Moodle subagent      → fetches courses, assignments, content → creates courses + todos
   ├── Email subagent       → fetches inbox → summarizes threads, links to courses, creates email_action todos
   ├── Canteen subagent     → fetches weekly menus → suggests lunch events
   └── Clubs subagent       → scrapes curated club URLs → creates club events
3. Each subagent writes to SQLite via tool calls → frontend updates in real time as items appear
4. Orchestrator collects results, detects conflicts, presents summary to user
```

**Key design choice:** Subagents use **tool calls** (not fenced code blocks) to create events and todos. Tool calls give the agent validation feedback — if parameters are wrong, the tool returns an error and the agent can retry. Each tool call persists immediately to SQLite and the frontend picks up changes via polling/SSE.

**Frontend streaming:** As subagents work, events and todos appear on the calendar and task list progressively. The user sees the plan being built in real time — this is the core demo moment.

## MCP Tools

Three categories: **fetch tools** pull data from external APIs, **action tools** write to SQLite (with validation feedback), **live tools** call APIs for real-time data.

### Fetch tools (external API → return data to agent)

| Tool | API | Returns |
|---|---|---|
| `tum_lectures` | TUM Online `veranstaltungenEigene` | User's enrolled lectures with times |
| `tum_calendar` | iCal feed (`campus.tum.de/tumonlinej/ws/termin/ical`) | Parsed calendar events from `.ics` |
| `tum_grades` | TUM Online `noten` | Grades list |
| `tum_email_read` | IMAP (`mail.tum.de:993`) | Recent emails: subject, sender, date, body |
| `moodle_courses` | Moodle `core_enrol_get_users_courses` | Enrolled courses |
| `moodle_assignments` | Moodle `mod_assign_get_assignments` | Assignment deadlines + status |
| `moodle_course_content` | Moodle `core_course_get_contents` | Course materials, readings, slides |
| `canteen_menu` | Eat-API `{location}/{year}/{week}.json` | Weekly meal plan |
| `club_events` | Scrape curated club URLs | Upcoming events from user's club list |

### Action tools (write to SQLite, return confirmation or error)

| Tool | Params | Effect |
|---|---|---|
| `create_event` | `title`, `description` (opt), `start`, `end`, `type`, `color` (opt), `course_id` (opt) | Insert event → returns event with ID |
| `update_event` | `event_id`, fields to update | Update event → returns updated event |
| `delete_event` | `event_id` | Delete event → returns confirmation |
| `create_todo` | `title`, `description` (opt), `type`, `deadline` (opt), `priority`, `course_id` (opt) | Insert todo → returns todo with ID |
| `update_todo` | `todo_id`, fields to update | Update todo → returns updated todo |
| `delete_todo` | `todo_id` | Delete todo → returns confirmation |
| `create_course` | `name`, `description` (opt), `moodle_course_id` (opt), `tum_course_id` (opt), `exam_date` (opt) | Insert course → returns course with ID |
| `query_events` | `start` (opt), `end` (opt), `course_id` (opt), `type` (opt) | Query events with filters |
| `query_todos` | `course_id` (opt), `type` (opt), `completed` (opt) | Query todos with filters |
| `query_courses` | — | All courses with linked event/todo counts |

Action tools validate parameters and return errors for invalid input (e.g. missing required fields, invalid date format, non-existent course_id). This gives agents feedback to self-correct.

### Live tools (direct API calls, real-time data)

| Tool | API | Returns |
|---|---|---|
| `tum_email_send` | SMTP (`mail.tum.de:587`) | Send email or reply |
| `mvv_departures` | MVV API `XML_DM_REQUEST` | Next departures for a stop |
| `canteen_occupancy` | Campus Backend gRPC `GetCanteenHeadCount` | Live headcount % |
| `study_rooms` | Iris API | Room availability |
| `navigatum_search` | NavigaTum `api/search` | Building/room locations |

MCP tools never expose credentials to the agent. Tools read tokens from the SQLite settings table at call time.

## Skills (Orchestration Workflows)

Skills are markdown files that instruct the agent on multi-step workflows. They define what tools to call, in what order, and how to structure output.

| Skill | What it instructs the agent to do |
|---|---|
| `plan-week` | Spawn subagents in parallel to fetch all sources → each subagent uses fetch tools + action tools to populate calendar and todos → orchestrator collects results, calls `query_events` to detect conflicts → presents summary. This is the core demo skill. |
| `find-study-room` | Take building/lecture context → `navigatum_search` → `study_rooms` → suggest rooms sorted by proximity. |
| `schedule-study-sessions` | Ask user about workload → `moodle_course_content` for prep material → `query_events` for calendar gaps → distribute study blocks before deadlines → `create_event` for each. |
| `commute-helper` | `navigatum_search` to resolve location → find nearest MVV stop → `mvv_departures` → suggest when to leave. |
| `conflict-resolver` | `query_events` → identify overlapping events → present conflicts to user → `delete_event` or `update_event` based on user choice. |
| `course-brainstorm` | `query_courses` + `moodle_course_content` + `query_todos` for a course → discuss prep strategy with user in natural language → once agreed, `create_event` for study sessions. |

## Agent Output Protocol

The agent uses **MCP tool calls** (not fenced code blocks) to create and modify events and todos. This gives the agent structured validation feedback — if parameters are wrong or a referenced course doesn't exist, the tool returns an error and the agent can self-correct.

**Example agent interaction:**

```
Agent thinks: "User wants to plan their week. I'll fetch lectures first."
→ calls tum_lectures() → gets 4 lectures
→ calls create_event({ title: "Linear Algebra", start: "2026-04-20T09:00", end: "2026-04-20T11:00", type: "lecture", color: "blue" })
→ tool returns { id: "evt_1", title: "Linear Algebra", ... } ✓
→ calls create_event({ title: "Lunch — Mensa Garching", start: "2026-04-20T12:00", end: "2026-04-20T13:00", type: "meal", color: "orange" })
→ tool returns { id: "evt_2", ... } ✓
→ calls create_todo({ title: "Submit ML homework", type: "assignment", deadline: "2026-04-21T23:59", priority: "high", course_id: "crs_1" })
→ tool returns { id: "todo_1", ... } ✓

Agent responds: "I've added 4 lectures, 2 lunch slots, and 3 todos to your week. Want me to find study room slots before the ML deadline?"
```

Each tool call persists immediately to SQLite. The frontend picks up new items via SSE and renders them progressively — the user sees the calendar filling up as the agent works.

**Conflict detection flow:**

When the user adds an event manually, the frontend notifies the backend. On the next agent turn (or proactively via `plan-week`), the agent calls `query_events` to get all events, detects overlaps, and presents them conversationally:

> "Heads up — your TUM.ai meetup (Thu 14:00–16:00) overlaps with Discrete Structures lecture (Thu 14:15–15:45). Want me to remove one or reschedule?"

The user responds, and the agent calls `delete_event` or `update_event`.

**Brainstorm-to-action flow:**

The agent can discuss a topic in natural language (e.g. "how much time do I need to prep for Discrete Structures?"), then convert the conclusion into actions:

1. **Brainstorm phase:** Agent calls `moodle_course_content` and `query_todos` for the course, discusses prep strategy, estimates time needed. No action tool calls — pure conversation.
2. **Action phase:** Once the user agrees to a plan, agent calls `create_event` for each study session.

## Frontend Layout

```
┌─────────────────────────────────────────────────────────┐
│  AssisTUM                                   [settings]  │
├──────────────┬──────────────────────┬───────────────────┤
│  TODOS       │  CALENDAR            │  AGENT CHAT       │
│              │                      │                   │
│  ── Mon 21 ──│  FullCalendar        │  Streaming msgs   │
│  ☐ Submit ML │  timeGridWeek view   │  via SSE          │
│    hw        │                      │                   │
│  ── Wed 23 ──│  Color-coded:        │  Real-time        │
│  ☐ Read Ch.5 │  - Lectures (blue)   │  updates as      │
│  ☐ Revise    │  - Study (green)     │  subagents create │
│    proofs    │  - Meals (orange)    │  events & todos   │
│  ── Thu 24 ──│  - Clubs (purple)    │                   │
│  ☐ TUM.ai   │                      │  Click todo/event │
│    meetup    │                      │  to see details   │
├──────────────┴──────────────────────┴───────────────────┤
│  ● Connected to TUM Online, TUM Email, Moodle, Eat-API   │
└─────────────────────────────────────────────────────────┘
```

**Components reused from quaestor-lite:**
- `timeblock-calendar.tsx` → adapted as `WeekCalendar` (strip Next.js imports)
- `calendar-picker-popover.tsx` → date picker
- Radix UI primitives (dialog, checkbox, dropdown, label)

**Key interactions:**
- Subagent `create_event` tool calls → events appear on calendar progressively as subagents work
- Subagent `create_todo` tool calls → todos appear in left panel, bucketed by deadline date, sorted chronologically
- Agent `delete_event`/`update_event`/`delete_todo`/`update_todo` calls → UI updates in real time
- Click event or todo → detail view with editable description
- User edits/drags calendar events → backend updates SQLite → agent sees changes via `query_events`
- User manually adds events → agent detects conflicts on next turn
- Agent brainstorms in natural language → calls `create_event` for agreed study sessions
- Status bar shows connected services with green/red indicators

## Backend Structure

```
assistum/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express server, starts OpenCode
│   │   ├── config.ts             # Port, credentials, OpenCode URL
│   │   ├── db/
│   │   │   ├── schema.ts         # SQLite tables + migrations
│   │   │   └── client.ts         # better-sqlite3 instance
│   │   ├── api/
│   │   │   ├── events.ts         # CRUD routes for calendar events
│   │   │   ├── todos.ts          # CRUD routes for todos
│   │   │   ├── courses.ts        # CRUD routes for courses
│   │   │   ├── settings.ts       # Credential management routes
│   │   │   ├── clubs.ts          # CRUD routes for club URL list
│   │   │   └── agent.ts          # Proxy to OpenCode sessions + SSE streaming
│   │   ├── mcp/
│   │   │   ├── server.ts         # MCP tool server (stdio transport)
│   │   │   ├── tools/
│   │   │   │   ├── fetch.ts      # Fetch tools: tum_lectures, tum_calendar, tum_email_read, moodle_*, canteen_menu, club_events
│   │   │   │   ├── actions.ts    # Action tools: create/update/delete/query for events, todos, courses
│   │   │   │   └── live.ts       # Live tools: tum_email_send, mvv_departures, canteen_occupancy, study_rooms, navigatum_search
│   │   │   └── index.ts          # Register all tools
│   │   ├── agent/
│   │   │   └── opencode.ts       # OpenCode SDK wrapper
│   │   └── skills/
│   │       ├── plan-week.md
│   │       ├── find-study-room.md
│   │       ├── schedule-study-sessions.md
│   │       ├── commute-helper.md
│   │       ├── conflict-resolver.md
│   │       └── course-brainstorm.md
│   ├── package.json
│   └── tsconfig.json
├── frontend/                     # Vite + React
├── opencode.json                 # OpenCode config
├── .env                          # Credentials (gitignored)
└── package.json                  # Workspace scripts
```

## SQLite Schema

Three core domain objects — **Course**, **Event**, **Todo** — plus supporting tables for content, emails, clubs, sessions, and settings.

```sql
-- Courses: the grouping entity for academic life
courses (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  description       TEXT,            -- editable by user and agent
  moodle_course_id  TEXT,            -- links to Moodle for content fetching
  tum_course_id     TEXT,            -- links to TUM Online (LV-Nummer)
  exam_date         TEXT,            -- ISO 8601
  source            TEXT NOT NULL,   -- "agent" or "user"
  created_at        TEXT NOT NULL
)

-- Calendar events (lectures, study blocks, clubs, meals, etc.)
events (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,                 -- editable by user and agent
  start       TEXT NOT NULL,        -- ISO 8601
  end         TEXT NOT NULL,        -- ISO 8601
  type        TEXT NOT NULL,        -- lecture, study, club, recreation, meal, custom
  color       TEXT,
  course_id   TEXT,                 -- nullable FK → courses
  source      TEXT NOT NULL,        -- "agent" or "user"
  session_id  TEXT,                 -- OpenCode session that created it
  created_at  TEXT NOT NULL
)

-- Todos: action items with optional deadline and course link
todos (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,                 -- editable by user and agent
  type        TEXT NOT NULL,        -- assignment, email_action, personal, revision
  deadline    TEXT,                 -- nullable ISO 8601
  priority    TEXT,                 -- high, medium, low
  completed   INTEGER DEFAULT 0,
  course_id   TEXT,                 -- nullable FK → courses
  source      TEXT NOT NULL,        -- "agent" or "user"
  session_id  TEXT,
  created_at  TEXT NOT NULL
)

-- Course content fetched from Moodle (slides, readings, etc.)
course_content (
  id            TEXT PRIMARY KEY,
  course_id     TEXT NOT NULL,      -- FK → courses
  title         TEXT NOT NULL,
  content_type  TEXT NOT NULL,      -- slides, pdf, reading, video
  url           TEXT,
  summary       TEXT,               -- agent-generated summary
  created_at    TEXT NOT NULL
)

-- Emails fetched from TUM IMAP
emails (
  id            TEXT PRIMARY KEY,
  message_id    TEXT UNIQUE,        -- IMAP message ID for dedup
  subject       TEXT NOT NULL,
  sender        TEXT NOT NULL,
  recipients    TEXT,
  body_snippet  TEXT,               -- first ~500 chars
  date          TEXT NOT NULL,
  course_id     TEXT,               -- nullable FK → courses (agent-linked)
  summary       TEXT,               -- agent-generated summary
  created_at    TEXT NOT NULL
)

-- Curated list of student club URLs for event scraping
clubs (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  url         TEXT NOT NULL,        -- club events page URL
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

**Key relationships:**
- `course_id` on events, todos, course_content, and emails is nullable — personal events, non-course tasks, and unlinked emails don't belong to a course
- The agent links emails to courses during the `plan-week` agent pass (matching by professor name, course name in subject, etc.)
- `source` tracks origin: `"agent"` for agent-created items, `"user"` for manually added items
- Todos are displayed **bucketed by deadline date**, sorted chronologically within each bucket

## Credentials & Settings UI

**Settings page (gear icon in top bar).** Each service has its own auth method and a green/red connection indicator.

### TUM Online API (lectures, grades, person search)

**Auth method:** Token request flow

1. User enters TUM ID (format: `ab12xyz`)
2. Backend calls `wbservicesbasic.requestToken?pUsername=...&pTokenName=AssisTUM`
3. TUM Online sends confirmation email to user
4. Frontend polls `wbservicesbasic.isTokenConfirmed?pToken=...` until confirmed
5. Store `pToken` in `settings` table as `tum_online_token`
6. Verify by calling `wbservicesbasic.id?pToken=...`

Used by: `tum_lectures`, `tum_grades`, and any other `wbservicesbasic.*` endpoints.

### TUM Calendar (lecture times, exam dates)

**Auth method:** Paste iCal subscription URL

1. User pastes their TUM calendar URL (found in TUM Online → Calendar → Export)
   Format: `https://campus.tum.de/tumonlinej/ws/termin/ical?pStud=...&pToken=...`
2. Backend extracts and stores `pStud` and the iCal `pToken` (note: this is a different token from the API `pToken` above)
3. Backend verifies by fetching the URL and checking for valid `.ics` data
4. Store full URL in `settings` table as `tum_ical_url`

Used by: `tum_calendar` syncer — fetches and parses `.ics` into events.

**Important:** The iCal token is NOT the same as the TUM Online API token. They are separate auth mechanisms on separate URL paths (`/tumonlinej/ws/` vs `/tumonline/wbservicesbasic.*`).

### Moodle (courses, assignments, content)

**Auth method:** Username + password → token exchange

1. User enters TUM username + password
2. Backend calls `POST https://www.moodle.tum.de/login/token.php` with `username`, `password`, `service=moodle_mobile_app`
3. Returns `{ "token": "..." }` on success
4. Store Moodle token in `settings` table as `moodle_token`
5. All subsequent Moodle calls use: `https://www.moodle.tum.de/webservice/rest/server.php?wstoken=...&wsfunction=...&moodlewsrestformat=json`

Available functions via `moodle_mobile_app` service:
- `core_enrol_get_users_courses` — enrolled courses
- `mod_assign_get_assignments` — assignment deadlines
- `core_course_get_contents` — course materials/slides
- `core_calendar_get_calendar_events` — Moodle calendar

Used by: `moodle_courses`, `moodle_assignments`, `moodle_course_content` syncers.

### TUM Email (inbox, sending)

**Auth method:** TUM ID + TUM password → IMAP/SMTP login

1. User enters TUM ID + TUM password
2. Backend verifies by attempting IMAP login to `mail.tum.de:993` (TLS)
3. Store credentials in `settings` table as `tum_email_user` + `tum_email_password`
4. SMTP sending uses `mail.tum.de:587` (STARTTLS) with same credentials

Used by: `tum_email_read` syncer, `tum_email_send` live tool.

### Settings summary

| Service | Auth input | Stored in `settings` | Verification |
|---|---|---|---|
| TUM Online API | TUM ID | `tum_online_token` | `wbservicesbasic.id` call |
| TUM Calendar | Paste iCal URL | `tum_ical_url` | Fetch URL, check valid `.ics` |
| Moodle | Username + password | `moodle_token` | Token returned from `login/token.php` |
| TUM Email | TUM ID + password | `tum_email_user`, `tum_email_password` | IMAP login to `mail.tum.de:993` |

MCP tools read credentials from the `settings` table at call time. The agent never sees raw tokens or passwords.

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
| `node-ical` | Parse TUM iCal calendar feed |
| `imapflow` | IMAP client for TUM email reading |
| `nodemailer` | SMTP client for sending TUM email |
| `@grpc/grpc-js` + `@grpc/proto-loader` | Campus Backend gRPC (canteen occupancy) |

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
  "instructions": "You are AssisTUM, a campus co-pilot for TUM students. When the user asks you to plan, schedule, or find information, use fetch tools to get real data and action tools (create_event, create_todo, etc.) to populate the calendar and task list. Each tool call persists immediately and shows in the UI. Be proactive: suggest lunch breaks between lectures, study sessions before deadlines, and efficient commute times. For planning tasks, spawn subagents to work in parallel."
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
| TUM Calendar | iCal feed (`campus.tum.de/tumonlinej/ws/termin/ical`) | Yes — pStud + pToken in URL |
| TUM Email | IMAP (`mail.tum.de:993`) + SMTP (`mail.tum.de:587`) | Yes — TUM ID + password |
| Moodle | REST (`moodle.tum.de`) | Yes — Moodle token |
| Eat-API | Static JSON (`tum-dev.github.io/eat-api/`) | No |
| MVV Departures | REST (`efa.mvv-muenchen.de/ng/`) | No |
| Iris (Study Rooms) | REST (`iris.asta.tum.de`) | No |
| NavigaTum | REST (`nav.tum.de`) | No |
| Campus Backend | gRPC (`api.tum.app:443`) — canteen occupancy only | No |
| Student Clubs | Scrape curated URLs (user-managed list) | No |
