# AssisTUM Pitch Deck Design

## Context

- **Format:** Leave-behind PDF, read by judges independently (not presented live on stage)
- **Audience:** Makeathon judges panel scoring against a 5-criteria rubric
- **Tool:** Slidev (Vue-based, markdown-authored, Mermaid diagrams, PDF export)
- **Structure:** Hybrid — story hook (slides 1–6) then rubric-aligned sections (slides 7–11) then close + appendix
- **Goal:** Make it trivially easy for judges to give high scores on every criterion

## Judging Criteria Mapping

| Criterion | Primary slides | Supporting slides |
|-----------|---------------|-------------------|
| Innovation & Ambition | 5 (cascade flow), 7 (architecture) | 11 (capabilities), A8 (agent engine) |
| Integration Depth & Autonomy | **6 (agent acts)**, **8 (integration map)** | 5 (cascade), A1–A7 (per-integration deep dives) |
| Real-World Impact & Quality | 10 (impact) | 4 (result screenshot), 12 (closing) |
| UI/UX | 9 (annotated UI) | 3 (empty UI), 4 (populated UI) |
| Presentation Quality | Entire deck structure + visual design | 12 (closing) |

---

## Slide-by-Slide Spec

### Slide 1 — Title

- **Headline:** "AssisTUM"
- **Tagline:** "Your Autonomous Campus Co-Pilot"
- **Content:** Team name, member names, makeathon branding
- **Visual:** Minimal, dark theme, clean typography
- **Notes:** Set the tone — polished, confident, not cluttered

### Slide 2 — The Problem

- **Headline:** "Students are human APIs"
- **Visual:** Diagram of 6+ disconnected system logos (TUM Online, Moodle, TUM Email, Mensa, NavigaTUM, ZHS, club sites) — scattered, no connections between them
- **Stat:** "30+ minutes every week just to plan the basics"
- **Subtext:** "Systems don't talk to each other. Students are the glue."
- **Notes:** "Human APIs" mirrors the challenge brief's exact language. The disconnected diagram is the visual hook — it should feel chaotic.

### Slide 3 — The One Message

- **Headline:** "What if it took one message?"
- **Visual:** Screenshot of the empty AssisTUM UI with "Let's plan my next week" typed in the chat input
- **Notes:** This is the "before." No explanation — just the empty calendar and the simple prompt. Sets up the payoff on the next slide.

### Slide 4 — The Result

- **Headline:** "30 seconds later"
- **Visual:** Full screenshot of the populated AssisTUM UI — calendar full of color-coded events, todos populated with deadline badges, agent summary in chat
- **Notes:** No text explanation. Let the before/after contrast with Slide 3 do the work. Judges should feel the density of what just happened.

### Slide 5 — What Just Happened

- **Headline:** "One message. Seven autonomous phases."
- **Visual:** Mermaid flow diagram showing the cascade sequence:
  ```
  "Let's plan my next week"
    → Phase 1: Fetch lectures (TUM Online + iCal)
    → Phase 2: Resolve rooms & add commute (NavigaTUM)
    → Phase 3: Scan Moodle — fetch PDFs, summarize, create tasks (Moodle SAML)
    → Phase 4: Triage email into tasks (IMAP)
    → Phase 5: Schedule meals by campus (eat-api)
    → Phase 6: Scrape club events (web scraper)
    → Phase 7: Deliver summary + tomorrow's briefing
  ```
- Each node annotated with the real external system it hits
- **Notes:** This is the technical centerpiece. Judges should see the integration depth at a glance — 7 phases, 5+ external systems, one autonomous workflow.

### Slide 6 — The Agent Acts, Not Just Retrieves

- **Headline:** "It doesn't just fetch data — it makes decisions"
- **Layout:** 3-column
- **Column 1 — Commute:** "Looked up every room in NavigaTUM, determined which campus each lecture is on, added travel time — **no one told it to.**"
- **Column 2 — Mensa:** "Picked the closest canteen to your actual location that day, chose a meal based on your preferences."
- **Column 3 — Moodle:** "Downloaded PDFs from course pages, extracted text, summarized them, linked summaries in your tasks."
- **Notes:** This slide directly answers "Integration Depth & Autonomy." Each column shows a multi-step autonomous decision chain, not just data retrieval.

### Slide 7 — Architecture

- **Headline:** "MCP-Powered Agent Architecture"
- **Visual:** Mermaid architecture diagram:
  ```
  User ↔ React Frontend (real-time SSE)
    ↔ Express Backend
      ↔ OpenCode Agent Engine
        ↔ MCP Tools (15+)
          ├── TUM Online API (token, XML)
          ├── Moodle (SAML SSO)
          ├── Email (IMAP/SMTP)
          ├── eat-api (public)
          ├── NavigaTUM (public)
          ├── MVV EFA (public)
          ├── ASTA Study Rooms (public)
          └── Web Scraper (Cheerio)
      ↔ SQLite Database
  ```
- **Callouts:** "15+ MCP tools", "7 agent skills", "Real-time SSE streaming"
- **Notes:** Scores "Innovation & Ambition." The MCP-based architecture with markdown-defined skills is genuinely novel for a hackathon.

### Slide 8 — Integration Map

- **Headline:** "5+ University Systems. Real APIs. Real Auth."
- **Visual:** Table/grid with columns: System | Auth Method | Autonomous Actions
- **Rows:**
  - Moodle | SAML SSO | Fetches assignments, **downloads PDFs, extracts text, summarizes**
  - TUM Online | Token | Pulls lectures, syncs courses, fetches grades
  - NavigaTUM | Public | Resolves room codes → campus, **auto-generates commute blocks**
  - Email | IMAP/SMTP | Reads inbox, **triages into actionable tasks with deadlines**
  - Mensa | Public | Fetches menus, **picks closest canteen by schedule context**
  - MVV | Public | Live departures, **calculates when to leave**
  - Clubs | Web scrape | Extracts events from **arbitrary club websites**
  - Study Rooms | ASTA API | **Real-time availability** across campuses
- **Notes:** This should feel dense and impressive. Bold the autonomous actions — judges scanning the table should see the word "auto" / "autonomously" / decision-making throughout.

### Slide 9 — UI/UX

- **Headline:** "One interface. Zero learning curve."
- **Visual:** Annotated screenshot of the 3-panel UI with callout arrows:
  - Left panel: "Tasks with deadlines, priorities, and linked Moodle resources"
  - Center panel: "Real-time calendar with color-coded event types"
  - Right panel: "Natural language chat — type what you need, or use slash commands"
- **Subtext:** "No forms. No dropdowns. Just conversation."
- **Notes:** Scores "UI/UX." The annotation callouts guide the judge's eye so they understand the layout without needing the live demo.

### Slide 10 — Real-World Impact

- **Headline:** "30 minutes → 30 seconds"
- **Visual:** Before/after comparison:
  - **Before:** 6 browser tabs, manual copy-paste, missed deadlines, forgotten lunches
  - **After:** One conversation, full week planned, nothing missed
- **Bottom line:** "Works with any TUM student's real credentials, today. Not a prototype — a working product."
- **Notes:** Scores "Real-World Impact." The "works today" line echoes the challenge's call for "something that lives on beyond the hackathon."

### Slide 11 — The Full Capability Surface

- **Headline:** "Not a chatbot. A campus operating system."
- **Visual:** Grouped capability grid:

**Data Intelligence**
- Fetches and reads PDFs, exercise sheets, and lecture slides from Moodle
- Extracts text from PDFs, summarizes content, links in tasks
- Scrapes any student club website for events
- Reads and triages university email

**Autonomous Actions**
- Resolves lecture rooms → determines campus → adds commute time
- Picks closest mensa by your schedule, selects meals
- Schedules study sessions around your deadlines
- Detects and resolves calendar conflicts

**Real-Time Information**
- Live MVV departures — tells you when to leave and which train
- Study room availability across campuses
- Mensa occupancy — how crowded is it right now?
- Canteen menus for the full week

**Agent Skills**
- `/plan-week`, `/review-lectures`, `/schedule-study-sessions`, `/commute-helper`, `/find-study-room`, `/conflict-resolver`, `/course-brainstorm`

- **Notes:** Shows full breadth. Organized by capability type so judges see it's not just "7 slash commands" but a deep, interconnected system.

### Slide 12 — Closing

- **Headline:** "AssisTUM"
- **Tagline:** "Being a student should be about learning — not logistics."
- **Content:** Team name, member names
- **Bottom line:** "Built in 48 hours. Ready to deploy."
- **Notes:** Echoes the challenge brief's opening line. "48 hours" signals execution quality. "Ready to deploy" signals maturity.

---

## Appendix Slides

One deep-dive per feature. For judges who want to explore further.

### A1 — TUM Online Integration

- **Auth:** Token-based (email confirmation flow)
- **Data:** XML API responses parsed with xml2js
- **Capabilities:** Fetch lecture schedule, sync courses to local DB, fetch grades
- **Diagram:** Token auth flow + XML parsing pipeline

### A2 — Moodle Integration

- **Auth:** SAML Shibboleth SSO — auto-redirect chain, session caching, auto-refresh on expiry
- **Capabilities:** Enrolled courses, assignments with deadlines, course content scraping (sections + activities), resource fetching (follows redirects, handles embedded PDFs)
- **PDF pipeline:** Moodle page → detect PDF → download → unpdf text extraction → summarize → store in task resources
- **Diagram:** SAML auth chain + content extraction pipeline
- **Notes:** Most technically impressive integration. The SAML auth alone is non-trivial.

### A3 — Email Integration

- **Auth:** IMAP credentials (TUM email server)
- **Capabilities:** Read inbox (configurable: last N days, message limit), extract sender/subject/date/body, send emails via SMTP with reply tracking
- **Agent behavior:** Scans for actionable items, creates email_action todos with 48h default deadline unless email specifies one
- **Diagram:** IMAP fetch → parse → triage → todo creation

### A4 — Mensa & Canteen

- **API:** TUM eat-api (public, no auth)
- **Capabilities:** Weekly menus by location (mensa-garching, mensa-arcisstr, etc.), live occupancy head count
- **Agent behavior:** Cross-references student's calendar to determine campus → picks closest canteen → schedules lunch block at appropriate time → selects meal
- **Diagram:** Calendar context → campus resolution → canteen selection → menu fetch → event creation

### A5 — NavigaTUM & Commute

- **APIs:** NavigaTUM (room/building search, public), MVV EFA (real-time departures, public)
- **NavigaTUM capabilities:** Room code → building → campus determination (Garching vs Stammgelände)
- **MVV capabilities:** Real-time departures for any Munich station, route suggestions
- **Agent behavior:** For each lecture → resolve room code → determine campus → if campus switch, insert 1h commute block before lecture. For commute-helper skill → combine NavigaTUM lookup + MVV live departures → tell student which U-Bahn to take and when to leave
- **Diagram:** Room code → NavigaTUM → campus → commute block; Station → MVV API → departure times

### A6 — Student Clubs

- **Method:** Configurable club URLs, Cheerio HTML scraping
- **Capabilities:** Scrapes arbitrary club websites, strips HTML, extracts event text
- **Agent behavior:** Fetches all configured clubs, parses event details, creates calendar events
- **Notes:** Fragile by nature (depends on page structure) but handles errors gracefully — skips clubs that fail, continues with rest

### A7 — Study Rooms

- **API:** ASTA study room API (public)
- **Capabilities:** Real-time room availability across TUM campuses
- **Agent behavior:** Filters by proximity to student's current/upcoming location, reports available rooms with building details

### A8 — The Agent Engine

- **Engine:** OpenCode SDK, spawned as local server
- **Protocol:** Model Context Protocol (MCP) — 15+ tools exposed to agent
- **Skills:** 7 markdown-defined workflows loaded dynamically via `/api/skills/` endpoint
- **Execution flow:** User message or slash command → skill markdown loaded as system prompt → agent executes multi-phase workflow → tool calls stream to frontend via SSE → results written to SQLite → UI updates in real-time
- **Error handling:** Per-tool graceful degradation — if one integration fails, agent skips and continues
- **Diagram:** Mermaid sequence diagram: User → Frontend → Backend → OpenCode → MCP Tool → External API → SQLite → SSE → Frontend update

---

## Visual Design Notes

- **Theme:** Dark, clean, professional. Avoid playful/startup aesthetics — this is a technical product for technical judges.
- **Color palette:** Align with AssisTUM's UI colors — blue (lectures), green (study), orange (meals), purple (clubs), gray (commute)
- **Diagrams:** Mermaid throughout — architecture, flows, sequences. Consistent style.
- **Screenshots:** Real screenshots from the running app. Annotate with callout arrows where needed. No mockups.
- **Typography:** Large headlines, minimal body text. The deck should be scannable — judges may skim.
- **Slide count:** 12 main + 8 appendix = 20 total. Main deck reads in ~5 minutes, appendix on demand.

## Implementation Notes

- **Framework:** Slidev with PDF export via `slidev export`
- **Location:** `/pitch-deck/` directory at project root (separate from main app)
- **Screenshots:** Capture from running app before building slides. Store in `/pitch-deck/public/` or `/pitch-deck/assets/`
- **Test PDF export** before submission — verify Mermaid diagrams render correctly in export
