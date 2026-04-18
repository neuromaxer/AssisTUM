# Demo Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite agent prompts, skills, and add demo infrastructure so a 5-minute fully-live demo reliably produces a "one prompt → full calendar" cascade with interactive follow-ups.

**Architecture:** Update the OpenCode system prompt for narration + tool discipline, rewrite 4 skill files for scripted demo behavior, add a bulk reset API endpoint, and create a presenter cheat-sheet.

**Tech Stack:** OpenCode config (JSON), MCP skill files (Markdown), Express (TypeScript), Markdown

**Spec:** `docs/specs/2026-04-18-demo-orchestration-design.md`

---

## Task 1: Update OpenCode system prompt

**Files:**
- Modify: `opencode.json`

- [ ] **Step 1: Replace the instructions array in `opencode.json`**

Replace the entire file with:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-6",
  "mcp": {
    "assistum-tools": {
      "type": "local",
      "command": ["npx", "tsx", "backend/src/mcp/server.ts"]
    }
  },
  "instructions": [
    "You are AssisTUM, a campus co-pilot for TUM students. You speak concisely and warmly — like a knowledgeable friend, not a corporate assistant. Use short paragraphs, not bullet lists. Address the user by name if known.",
    "CRITICAL BEHAVIOR — TOOL CALLS: Every event, todo, and course MUST be created via tool calls (create_event, create_todo, create_course). These persist to the database and appear in the UI in real-time. NEVER just describe what you \"would\" add — actually call the tool. When creating events, always use ISO 8601 datetimes for the UPCOMING week (Monday to Sunday). Use the current date to calculate this. Color coding: lectures #3070b3, study #22c55e, meals #f97316, clubs #a855f7, recreation #ec4899, custom #6b7280.",
    "CRITICAL BEHAVIOR — NARRATION: When doing multi-step work, narrate your progress in SHORT status lines between tool calls. Example: \"Pulling your lectures from TUM Online...\" then call tools, then \"Found 4 lectures — added them to your calendar.\" Never go silent for more than 2-3 tool calls. Always surface progress. After completing a batch of work, give a brief natural-language summary of what changed.",
    "FAILURE HANDLING: If a fetch tool returns an error or \"not configured\", skip it gracefully. Say something like \"Couldn't reach Moodle right now — I'll work with what I have\" and continue with other sources. Never stop the entire workflow because one source failed.",
    "PERSONALITY: Be proactive: suggest lunch between back-to-back lectures, warn about early mornings, notice long gaps that could be study time. Show you understand student life — mention things like \"that's a tight turnaround\" or \"good news, you've got Wednesday afternoon free.\""
  ]
}
```

- [ ] **Step 2: Verify the JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('opencode.json','utf8')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add opencode.json
git commit -m "feat: comprehensive OpenCode system prompt for demo narration and tool discipline"
```

---

## Task 2: Rewrite plan-week skill

**Files:**
- Modify: `backend/src/skills/plan-week.md`

- [ ] **Step 1: Replace `backend/src/skills/plan-week.md` with the 6-phase scripted version**

```markdown
---
name: plan-week
description: Plan the student's upcoming week by fetching all data sources and populating the calendar and todo list
---

When the user asks to plan their week, follow these phases IN ORDER.
Between each phase, write a short 1-2 sentence status update.
Never skip the narration — the user is watching events appear in
real-time and needs context for what's happening.

Use the CURRENT DATE to determine the upcoming Monday–Sunday range.
All events must use exact ISO 8601 datetimes within that range.

## Phase 1: Lectures & Calendar

Tell the user: "Let me start by pulling your lecture schedule..."

1. Call `tum_calendar` to get iCal events.
2. Call `tum_lectures` to get enrolled courses.
3. For each lecture/event in the upcoming week:
   - Call `create_course` if the course doesn't exist yet
   - Call `create_event` with type "lecture", color "#3070b3",
     linked to the course
4. Report: "Found N lectures across N courses this week —
   they're on your calendar now."

## Phase 2: Assignments & Deadlines

Tell the user: "Now checking Moodle for upcoming deadlines..."

1. Call `moodle_courses` to get enrolled Moodle courses.
2. Call `moodle_assignments` for those courses.
3. For each assignment with a deadline in the next 14 days:
   - Call `create_todo` with type "assignment", linked to course
   - Priority: due within 3 days = high, 7 days = medium, else low
4. Report: "You have N assignments coming up. I've added them
   to your task list."

If Moodle is unavailable, say "Couldn't reach Moodle right now —
I'll skip that for now" and continue.

## Phase 3: Email

Tell the user: "Checking your inbox for anything that needs attention..."

1. Call `tum_email_read` with limit 15, since_days 7.
2. Scan for actionable items (reply needed, event invites, deadlines).
3. For each actionable email, call `create_todo` with type
   "email_action" and include sender + subject in the title.
4. Report: "Scanned N recent emails — created N action items."

If email is unavailable, skip gracefully and continue.

## Phase 4: Canteen & Meals

Tell the user: "Let me check what's for lunch this week..."

1. Call `canteen_menu` for "mensa-garching".
2. Look at the user's lecture schedule — find days with
   back-to-back morning + afternoon classes.
3. For those days, call `create_event` with type "meal",
   color "#f97316", title like "Lunch @ Mensa Garching",
   slotted in the gap between classes (or 12:00-13:00 default).
4. Report briefly: "Added lunch breaks on the days you're on campus."

## Phase 5: Club Events

Tell the user: "Checking your student club events..."

1. Call `club_events` to fetch from configured club URLs.
2. For any events in the upcoming week, call `create_event`
   with type "club", color "#a855f7".
3. Report what was found (or "No club events this week").

If no clubs configured, skip silently.

## Phase 6: Conflicts & Summary

Tell the user: "Almost done — let me check for any scheduling
conflicts..."

1. Call `query_events` for the full week range.
2. Check for any overlapping events (where one event's start
   is before another's end and vice versa).
3. If conflicts found, describe each one clearly:
   "Heads up: [Event A] overlaps with [Event B] on [day] —
   want me to move one?"
4. Deliver a final summary:
   "Here's your week: N lectures, N assignments due, N lunch
   breaks planned. [Any observations about the week — e.g.,
   'Wednesday looks packed but Thursday is wide open', or
   'you've got an assignment due Monday morning']."
   End with: "Want me to schedule study sessions, or anything
   else you'd like to add?"
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/skills/plan-week.md
git commit -m "feat: rewrite plan-week skill with 6-phase narrated cascade"
```

---

## Task 3: Rewrite schedule-study-sessions skill

**Files:**
- Modify: `backend/src/skills/schedule-study-sessions.md`

- [ ] **Step 1: Replace `backend/src/skills/schedule-study-sessions.md`**

```markdown
---
name: schedule-study-sessions
description: Schedule study blocks based on assignment deadlines and calendar availability
---

When the user asks to schedule study time:

1. Call `query_todos` with completed=false to see upcoming deadlines.
2. Call `query_events` for the upcoming week to find free slots.
3. For each assignment/revision todo with a deadline:
   - Estimate 1-2 hours of study needed
   - Find a free slot BEFORE the deadline (prefer mornings
     or gaps between lectures)
   - Propose the slot to the user in your response
4. Present ALL proposed sessions at once as a short list:
   "Here's what I'd suggest:
   - Tuesday 14:00-16:00: Prep for [assignment] (due Wednesday)
   - Thursday 10:00-12:00: Review for [exam topic]
   Want me to add these, or adjust anything?"
5. Once the user confirms (or after adjustments), call
   `create_event` for each session with type "study",
   color "#22c55e", linked to the course.
6. Report: "Done — N study sessions added to your calendar."

Be opinionated. Don't ask about preferences — just propose
a reasonable plan. Students want answers, not questions.
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/skills/schedule-study-sessions.md
git commit -m "feat: rewrite study-sessions skill to be opinionated and demo-ready"
```

---

## Task 4: Update conflict-resolver skill

**Files:**
- Modify: `backend/src/skills/conflict-resolver.md`

- [ ] **Step 1: Replace `backend/src/skills/conflict-resolver.md`**

```markdown
---
name: conflict-resolver
description: Detect and resolve overlapping calendar events
---

1. Call `query_events` for the relevant time range.
2. Find overlapping events (where start_A < end_B AND start_B < end_A).
3. For each conflict, present it conversationally:
   "[Event A] and [Event B] overlap on [day] at [time].
   Which one takes priority, or should I move one?"
4. Execute the user's choice immediately with `update_event`
   or `delete_event`.
5. Confirm: "Done, moved [event] to [new time]" or
   "Removed [event] from your calendar."
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/skills/conflict-resolver.md
git commit -m "feat: update conflict-resolver skill with conversational narration"
```

---

## Task 5: Update commute-helper skill

**Files:**
- Modify: `backend/src/skills/commute-helper.md`

- [ ] **Step 1: Replace `backend/src/skills/commute-helper.md`**

```markdown
---
name: commute-helper
description: Help plan commute to campus using live MVV data
---

1. Call `query_events` to find the next upcoming lecture/event.
2. Call `navigatum_search` with the event's location or building.
3. Call `mvv_departures` for the nearest station to campus
   (default: "Garching-Forschungszentrum").
4. Calculate when to leave based on departure times and
   a 10-minute walking buffer.
5. Tell the user: "Your [event] is at [time] in [building].
   The next U6 from [station] leaves at [time] — head out
   by [time] to make it comfortably."
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/skills/commute-helper.md
git commit -m "feat: update commute-helper skill with live MVV integration"
```

---

## Task 6: Add bulk reset endpoint

**Files:**
- Create: `backend/src/api/reset.ts`
- Modify: `backend/src/index.ts:28` (add router import and mount)

- [ ] **Step 1: Create `backend/src/api/reset.ts`**

```typescript
import { Router } from "express";
import { getDb } from "../db/client.js";

export const resetRouter = Router();

resetRouter.delete("/", (_req, res) => {
  const db = getDb();
  db.exec("DELETE FROM events");
  db.exec("DELETE FROM todos");
  db.exec("DELETE FROM course_content");
  db.exec("DELETE FROM emails");
  db.exec("DELETE FROM courses");
  res.json({ reset: true });
});
```

- [ ] **Step 2: Wire reset router into `backend/src/index.ts`**

Add the import alongside the other router imports (after line 11):

```typescript
import { resetRouter } from "./api/reset.js";
```

Add the route alongside the other `app.use` calls (after line 29):

```typescript
app.use("/api/reset", resetRouter);
```

- [ ] **Step 3: Verify the reset endpoint works**

Run: `npx tsx backend/src/index.ts &`
Then: `curl -s -X DELETE http://localhost:3001/api/reset`
Expected: `{"reset":true}`
Kill the server after.

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/reset.ts backend/src/index.ts
git commit -m "feat: bulk reset endpoint for demo reruns"
```

---

## Task 7: Create demo script

**Files:**
- Create: `docs/demo_script.md`

- [ ] **Step 1: Create `docs/demo_script.md`**

```markdown
# AssisTUM Demo Script

## Pre-Demo Checklist (5 min before)

- [ ] Backend running (`task dev:backend`)
- [ ] Frontend running (`task dev:frontend`)
- [ ] OpenCode running (`task dev:opencode` or via OPENCODE_URL)
- [ ] Browser open at localhost:5173, calendar showing current week
- [ ] DB is clean — no stale events/todos from previous runs
- [ ] Settings configured: TUM Online token, iCal URL, email creds, Moodle token, at least one club URL
- [ ] Status bar shows green dots for all services
- [ ] Browser zoom set so audience can read the chat + calendar

## Reset Between Runs

```bash
curl -X DELETE http://localhost:3001/api/reset
```

---

## Act 1: The Cascade (~2.5 min)

**What you say to the audience:**
"Nico is a CS student at TUM. It's Sunday evening and he wants to plan his week. He opens AssisTUM and types one message."

**Type into chat:**
> Let's plan my next week

**What happens (what to point at):**
1. Chat shows "Pulling your lectures..." — point at the calendar as lecture blocks appear (blue)
2. Chat shows "Checking Moodle..." — point at the todo panel as assignments appear with deadlines
3. Chat shows "Checking inbox..." — todo panel gets email action items
4. Chat shows "Checking lunch..." — orange lunch blocks appear between lectures
5. Chat shows "Club events..." — purple blocks if any
6. Agent delivers summary with conflict warnings

**Talking points while agent works:**
- "It's pulling real data from 5 different university systems"
- "Every item you see appearing is a real tool call to a real API"
- "The calendar and task list update in real-time"

**If something goes wrong:**
- Agent hangs > 30s: "The agent is making real API calls — sometimes TUM systems are slow" (buy time)
- One source fails: Agent should skip gracefully. Say: "It handles failures gracefully — notice it moved on"
- Nothing appears in calendar: Check that dates are correct week. Worst case, move to Act 2 manually.

---

## Act 2: The Personal Touch (~1 min)

**What you say:**
"But Nico also has things the university doesn't know about."

**Type into chat:**
> I have a study group for Linear Algebra on Wednesday from 16:00 to 18:00, and I want to go to Mensa Garching for lunch on Tuesday

**What happens:**
- Agent creates both events, you see them pop up on the calendar
- Agent may notice a conflict with the study group and mention it

**Talking point:**
"It understands natural language — no forms, no dropdowns. Just tell it what you need."

---

## Act 3: The Intelligence (~1 min)

**What you say:**
"Now Nico has a busy week. He asks for help studying."

**Type into chat:**
> Can you schedule study sessions before my deadlines?

**What happens:**
- Agent looks at free time + deadlines
- Proposes study blocks
- After you say "looks good", green study blocks appear on the calendar

**Talking point:**
"It reasons about your workload and finds the right time slots automatically."

---

## Bonus (if time allows, pick one):

**Option A — Commute:**
> How do I get to my first lecture tomorrow?

Agent checks NavigaTUM + live MVV departures, tells you which U-Bahn to take and when to leave.

**Option B — Quick question:**
> What's for lunch at Mensa Garching on Thursday?

Agent already has the canteen data, gives a quick answer.

---

## Emergency Fallbacks

**If OpenCode won't start:**
Pre-seed the DB with events/todos via curl, demo the UI and explain the agent architecture. "Let me show you what it produces" (show pre-populated state).

**If all APIs fail:**
Have a pre-seeded DB backup ready:
```bash
cp assistum-demo-backup.db assistum.db
```
Then restart the backend.

**If agent is too slow:**
Narrate over it: "While it's working — what's happening under the hood is..." and explain the MCP architecture. The agent will catch up.

**If agent creates wrong dates:**
This is the most likely bug. If events appear outside the visible week, click "next week" on the calendar and say "there they are."
```

- [ ] **Step 2: Commit**

```bash
git add docs/demo_script.md
git commit -m "docs: presenter demo script with 3-act flow and emergency fallbacks"
```

---

## Task 8: Add reset task to Taskfile

**Files:**
- Modify: `Taskfile.yml`

- [ ] **Step 1: Add a `reset` task to `Taskfile.yml`**

Add after the `seed` task (after line 61):

```yaml
  reset:
    desc: Clear all events, todos, and courses for a clean demo rerun
    cmds:
      - curl -s -X DELETE http://localhost:3001/api/reset
```

- [ ] **Step 3: Commit**

```bash
git add Taskfile.yml
git commit -m "feat: add reset task to Taskfile for demo reruns"
```
