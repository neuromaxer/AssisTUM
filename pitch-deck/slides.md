---
theme: seriph
title: AssisTUM — Your Autonomous Campus Co-Pilot
author: Team AssisTUM
colorSchema: light
aspectRatio: 16/9
canvasWidth: 980
exportFilename: assistum-pitch-deck
fonts:
  sans: DM Sans
  mono: Fira Code
themeConfig:
  primary: '#3070b3'
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

```mermaid {scale: 0.5}
graph LR
    S((Student)) --- T[TUM Online]
    S --- M[Moodle]
    S --- E[TUM Email]
    S --- Me[Mensa]
    S --- N[NavigaTUM]
    S --- C[Club Sites]
    S --- Z[ZHS]
    style S fill:#dc2626,stroke:#b91c1c,color:#ffffff
    style T fill:#f0efec,stroke:#e0ddd7,color:#1c1c1c
    style M fill:#f0efec,stroke:#e0ddd7,color:#1c1c1c
    style E fill:#f0efec,stroke:#e0ddd7,color:#1c1c1c
    style Me fill:#f0efec,stroke:#e0ddd7,color:#1c1c1c
    style N fill:#f0efec,stroke:#e0ddd7,color:#1c1c1c
    style C fill:#f0efec,stroke:#e0ddd7,color:#1c1c1c
    style Z fill:#f0efec,stroke:#e0ddd7,color:#1c1c1c
```

</div>

<div class="stat">30+ minutes every week</div>

Systems don't talk to each other. Students are the glue.

---

# What if it took **one message**?

<img src="/images/1_empty_screen.png" class="mx-auto mt-4 rounded-lg shadow-lg" style="max-height: 75%; object-fit: contain;" />

---

# **30 seconds later**

<div class="text-center mt-4 p-6 border-2 border-dashed border-[#e0ddd7] rounded-lg bg-[#f0efec]">

SCREENSHOT NEEDED: Run `/plan-week`, wait for cascade to finish. Capture the fully populated state — calendar with color-coded events, todos with deadline badges, agent summary in chat.

Save as `pitch-deck/images/3_populated_screen.png`

</div>

---

# One message. **Seven autonomous phases.**

```mermaid {scale: 0.45}
graph LR
    Q["'Let's plan my next week'"] --> P1
    P1["1. Fetch lectures<br/><small>TUM Online + iCal</small>"] --> P2
    P2["2. Resolve rooms & commute<br/><small>NavigaTUM</small>"] --> P3
    P3["3. Scan Moodle & PDFs<br/><small>Moodle SAML</small>"] --> P4
    P4["4. Triage email<br/><small>IMAP</small>"] --> P5
    P5["5. Schedule meals<br/><small>eat-api</small>"] --> P6
    P6["6. Scrape clubs<br/><small>Web Scraper</small>"] --> P7
    P7["7. Summary + briefing"]
    style Q fill:#3070b3,stroke:#25609e,color:#ffffff
    style P1 fill:#f0efec,stroke:#3070b3,color:#1c1c1c
    style P2 fill:#f0efec,stroke:#3070b3,color:#1c1c1c
    style P3 fill:#f0efec,stroke:#3070b3,color:#1c1c1c
    style P4 fill:#f0efec,stroke:#3070b3,color:#1c1c1c
    style P5 fill:#f0efec,stroke:#3070b3,color:#1c1c1c
    style P6 fill:#f0efec,stroke:#3070b3,color:#1c1c1c
    style P7 fill:#16a34a,stroke:#15803d,color:#ffffff
```

Each phase hits a **real external system**. No mocks. No pre-seeded data.

---

# It doesn't just fetch data — it **makes decisions**

<div class="four-cols">
<div class="col">

#### Commute

Looked up every room in NavigaTUM, determined campus, added travel time.

**No one told it to.**

</div>
<div class="col">

#### Mensa

Picked the closest canteen to your location that day. Chose a meal.

**Context-aware scheduling.**

</div>
<div class="col">

#### Moodle

Downloaded PDFs, extracted text, summarized them, linked in your tasks.

**Reads and understands content.**

</div>
<div class="col">

#### Memory (Cognee)

Remembers your preferences, past choices, and context across sessions.

**Learns and adapts over time.**

</div>
</div>

---

# MCP-Powered Agent Architecture

```mermaid {scale: 0.45}
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
    style U fill:#3070b3,stroke:#25609e,color:#ffffff
    style FE fill:#f0efec,stroke:#3070b3,color:#1c1c1c
    style BE fill:#f0efec,stroke:#3070b3,color:#1c1c1c
    style AG fill:#6b21a8,stroke:#581c87,color:#ffffff
    style DB fill:#f0efec,stroke:#e0ddd7,color:#1c1c1c
    style T1 fill:#e8e6e1,stroke:#e0ddd7,color:#5c5c5c
    style T2 fill:#e8e6e1,stroke:#e0ddd7,color:#5c5c5c
    style T3 fill:#e8e6e1,stroke:#e0ddd7,color:#5c5c5c
    style T4 fill:#e8e6e1,stroke:#e0ddd7,color:#5c5c5c
    style T5 fill:#e8e6e1,stroke:#e0ddd7,color:#5c5c5c
    style T6 fill:#e8e6e1,stroke:#e0ddd7,color:#5c5c5c
    style T7 fill:#e8e6e1,stroke:#e0ddd7,color:#5c5c5c
    style T8 fill:#e8e6e1,stroke:#e0ddd7,color:#5c5c5c
```

<div class="flex justify-center gap-8 mt-4">
  <div class="text-center"><span class="text-3xl font-bold text-[#3070b3]">15+</span><br/><span class="text-sm opacity-60">MCP Tools</span></div>
  <div class="text-center"><span class="text-3xl font-bold text-[#3070b3]">7</span><br/><span class="text-sm opacity-60">Agent Skills</span></div>
  <div class="text-center"><span class="text-3xl font-bold text-[#3070b3]">8</span><br/><span class="text-sm opacity-60">External Systems</span></div>
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

# One interface. **Zero learning curve.**

<div class="relative mt-2">
  <img src="/images/2_populated_ui.png" class="mx-auto rounded-lg shadow-lg" style="max-height: 68%; object-fit: contain;" />
  <div style="display: flex; justify-content: space-between; margin-top: 0.75rem; font-size: 0.8rem;">
    <div style="text-align: center; flex: 1; color: #3070b3; font-weight: 600;">Tasks with deadlines & Moodle resources</div>
    <div style="text-align: center; flex: 2; color: #3070b3; font-weight: 600;">Real-time calendar with color-coded events</div>
    <div style="text-align: center; flex: 1; color: #3070b3; font-weight: 600;">Natural language chat & slash commands</div>
  </div>
</div>

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

# Limitations & Honest Tradeoffs

<div class="three-cols">
<div class="col">

#### LLM Hallucinations

The agent can misinterpret data or generate incorrect summaries. Every action it takes — events, todos, meal picks — should be **reviewed by the student**, not blindly trusted.

</div>
<div class="col">

#### Omissions

The agent may miss an assignment, skip a club event, or overlook a deadline. It's a **co-pilot, not autopilot** — it reduces work, but doesn't replace human judgment.

</div>
<div class="col">

#### API Fragility

University systems change without notice. SAML sessions expire, Moodle restructures pages, club websites update layouts. The agent handles failures gracefully, but **no integration is guaranteed forever**.

</div>
</div>

<div class="text-center mt-8 text-lg">

We built AssisTUM to **assist**, not to replace. The student always has the final say.

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
Team Pui — REPLY Makeathon 2026
</div>

---
layout: section
---

# Appendix

Deep-dive into each integration

---

# <span class="appendix-badge">A1</span> TUM Online Integration

```mermaid {scale: 0.45}
sequenceDiagram
    participant Agent
    participant Backend
    participant TUM as TUM Online API
    Agent->>Backend: tum_lectures()
    Backend->>TUM: GET /cdm (token auth)
    TUM-->>Backend: XML response
    Backend->>Backend: Parse XML (xml2js)
    Backend-->>Agent: Structured lecture data
```

**Auth:** Token-based (email confirmation flow) | **Data:** XML → xml2js → JSON → calendar events

**Capabilities:** Fetch lecture schedule, sync courses to local DB, fetch grades

---

# <span class="appendix-badge">A2</span> Moodle Integration

```mermaid {scale: 0.4}
sequenceDiagram
    participant Agent
    participant Backend
    participant Shib as Shibboleth IdP
    participant Moodle
    Agent->>Backend: moodle_assignments()
    Backend->>Shib: SAML login (auto-redirect)
    Shib-->>Backend: SAML assertion + session
    Backend->>Moodle: Fetch courses & assignments
    Moodle-->>Backend: Course list + deadlines
    Backend->>Moodle: Fetch resource pages + PDFs
    Backend->>Backend: Extract text (unpdf) + summarize
    Backend-->>Agent: Assignments + summarized resources
```

**Auth:** SAML Shibboleth SSO — auto-redirect chain, session caching, auto-refresh on expiry

**PDF Pipeline:** Moodle page → detect PDF → download → extract text → summarize → link in task

Most technically complex integration. SAML auth alone is non-trivial.

---

# <span class="appendix-badge">A3</span> Email Integration

```mermaid {scale: 0.45}
sequenceDiagram
    participant Agent
    participant Backend
    participant IMAP as TUM IMAP Server
    Agent->>Backend: tum_email_read()
    Backend->>IMAP: Connect (credentials)
    IMAP-->>Backend: Last 7 days of messages
    Backend-->>Agent: Parsed email list
    Agent->>Agent: Identify actionable items
    Agent->>Backend: create_todo(type: email_action)
```

**Auth:** IMAP credentials + SMTP for sending | **Read:** Last N days, extract sender/subject/date/body

**Agent behavior:** Scans for actionable items, creates todos with 48h default deadline unless email specifies one

---

# <span class="appendix-badge">A4</span> Mensa & Canteen

```mermaid {scale: 0.5}
graph LR
    CAL["Today's Calendar"] --> CAMPUS["Determine Campus"]
    CAMPUS --> SEL["Select Closest Mensa"]
    SEL --> API["eat-api: Fetch Menu"]
    API --> MEAL["Pick Meal"]
    MEAL --> EVENT["Create Lunch Event"]
    style CAL fill:#f0efec,stroke:#3070b3,color:#1c1c1c
    style CAMPUS fill:#f0efec,stroke:#3070b3,color:#1c1c1c
    style SEL fill:#f0efec,stroke:#3070b3,color:#1c1c1c
    style API fill:#f0efec,stroke:#d97706,color:#1c1c1c
    style MEAL fill:#f0efec,stroke:#d97706,color:#1c1c1c
    style EVENT fill:#d97706,stroke:#b45309,color:#ffffff
```

**API:** TUM eat-api (public, no auth)

**Capabilities:**
- Weekly menus by location (mensa-garching, mensa-arcisstr, etc.)
- Live occupancy head count

**Agent behavior:** Cross-references calendar → determines campus → picks closest canteen → schedules lunch → selects meal

---

# <span class="appendix-badge">A5</span> NavigaTUM & Commute

```mermaid {scale: 0.45}
graph LR
    ROOM["Room Code"] --> NAV["NavigaTUM API"]
    NAV --> CAMPUS["Campus: Garching"]
    CAMPUS --> CHECK{"Campus switch?"}
    CHECK -->|Yes| COMMUTE["Insert 1h commute"]
    CHECK -->|No| SKIP["No action"]
    MVV["MVV EFA API"] --> DEPS["Live departures"]
    DEPS --> ROUTE["Route + timing"]
    style ROOM fill:#f0efec,stroke:#9c9c9c,color:#1c1c1c
    style NAV fill:#f0efec,stroke:#3070b3,color:#1c1c1c
    style CAMPUS fill:#f0efec,stroke:#3070b3,color:#1c1c1c
    style CHECK fill:#f0efec,stroke:#ca8a04,color:#1c1c1c
    style COMMUTE fill:#9c9c9c,stroke:#7c7c7c,color:#ffffff
    style SKIP fill:#f0efec,stroke:#e0ddd7,color:#5c5c5c
    style MVV fill:#f0efec,stroke:#16a34a,color:#1c1c1c
    style DEPS fill:#f0efec,stroke:#16a34a,color:#1c1c1c
    style ROUTE fill:#16a34a,stroke:#15803d,color:#ffffff
```

**APIs:** NavigaTUM (room/building search) + MVV EFA (real-time departures)

**Commute logic:** For each lecture → resolve room code → determine campus → if campus switch, insert 1h commute block

**Route planning:** NavigaTUM room lookup + MVV live departures → tells student which U-Bahn to take and when to leave

---

# <span class="appendix-badge">A6</span> Student Clubs

```mermaid {scale: 0.5}
graph LR
    URLS["Configured Club URLs"] --> FETCH["Fetch HTML"]
    FETCH --> PARSE["Cheerio: Strip HTML"]
    PARSE --> EXTRACT["Extract Event Text"]
    EXTRACT --> CREATE["Create Calendar Events"]
    style URLS fill:#f0efec,stroke:#9333ea,color:#1c1c1c
    style FETCH fill:#f0efec,stroke:#9333ea,color:#1c1c1c
    style PARSE fill:#f0efec,stroke:#9333ea,color:#1c1c1c
    style EXTRACT fill:#f0efec,stroke:#9333ea,color:#1c1c1c
    style CREATE fill:#9333ea,stroke:#7e22ce,color:#ffffff
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

```mermaid {scale: 0.5}
graph LR
    LOC["Student Location"] --> ASTA["ASTA API"]
    ASTA --> FILTER["Filter by Proximity"]
    FILTER --> ROOMS["Available Rooms + Details"]
    style LOC fill:#f0efec,stroke:#3070b3,color:#1c1c1c
    style ASTA fill:#f0efec,stroke:#16a34a,color:#1c1c1c
    style FILTER fill:#f0efec,stroke:#16a34a,color:#1c1c1c
    style ROOMS fill:#16a34a,stroke:#15803d,color:#ffffff
```

Accessed via `/find-study-room` slash command or natural language request

---

# <span class="appendix-badge">A8</span> The Agent Engine

```mermaid {scale: 0.38}
sequenceDiagram
    participant User
    participant Frontend as React Frontend
    participant Backend as Express Backend
    participant Agent as OpenCode Agent
    participant MCP as MCP Tools (15+)
    participant API as External APIs

    User->>Frontend: /plan-week
    Frontend->>Backend: POST /api/skills/plan-week/invoke
    Backend->>Agent: Load skill markdown as system prompt
    loop For each phase
        Agent->>MCP: Call tool (e.g. tum_lectures)
        MCP->>API: Real API request
        API-->>MCP: Response
        MCP-->>Agent: Tool result + DB write
        Agent-->>Frontend: SSE stream update
    end
    Agent-->>Frontend: Final summary
```

**Engine:** OpenCode SDK | **Protocol:** MCP — 15+ tools | **Skills:** 7 markdown workflows, loaded dynamically

**Error handling:** Per-tool graceful degradation — if one integration fails, agent skips and continues
