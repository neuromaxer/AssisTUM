---
theme: seriph
title: AssisTUM — Your Autonomous Campus Co-Pilot
author: Team AssisTUM
colorSchema: dark
aspectRatio: 16/9
canvasWidth: 980
exportFilename: assistum-pitch-deck
fonts:
  sans: Inter
  mono: Fira Code
themeConfig:
  primary: '#60a5fa'
transition: slide-left
---

# AssisTUM

Your Autonomous Campus Co-Pilot

<div class="pt-12">
  <span class="text-sm opacity-50">REPLY Makeathon 2026 — Team AssisTUM</span>
</div>

---
layout: center
---

# Students are **human APIs**

<div class="text-center mt-8">

```mermaid {scale: 0.7}
graph LR
    S((Student)) --- T[TUM Online]
    S --- M[Moodle]
    S --- E[TUM Email]
    S --- Me[Mensa]
    S --- N[NavigaTUM]
    S --- C[Club Sites]
    S --- Z[ZHS]
    style S fill:#ef4444,stroke:#dc2626,color:#fff
    style T fill:#1e293b,stroke:#334155,color:#f1f5f9
    style M fill:#1e293b,stroke:#334155,color:#f1f5f9
    style E fill:#1e293b,stroke:#334155,color:#f1f5f9
    style Me fill:#1e293b,stroke:#334155,color:#f1f5f9
    style N fill:#1e293b,stroke:#334155,color:#f1f5f9
    style C fill:#1e293b,stroke:#334155,color:#f1f5f9
    style Z fill:#1e293b,stroke:#334155,color:#f1f5f9
```

</div>

<div class="stat">30+ minutes every week</div>

Systems don't talk to each other. Students are the glue.

---
layout: image
image: /screenshot-empty.png
backgroundSize: contain
---

# What if it took **one message**?

---
layout: image
image: /screenshot-populated.png
backgroundSize: contain
---

# **30 seconds later**

---

# One message. **Seven autonomous phases.**

```mermaid {scale: 0.55}
graph TD
    Q["'Let's plan my next week'"] --> P1
    P1["1. Fetch lectures<br/><small>TUM Online + iCal</small>"] --> P2
    P2["2. Resolve rooms & add commute<br/><small>NavigaTUM</small>"] --> P3
    P3["3. Scan Moodle — fetch PDFs, summarize<br/><small>Moodle SAML</small>"] --> P4
    P4["4. Triage email into tasks<br/><small>IMAP</small>"] --> P5
    P5["5. Schedule meals by campus<br/><small>eat-api</small>"] --> P6
    P6["6. Scrape club events<br/><small>Web Scraper</small>"] --> P7
    P7["7. Summary + tomorrow's briefing"]
    style Q fill:#3b82f6,stroke:#2563eb,color:#fff
    style P1 fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style P2 fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style P3 fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style P4 fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style P5 fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style P6 fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style P7 fill:#22c55e,stroke:#16a34a,color:#fff
```

Each phase hits a **real external system**. No mocks. No pre-seeded data.

---

# It doesn't just fetch data — it **makes decisions**

<div class="three-cols">
<div class="col">

#### Commute

Looked up every room in NavigaTUM, determined which campus each lecture is on, added travel time.

**No one told it to.**

</div>
<div class="col">

#### Mensa

Picked the closest canteen to your actual location that day. Chose a meal based on your preferences.

**Context-aware scheduling.**

</div>
<div class="col">

#### Moodle

Downloaded PDFs from course pages, extracted text, summarized them, linked summaries in your tasks.

**Reads and understands content.**

</div>
</div>

---

# MCP-Powered Agent Architecture

```mermaid {scale: 0.55}
graph LR
    U["User"] <--> FE["React Frontend<br/><small>Real-time SSE</small>"]
    FE <--> BE["Express Backend"]
    BE <--> AG["OpenCode Agent"]
    BE <--> DB[("SQLite")]
    AG <--> T1["TUM Online<br/><small>Token / XML</small>"]
    AG <--> T2["Moodle<br/><small>SAML SSO</small>"]
    AG <--> T3["Email<br/><small>IMAP / SMTP</small>"]
    AG <--> T4["eat-api<br/><small>Public</small>"]
    AG <--> T5["NavigaTUM<br/><small>Public</small>"]
    AG <--> T6["MVV<br/><small>Public</small>"]
    AG <--> T7["ASTA Rooms<br/><small>Public</small>"]
    AG <--> T8["Web Scraper<br/><small>Cheerio</small>"]
    style U fill:#3b82f6,stroke:#2563eb,color:#fff
    style FE fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style BE fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style AG fill:#7c3aed,stroke:#6d28d9,color:#fff
    style DB fill:#1e293b,stroke:#334155,color:#f1f5f9
    style T1 fill:#0f172a,stroke:#334155,color:#94a3b8
    style T2 fill:#0f172a,stroke:#334155,color:#94a3b8
    style T3 fill:#0f172a,stroke:#334155,color:#94a3b8
    style T4 fill:#0f172a,stroke:#334155,color:#94a3b8
    style T5 fill:#0f172a,stroke:#334155,color:#94a3b8
    style T6 fill:#0f172a,stroke:#334155,color:#94a3b8
    style T7 fill:#0f172a,stroke:#334155,color:#94a3b8
    style T8 fill:#0f172a,stroke:#334155,color:#94a3b8
```

<div class="flex justify-center gap-8 mt-4">
  <div class="text-center"><span class="text-3xl font-bold text-blue-400">15+</span><br/><span class="text-sm opacity-70">MCP Tools</span></div>
  <div class="text-center"><span class="text-3xl font-bold text-blue-400">7</span><br/><span class="text-sm opacity-70">Agent Skills</span></div>
  <div class="text-center"><span class="text-3xl font-bold text-blue-400">8</span><br/><span class="text-sm opacity-70">External Systems</span></div>
</div>

---

# 8 University Systems. **Real APIs. Real Auth.**

| System | Auth | Autonomous Actions |
|--------|------|--------------------|
| **Moodle** | SAML SSO | Fetches assignments, **downloads PDFs, extracts text, summarizes** |
| **TUM Online** | Token | Pulls lectures, syncs courses, fetches grades |
| **NavigaTUM** | Public | Resolves room codes → campus, **auto-generates commute blocks** |
| **Email** | IMAP/SMTP | Reads inbox, **triages into actionable tasks with deadlines** |
| **Mensa** | Public | Fetches menus, **picks closest canteen by schedule context** |
| **MVV** | Public | Live departures, **calculates when to leave** |
| **Clubs** | Web scrape | Extracts events from **arbitrary club websites** |
| **Study Rooms** | ASTA API | **Real-time availability** across campuses |

---
layout: image
image: /screenshot-ui-annotated.png
backgroundSize: contain
---

# One interface. **Zero learning curve.**

No forms. No dropdowns. Just conversation.

---
layout: center
---

# 30 minutes → **30 seconds**

<div class="before-after mt-8">
<div class="before">

#### Before

- 6 browser tabs open
- Manual copy-paste between systems
- Missed deadlines
- Forgotten lunches
- No travel time planning

</div>
<div class="after">

#### After

- One conversation
- Full week planned
- Every deadline tracked
- Campus-aware meals
- Commute blocks included

</div>
</div>

<div class="text-center mt-8 text-lg">

Works with **any TUM student's real credentials**, today. Not a prototype — a **working product**.

</div>

---

# Not a chatbot. A **campus operating system.**

<div class="capability-grid">
<div class="capability-group">

#### Data Intelligence

- Fetches and reads PDFs, exercise sheets, and lecture slides from Moodle
- Extracts text from PDFs, summarizes content, links in tasks
- Scrapes any student club website for events
- Reads and triages university email

</div>
<div class="capability-group">

#### Autonomous Actions

- Resolves lecture rooms → determines campus → adds commute time
- Picks closest mensa by your schedule, selects meals
- Schedules study sessions around your deadlines
- Detects and resolves calendar conflicts

</div>
<div class="capability-group">

#### Real-Time Information

- Live MVV departures — when to leave and which train
- Study room availability across campuses
- Mensa occupancy — how crowded right now?
- Canteen menus for the full week

</div>
<div class="capability-group">

#### Agent Skills

- `/plan-week` — Build full week from 5+ systems
- `/review-lectures` — Review sessions with Moodle materials
- `/schedule-study-sessions` — Auto-schedule before deadlines
- `/commute-helper` `/find-study-room` `/conflict-resolver` `/course-brainstorm`

</div>
</div>

---
layout: center
class: text-center
---

# AssisTUM

**Being a student should be about learning — not logistics.**

<div class="mt-12 text-sm opacity-50">
Built in 48 hours. Ready to deploy.
</div>

<div class="mt-4 text-sm opacity-50">
Team AssisTUM — REPLY Makeathon 2026
</div>

---
layout: section
---

# Appendix

Deep-dive into each integration

---

# <span class="appendix-badge">A1</span> TUM Online Integration

```mermaid {scale: 0.6}
sequenceDiagram
    participant Agent
    participant Backend
    participant TUM as TUM Online API
    Agent->>Backend: tum_lectures()
    Backend->>TUM: GET /cdm (token auth)
    TUM-->>Backend: XML response
    Backend->>Backend: Parse XML (xml2js)
    Backend-->>Agent: Structured lecture data
    Agent->>Agent: Create calendar events
```

**Auth:** Token-based (email confirmation flow from TUM Online)

**Capabilities:**
- Fetch full lecture schedule (XML parsed)
- Sync courses to local database
- Fetch grades

**Data flow:** Token → XML API → xml2js parser → structured JSON → calendar events

---

# <span class="appendix-badge">A2</span> Moodle Integration

```mermaid {scale: 0.55}
sequenceDiagram
    participant Agent
    participant Backend
    participant Shib as Shibboleth IdP
    participant Moodle
    Agent->>Backend: moodle_assignments()
    Backend->>Moodle: GET /login
    Moodle-->>Backend: Redirect to Shibboleth
    Backend->>Shib: POST credentials
    Shib-->>Backend: SAML assertion
    Backend->>Moodle: POST SAML response
    Moodle-->>Backend: Session cookie
    Backend->>Moodle: AJAX: core_enrol_get_users_courses
    Moodle-->>Backend: Course list + assignments
    Backend->>Moodle: Fetch resource pages
    Backend->>Backend: Detect PDFs → download → extract text (unpdf)
    Backend-->>Agent: Assignments + summarized resources
```

**Auth:** SAML Shibboleth SSO — auto-redirect chain, session caching, auto-refresh on expiry

**PDF Pipeline:** Moodle page → detect PDF → download → unpdf text extraction → summarize → store as task resource

The most technically complex integration. SAML auth alone is non-trivial.

---

# <span class="appendix-badge">A3</span> Email Integration

```mermaid {scale: 0.6}
sequenceDiagram
    participant Agent
    participant Backend
    participant IMAP as TUM IMAP Server
    Agent->>Backend: tum_email_read()
    Backend->>IMAP: Connect (credentials)
    IMAP-->>Backend: Last 7 days of messages
    Backend->>Backend: Parse sender, subject, date, body (500 chars)
    Backend-->>Agent: Email list
    Agent->>Agent: Identify actionable items
    Agent->>Backend: create_todo(type: email_action)
```

**Auth:** IMAP credentials (TUM email server) + SMTP for sending

**Capabilities:**
- Read inbox (configurable: last N days, message limit)
- Extract sender, subject, date, body snippet
- Send emails with reply tracking via SMTP

**Agent behavior:** Scans for actionable items, creates `email_action` todos with 48h default deadline unless email specifies one

---

# <span class="appendix-badge">A4</span> Mensa & Canteen

```mermaid {scale: 0.6}
graph LR
    CAL["Today's Calendar"] --> CAMPUS["Determine Campus"]
    CAMPUS --> SEL["Select Closest Mensa"]
    SEL --> API["eat-api: Fetch Menu"]
    API --> MEAL["Pick Meal"]
    MEAL --> EVENT["Create Lunch Event"]
    style CAL fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style CAMPUS fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style SEL fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style API fill:#1e293b,stroke:#f97316,color:#f1f5f9
    style MEAL fill:#1e293b,stroke:#f97316,color:#f1f5f9
    style EVENT fill:#f97316,stroke:#ea580c,color:#fff
```

**API:** TUM eat-api (public, no auth)

**Capabilities:**
- Weekly menus by location (mensa-garching, mensa-arcisstr, etc.)
- Live occupancy head count

**Agent behavior:** Cross-references calendar → determines campus → picks closest canteen → schedules lunch → selects meal

---

# <span class="appendix-badge">A5</span> NavigaTUM & Commute

```mermaid {scale: 0.6}
graph LR
    ROOM["Room Code<br/><small>e.g. 5602.EG.001</small>"] --> NAV["NavigaTUM API"]
    NAV --> CAMPUS["Campus: Garching"]
    CAMPUS --> CHECK{"Campus switch?"}
    CHECK -->|Yes| COMMUTE["Insert 1h commute block"]
    CHECK -->|No| SKIP["No action needed"]
    subgraph Live Route Planning
        MVV["MVV EFA API"] --> DEPS["Real-time departures"]
        DEPS --> ROUTE["Which U-Bahn, when to leave"]
    end
    style ROOM fill:#1e293b,stroke:#64748b,color:#f1f5f9
    style NAV fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style CAMPUS fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style CHECK fill:#1e293b,stroke:#eab308,color:#f1f5f9
    style COMMUTE fill:#64748b,stroke:#475569,color:#fff
    style SKIP fill:#1e293b,stroke:#334155,color:#94a3b8
    style MVV fill:#1e293b,stroke:#22c55e,color:#f1f5f9
    style DEPS fill:#1e293b,stroke:#22c55e,color:#f1f5f9
    style ROUTE fill:#22c55e,stroke:#16a34a,color:#fff
```

**APIs:** NavigaTUM (room/building search) + MVV EFA (real-time departures)

**Commute logic:** For each lecture → resolve room code → determine campus → if campus switch, insert 1h commute block

**Route planning:** NavigaTUM room lookup + MVV live departures → tells student which U-Bahn to take and when to leave

---

# <span class="appendix-badge">A6</span> Student Clubs

```mermaid {scale: 0.6}
graph LR
    URLS["Configured Club URLs"] --> FETCH["Fetch HTML"]
    FETCH --> PARSE["Cheerio: Strip HTML"]
    PARSE --> EXTRACT["Extract Event Text"]
    EXTRACT --> CREATE["Create Calendar Events"]
    style URLS fill:#1e293b,stroke:#a855f7,color:#f1f5f9
    style FETCH fill:#1e293b,stroke:#a855f7,color:#f1f5f9
    style PARSE fill:#1e293b,stroke:#a855f7,color:#f1f5f9
    style EXTRACT fill:#1e293b,stroke:#a855f7,color:#f1f5f9
    style CREATE fill:#a855f7,stroke:#9333ea,color:#fff
```

**Method:** Configurable club URLs + Cheerio HTML scraping

**Capabilities:** Scrapes arbitrary club websites, strips HTML, extracts event text

**Resilience:** Handles errors gracefully — skips clubs that fail, continues with rest

Works with **any** student club website — no special API needed

---

# <span class="appendix-badge">A7</span> Study Rooms

**API:** ASTA study room API (public)

**Capabilities:**
- Real-time room availability across TUM campuses
- Filters by proximity to student's current/upcoming location
- Reports available rooms with building details

```mermaid {scale: 0.6}
graph LR
    LOC["Student Location"] --> ASTA["ASTA API"]
    ASTA --> FILTER["Filter by Proximity"]
    FILTER --> ROOMS["Available Rooms + Details"]
    style LOC fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style ASTA fill:#1e293b,stroke:#22c55e,color:#f1f5f9
    style FILTER fill:#1e293b,stroke:#22c55e,color:#f1f5f9
    style ROOMS fill:#22c55e,stroke:#16a34a,color:#fff
```

Accessed via `/find-study-room` slash command or natural language request

---

# <span class="appendix-badge">A8</span> The Agent Engine

```mermaid {scale: 0.5}
sequenceDiagram
    participant User
    participant Frontend as React Frontend
    participant Backend as Express Backend
    participant Agent as OpenCode Agent
    participant MCP as MCP Tools (15+)
    participant API as External APIs
    participant DB as SQLite

    User->>Frontend: /plan-week
    Frontend->>Backend: POST /api/skills/plan-week/invoke
    Backend->>Agent: Load skill markdown as system prompt
    loop For each phase
        Agent->>MCP: Call tool (e.g. tum_lectures)
        MCP->>API: Real API request
        API-->>MCP: Response
        MCP->>DB: Write events/todos
        MCP-->>Agent: Tool result
        Agent-->>Frontend: SSE stream update
        Frontend->>Frontend: UI updates in real-time
    end
    Agent-->>Frontend: Final summary
```

**Engine:** OpenCode SDK — agent spawned as local server

**Protocol:** Model Context Protocol (MCP) — 15+ tools exposed to agent

**Skills:** 7 markdown-defined workflows, loaded dynamically

**Error handling:** Per-tool graceful degradation — if one integration fails, agent skips and continues
