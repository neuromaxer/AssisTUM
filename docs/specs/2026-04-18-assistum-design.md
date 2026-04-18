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

## Data Sync Pipeline

Most data is fetched from external APIs and stored in SQLite. This sync runs:
- **On startup** — initial data load
- **Daily** — scheduled refresh
- **On demand** — when the agent needs it (e.g. `plan-week` skill triggers a full sync as its first step)

```
1. Fetch    → Pull raw data from all synced APIs into SQLite
2. Detect   → Compare with last sync, flag new/changed items
3. Agent    → Run agent pass over new/changed data:
              - Summarize email threads per course
              - Create todos from Moodle assignments
              - Generate revision tasks from course content
              - Link emails to courses by professor/subject
              - Detect calendar conflicts
4. Present  → Frontend shows fresh, pre-processed data
```

The `plan-week` skill is the core demo flow: user says "plan my week" → agent triggers sync → processes everything → presents a structured weekly plan with events and tasks.

**`sync_log` tracks each sync run** for staleness detection. Before fetching, the agent checks when each source was last synced and skips sources that are fresh enough.

## MCP Tools

Tools are split into two categories: **synced tools** read from SQLite (fast, pre-processed), **live tools** call APIs directly (real-time data that goes stale in seconds/minutes).

### Synced tools (read from SQLite)

| Tool | Upstream API | Returns |
|---|---|---|
| `tum_lectures` | TUM Online `veranstaltungenEigene` | User's lectures + times |
| `tum_calendar` | TUM Online `kalender` | Academic calendar events |
| `tum_grades` | TUM Online `noten` | Grades list |
| `tum_email_read` | IMAP (`mail.tum.de:993`) | Emails: subject, sender, date, body, agent summary |
| `moodle_assignments` | Moodle `mod_assign_get_assignments` | Deadlines + status |
| `moodle_courses` | Moodle `core_enrol_get_users_courses` | Enrolled courses |
| `moodle_course_content` | Moodle `core_course_get_contents` | Materials, readings, slides, agent summary |
| `canteen_menu` | Eat-API `{location}/{year}/{week}.json` | Weekly meal plan |
| `student_clubs` | Campus Backend gRPC `ListStudentClub` | Club events/info |

### Live tools (direct API calls)

| Tool | API | Returns |
|---|---|---|
| `tum_email_send` | SMTP (`mail.tum.de:587`) | Send email or reply |
| `mvv_departures` | MVV API `XML_DM_REQUEST` | Next departures for a stop |
| `canteen_occupancy` | Campus Backend gRPC `GetCanteenHeadCount` | Live headcount % |
| `study_rooms` | Iris API | Room availability |
| `navigatum_search` | NavigaTum `api/search` | Building/room locations |

### Internal tools (read/write local SQLite)

| Tool | Table | Returns |
|---|---|---|
| `events_query` | `events` | Current calendar events (for conflict detection, gap finding) |
| `todos_query` | `todos` | Current task list |
| `courses_query` | `courses` | Courses with linked events/todos/content |
| `sync_now` | triggers sync pipeline | Refreshes all synced sources |

MCP tools never expose credentials to the agent. Tools read tokens from the SQLite settings table at call time.

## Skills (Orchestration Workflows)

Skills are markdown files that instruct the agent on multi-step workflows. They define what tools to call, in what order, and how to structure output.

| Skill | What it instructs the agent to do |
|---|---|
| `plan-week` | Call `sync_now` to refresh all sources → query courses, events, todos → detect conflicts → synthesize into calendar events + tasks. This is the core demo skill — triggers the full pipeline. |
| `find-study-room` | Take building/lecture context → `navigatum_search` → `study_rooms` → suggest rooms sorted by proximity. |
| `schedule-study-sessions` | Ask user about workload → query `moodle_course_content` for prep material → query `events_query` for calendar gaps → distribute study blocks before deadlines → output calendar events. |
| `commute-helper` | `navigatum_search` to resolve location → find nearest MVV stop → `mvv_departures` → suggest when to leave. |
| `conflict-resolver` | Query `events_query` → identify overlapping events → present conflicts to user → remove or reschedule based on user choice → output updated actions. |
| `course-brainstorm` | Query course via `courses_query` (gets linked content, todos, emails) → discuss prep strategy with user in natural language → once agreed, output `calendar_event` actions for the study sessions. |

## Agent Output Protocol

The agent responds conversationally and wraps actionable output in fenced blocks:

````
I found 4 lectures and 2 Moodle deadlines. Here's your plan:

```assistum-actions
[
  { "type": "calendar_event", "title": "Linear Algebra", "start": "2026-04-20T09:00", "end": "2026-04-20T11:00", "color": "blue" },
  { "type": "calendar_event", "title": "Lunch — Mensa Garching", "start": "2026-04-20T12:00", "end": "2026-04-20T13:00", "color": "orange" },
  { "type": "todo", "title": "Submit ML homework", "todo_type": "assignment", "deadline": "2026-04-21T23:59", "priority": "high", "course_id": "..." },
  { "type": "todo", "title": "Read Chapter 5 for Databases", "todo_type": "revision", "deadline": "2026-04-23T09:00", "priority": "medium", "course_id": "..." }
]
```

Want me to also find study room slots before the ML deadline?
````

`parser.ts` extracts `assistum-actions` blocks, validates against a schema, and persists to SQLite. Frontend receives both the chat message and parsed actions via SSE.

**Action types:**

| Type | Fields | Effect |
|---|---|---|
| `calendar_event` | `title`, `start`, `end`, `color`, `type`, `course_id` (opt) | Creates/updates event on calendar |
| `todo` | `title`, `type`, `deadline` (opt), `priority`, `course_id` (opt) | Creates todo in left panel |
| `delete_event` | `event_id` | Removes event from calendar |
| `delete_todo` | `todo_id` | Removes todo from list |

**Conflict detection flow:**

When the user adds an event manually, the frontend notifies the backend. On the next agent turn (or proactively via the `plan-week` skill), the agent queries `events_query` to get all events, detects overlaps, and presents them conversationally:

> "Heads up — your TUM.ai meetup (Thu 14:00–16:00) overlaps with Discrete Structures lecture (Thu 14:15–15:45). Want me to remove one or reschedule?"

The user responds, and the agent outputs `delete_event` or updated `calendar_event` actions.

**Brainstorm-to-action flow:**

The agent can discuss a topic in natural language (e.g. "how much time do I need to prep for Discrete Structures?"), then convert the conclusion into actions. This is a two-phase interaction:

1. **Brainstorm phase:** Agent fetches course content via `moodle_course_content`, discusses prep strategy, estimates time needed. No actions emitted — pure conversation.
2. **Action phase:** Once the user agrees to a plan, agent outputs `calendar_event` actions for the study sessions in an `assistum-actions` block.

## Frontend Layout

```
┌─────────────────────────────────────────────────────────┐
│  AssisTUM                                   [settings]  │
├──────────────┬──────────────────────┬───────────────────┤
│  TODOS       │  CALENDAR            │  AGENT CHAT       │
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
│  ● Connected to TUM Online, TUM Email, Moodle, Eat-API   │
└─────────────────────────────────────────────────────────┘
```

**Components reused from quaestor-lite:**
- `timeblock-calendar.tsx` → adapted as `WeekCalendar` (strip Next.js imports)
- `calendar-picker-popover.tsx` → date picker
- Radix UI primitives (dialog, checkbox, dropdown, label)

**Key interactions:**
- Agent `calendar_event` actions → events appear on calendar in real time
- Agent `todo` actions → todos appear in left panel in real time
- Agent `delete_event`/`delete_todo` actions → items removed from UI in real time
- User edits/drags calendar events → backend updates SQLite → agent sees changes via `events_query`
- User manually adds events → agent detects conflicts on next turn
- Agent brainstorms in natural language → converts agreed plan into calendar events
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
│   │   ├── sync/
│   │   │   ├── pipeline.ts       # Orchestrates full sync: fetch → detect → agent pass
│   │   │   ├── fetchers/
│   │   │   │   ├── tum-online.ts # Fetch lectures, grades via API
│   │   │   │   ├── tum-ical.ts   # Fetch + parse iCal calendar feed
│   │   │   │   ├── tum-email.ts  # Fetch emails via IMAP
│   │   │   │   ├── moodle.ts     # Fetch courses, assignments, content
│   │   │   │   ├── eat-api.ts    # Fetch canteen menus
│   │   │   │   └── clubs.ts      # Fetch student clubs via gRPC
│   │   │   └── staleness.ts      # Check sync_log, skip fresh sources
│   │   ├── api/
│   │   │   ├── events.ts         # CRUD routes for calendar events
│   │   │   ├── todos.ts          # CRUD routes for todos
│   │   │   ├── courses.ts        # CRUD routes for courses
│   │   │   ├── settings.ts       # Credential management routes
│   │   │   └── agent.ts          # Proxy to OpenCode sessions + SSE streaming
│   │   ├── mcp/
│   │   │   ├── server.ts         # MCP tool server (stdio transport)
│   │   │   ├── tools/
│   │   │   │   ├── synced.ts     # Synced tools: query SQLite for events, todos, courses, emails, content, menus, clubs
│   │   │   │   ├── live.ts       # Live tools: mvv_departures, canteen_occupancy, study_rooms, navigatum_search
│   │   │   │   ├── email-send.ts # tum_email_send via SMTP
│   │   │   │   └── sync.ts       # sync_now tool: triggers sync pipeline
│   │   │   └── index.ts          # Register all tools
│   │   ├── agent/
│   │   │   ├── opencode.ts       # OpenCode SDK wrapper
│   │   │   ├── parser.ts         # Parse assistum-actions blocks
│   │   │   └── actions.ts        # Persist parsed actions to SQLite
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

Three core domain objects — **Course**, **Event**, **Todo** — plus supporting tables for synced content, emails, sessions, settings, and sync tracking.

```sql
-- Courses: the grouping entity for academic life
courses (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  moodle_course_id  TEXT,            -- links to Moodle for content fetching
  tum_course_id     TEXT,            -- links to TUM Online (LV-Nummer)
  description       TEXT,
  exam_date         TEXT,            -- ISO 8601
  source            TEXT NOT NULL,   -- "agent", "user", "sync"
  created_at        TEXT NOT NULL
)

-- Calendar events (lectures, study blocks, clubs, meals, etc.)
events (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  start       TEXT NOT NULL,        -- ISO 8601
  end         TEXT NOT NULL,        -- ISO 8601
  type        TEXT NOT NULL,        -- lecture, study, club, recreation, meal, custom
  color       TEXT,
  course_id   TEXT,                 -- nullable FK → courses
  source      TEXT NOT NULL,        -- "agent", "user", "sync"
  session_id  TEXT,                 -- OpenCode session that created it
  created_at  TEXT NOT NULL
)

-- Todos: action items with optional deadline and course link
todos (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL,        -- assignment, email_action, personal, revision
  deadline    TEXT,                 -- nullable ISO 8601
  priority    TEXT,                 -- high, medium, low
  completed   INTEGER DEFAULT 0,
  course_id   TEXT,                 -- nullable FK → courses
  source      TEXT NOT NULL,        -- "agent", "user", "sync"
  session_id  TEXT,
  created_at  TEXT NOT NULL
)

-- Course content synced from Moodle (slides, readings, etc.)
course_content (
  id            TEXT PRIMARY KEY,
  course_id     TEXT NOT NULL,      -- FK → courses
  title         TEXT NOT NULL,
  content_type  TEXT NOT NULL,      -- slides, pdf, reading, video
  url           TEXT,
  summary       TEXT,               -- agent-generated summary
  synced_at     TEXT NOT NULL
)

-- Emails synced from TUM IMAP
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
  synced_at     TEXT NOT NULL
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

-- Sync tracking for staleness detection
sync_log (
  id            TEXT PRIMARY KEY,
  source        TEXT NOT NULL,      -- tum_online, moodle, email, eat_api, clubs
  status        TEXT NOT NULL,      -- success, error
  items_synced  INTEGER,
  error_message TEXT,
  started_at    TEXT NOT NULL,
  finished_at   TEXT
)
```

**Key relationships:**
- `course_id` on events, todos, course_content, and emails is nullable — personal events, non-course tasks, and unlinked emails don't belong to a course
- The agent links emails to courses during the sync agent pass (matching by professor name, course name in subject, etc.)
- `source` tracks origin: `"sync"` for data fetched from APIs, `"agent"` for agent-created items, `"user"` for manually added items

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
| TUM Email | IMAP (`mail.tum.de:993`) + SMTP (`mail.tum.de:587`) | Yes — TUM ID + password |
| Moodle | REST (`moodle.tum.de`) | Yes — Moodle token |
| Eat-API | Static JSON (`tum-dev.github.io/eat-api/`) | No |
| MVV Departures | REST (`efa.mvv-muenchen.de/ng/`) | No |
| Iris (Study Rooms) | REST (`iris.asta.tum.de`) | No |
| NavigaTum | REST (`nav.tum.de`) | No |
| Campus Backend | gRPC (`api.tum.app:443`) | No |
