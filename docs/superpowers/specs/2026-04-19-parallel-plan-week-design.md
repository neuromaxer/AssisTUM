# Parallel Plan-Week Orchestrator — Design Spec

## Problem

The current `plan-week` skill sends the entire skill markdown as a prompt, and the agent executes 9 sequential phases — each calling MCP tools one at a time. A typical run makes 50+ sequential tool calls (fetch lectures, wait, fetch calendar, wait, navigatum_search x7, wait each, fetch moodle, wait, ...). This takes 3+ minutes, most of which is I/O wait between tool calls.

## Goal

Pre-fetch all raw data in parallel (~5s), then give the agent one rich prompt with everything pre-loaded. The agent does one reasoning pass: creates courses/events/todos, resolves rooms, schedules meals/commutes, handles conflicts, writes the summary. Total time target: ~30-60s.

## Non-Goals

- Removing the LLM from the planning process (it's needed for course matching, email triage, club event extraction, conflict resolution, natural language summary)
- Supporting other skills with this pattern (only plan-week for now)
- Changing the chat UX or SSE streaming (reuse existing infrastructure)

---

## Architecture

### Two-Phase Flow

```
POST /api/skills/plan-week/invoke
  │
  ├─ Phase 1: Parallel Fetch (no LLM, ~5s)
  │   ├── fetchLectures()     — tum_calendar + tum_lectures
  │   ├── fetchMoodle()        — moodle_courses + moodle_assignments + moodle_course_content
  │   ├── fetchEmail()         — tum_email_read (IMAP)
  │   ├── fetchMenus()         — canteen_menu (garching + arcisstr)
  │   └── fetchClubs()         — club_events + web_fetch per event link
  │
  │   Status messages posted to chat as each completes.
  │
  ├─ Phase 2: Agent Prompt (LLM, one call)
  │   Agent receives all raw data + instructions.
  │   Agent creates courses, events, todos via MCP tools.
  │   Agent resolves rooms, schedules meals/commutes, detects conflicts.
  │   Agent writes formatted summary.
  │
  └─ Return 204
```

### Phase 1: Parallel Fetchers

Five async functions that call external APIs directly (not through MCP). They run via `Promise.allSettled()` so one failure doesn't block others.

Each fetcher returns its raw data as a structured object. Nothing is created in the DB during this phase — all creation happens in the agent phase.

**Fetcher signatures:**

```ts
fetchLectures(settings): Promise<{ icalEvents: ICalEvent[], tumLectures: TumLecture[] }>
fetchMoodle(settings):   Promise<{ courses: MoodleCourse[], assignments: MoodleAssignment[], courseContent: Record<string, MoodleSection[]> }>
fetchEmail(settings):    Promise<{ emails: Email[] }>
fetchMenus():            Promise<{ garching: MenuItem[], arcisstr: MenuItem[] }>
fetchClubs(clubs):       Promise<{ clubs: ClubResult[] }>
```

Each fetcher extracts the core logic from the existing MCP tool handlers in `fetch.ts`. The MCP tools become thin wrappers:

```ts
// Before (in fetch.ts MCP handler):
server.tool("tum_calendar", ..., async () => {
  // 50 lines of iCal fetching + parsing
});

// After:
// fetchers/lectures.ts exports fetchLectures()
// fetch.ts MCP handler:
server.tool("tum_calendar", ..., async () => {
  const settings = getSettings();
  const result = await fetchLectures(settings);
  return ok(result.icalEvents);
});
```

**Settings:** Fetchers need auth tokens (TUM Online token, Moodle token, IMAP credentials, iCal URL). These are read once from the `settings` table before dispatching.

**Status messages:** After all fetchers complete, the orchestrator includes a status preamble in the agent prompt listing what was fetched ("Pre-fetched: 7 iCal events, 3 Moodle courses, 15 emails, menus for 2 campuses, 2 club pages"). The agent echoes this as its first message. No separate status mechanism needed.

### Phase 2: Agent Prompt

The orchestrator constructs a single prompt containing:

1. **Memory preamble** — the memory-guidelines skill content (same as current)
2. **Skill header** — `[Skill: plan-week]`
3. **Pre-fetched data** — all raw data from Phase 1, formatted as labeled sections:
   ```
   ## Pre-fetched Data
   
   ### iCal Events (7 found)
   [JSON array of parsed iCal events with title, start, end, location, uid]
   
   ### TUM Online Lectures (5 found)  
   [JSON array of lecture entries]
   
   ### Moodle Courses (4 found)
   [JSON array of course objects]
   
   ### Moodle Assignments (3 found)
   [JSON array of assignments with deadlines]
   
   ### Moodle Course Content
   [JSON keyed by course ID]
   
   ### Emails (15 found)
   [JSON array with subject, sender, date, body_snippet]
   
   ### Canteen Menus
   #### Mensa Garching
   [JSON menu items]
   #### Mensa Arcisstraße
   [JSON menu items]
   
   ### Club Events
   [JSON array with club name, scraped text, event_links, fetched event pages]
   ```

4. **Agent instructions** — a modified version of the plan-week skill that skips all fetch phases and starts from processing. The agent is told:
   - All data above was pre-fetched. Do NOT call any fetch tools (tum_calendar, tum_lectures, moodle_courses, etc.)
   - Process the data and create courses, events, and todos using the create_* tools
   - Resolve rooms using `navigatum_search` (this still requires tool calls — room codes to campus mapping)
   - Add commute blocks based on campus locations
   - Add meals in free slots using the provided menu data
   - Detect and handle conflicts (auto-fix flexible, flag fixed-vs-fixed)
   - Write the weekly summary in the standard format

This prompt is sent via `promptAsync` to the existing session, so it streams into the chat via SSE.

### Orchestrator Entry Point

The `/api/skills/plan-week/invoke` route is special-cased:

```ts
// In skills.ts:
if (skillName === "plan-week") {
  await runPlanWeekOrchestrator(sessionId);
  res.status(204).end();
  return;
}
// ... existing generic skill invoke for other skills
```

The orchestrator function lives in a separate file:

```ts
// backend/src/orchestrators/plan-week.ts
export async function runPlanWeekOrchestrator(sessionId: string) {
  const settings = readAllSettings();
  const clubs = readClubs();
  
  // Phase 1: parallel fetch
  const [lectures, moodle, email, menus, clubData] = await Promise.allSettled([
    fetchLectures(settings),
    fetchMoodle(settings),
    fetchEmail(settings),
    fetchMenus(),
    fetchClubs(clubs),
  ]);
  
  // Phase 2: build prompt and send to agent
  const prompt = buildPlanWeekPrompt(lectures, moodle, email, menus, clubData, settings);
  
  const client = await getOpenCodeClient();
  await client.session.promptAsync({
    path: { id: sessionId },
    body: { parts: [{ type: "text", text: prompt }] },
  });
}
```

### Modified Skill Prompt

A new skill file `plan-week-agent.md` (or inline in the orchestrator) contains the agent-phase-only instructions. It's a trimmed version of the current `plan-week.md` with:

- No fetch phases (1-6 from current skill)
- Starts with "You have been given pre-fetched data. Process it as follows..."
- Keeps: course creation, event creation, todo creation, room resolution, commute planning, meal scheduling, conflict detection, summary format, tomorrow's briefing
- Explicitly forbids calling fetch tools

The current `plan-week.md` stays as-is for the `/` slash command description and for potential fallback.

---

## File Structure

### New Files

| File | Purpose |
|------|---------|
| `backend/src/orchestrators/plan-week.ts` | Orchestrator: reads settings, dispatches fetchers, builds prompt |
| `backend/src/fetchers/lectures.ts` | Fetch + parse iCal and TUM Online lectures |
| `backend/src/fetchers/moodle.ts` | Fetch Moodle courses, assignments, course content |
| `backend/src/fetchers/email.ts` | Fetch emails via IMAP |
| `backend/src/fetchers/menus.ts` | Fetch canteen menus |
| `backend/src/fetchers/clubs.ts` | Fetch club event pages + individual event details |
| `backend/src/skills/plan-week-agent.md` | Agent-phase instructions (no fetch phases) |

### Modified Files

| File | Changes |
|------|---------|
| `backend/src/api/skills.ts` | Special-case `plan-week` to use orchestrator |
| `backend/src/mcp/tools/fetch.ts` | Extract core logic into fetcher modules, keep MCP tools as thin wrappers |

---

## Error Handling

- Each fetcher is wrapped in `Promise.allSettled()`. If one fails, the agent prompt notes it: "Moodle data unavailable (error: ...)". The agent skips that section.
- If ALL fetchers fail, fall back to the current sequential skill flow.
- Settings validation happens before dispatching fetchers. Missing tokens produce a clear error immediately.

---

## Verification

1. **Speed:** Time a full plan-week run. Target: parallel fetch in ~5-10s, agent phase in ~30-60s. Compare to current ~3 min.
2. **Completeness:** The agent should create the same events/todos as the current sequential flow.
3. **Resilience:** Disable Moodle token, verify the orchestrator still runs with partial data.
4. **Chat UX:** Status messages appear in chat during fetching. Agent response streams normally.
5. **Fallback:** Other skills (conflict-resolver, find-study-room, etc.) still use the generic invoke path.
