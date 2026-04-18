# Planner Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the plan-week skill with location awareness, richer todos, email deadlines, and add a review-lectures skill — then update the frontend and demo script.

**Architecture:** Extend the existing todos schema with `source_link` and `resources` columns, rewrite the plan-week skill from 6 to 9 phases, create a new review-lectures skill, update TodoPanel and TodoDetail to render links/resources.

**Tech Stack:** TypeScript, better-sqlite3, Zod, React, TailwindCSS, MCP SDK

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `backend/src/db/schema.ts` | Add `source_link` + `resources` columns to todos |
| Modify | `backend/src/mcp/tools/actions.ts` | Add new params to `create_todo` + `update_todo` |
| Modify | `backend/src/api/todos.ts` | Pass `source_link` + `resources` through REST API |
| Modify | `frontend/src/hooks/useTodos.ts` | Extend `Todo` type |
| Modify | `frontend/src/components/TodoPanel.tsx` | Render source link icon |
| Modify | `frontend/src/components/TodoDetail.tsx` | Render source link + resources section |
| Rewrite | `backend/src/skills/plan-week.md` | 9-phase location-aware planner |
| Create | `backend/src/skills/review-lectures.md` | Post-planning lecture review skill |
| Modify | `docs/demo_script.md` | Updated demo flow |

---

### Task 1: Add `source_link` and `resources` columns to todos table

**Files:**
- Modify: `backend/src/db/schema.ts:87-103`

- [ ] **Step 1: Add columns via idempotent ALTER TABLE**

Add to the `newCols` array in `backend/src/db/schema.ts`:

```typescript
    { table: "todos", col: "source_link", type: "TEXT" },
    { table: "todos", col: "resources", type: "TEXT" },
```

These go at the end of the existing `newCols` array (after the `lecturers` entry), before the `for` loop.

- [ ] **Step 2: Verify by deleting the DB and restarting**

```bash
rm -f assistum.db && npx tsx backend/src/mcp/server.ts &
sleep 2 && kill %1
sqlite3 assistum.db ".schema todos"
```

Expected: `source_link TEXT` and `resources TEXT` appear in the todos table schema.

- [ ] **Step 3: Commit**

```bash
git add backend/src/db/schema.ts
git commit -m "feat: add source_link and resources columns to todos table"
```

---

### Task 2: Extend `create_todo` and `update_todo` MCP tools

**Files:**
- Modify: `backend/src/mcp/tools/actions.ts:154-188` (create_todo)
- Modify: `backend/src/mcp/tools/actions.ts:194-242` (update_todo)

- [ ] **Step 1: Add parameters to `create_todo` tool schema**

In the `create_todo` tool registration, add two new Zod params after `course_id`:

```typescript
      source_link: z.string().optional().describe("URL to the origin (Moodle page, email reference)"),
      resources: z.string().optional().describe("JSON array of {title, url, summary?} for related files/links"),
```

- [ ] **Step 2: Update `create_todo` INSERT statement**

Replace the existing INSERT in the `create_todo` handler:

```typescript
      const id = uuid();
      db.prepare(
        `INSERT INTO todos (id, title, description, type, deadline, priority, course_id, source, source_link, resources)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'agent', ?, ?)`
      ).run(
        id,
        args.title,
        args.description ?? null,
        args.type,
        args.deadline ?? null,
        args.priority,
        args.course_id ?? null,
        args.source_link ?? null,
        args.resources ?? null,
      );
```

- [ ] **Step 3: Add parameters to `update_todo` tool schema**

In the `update_todo` tool registration, add two new Zod params after `course_id`:

```typescript
      source_link: z.string().optional().describe("URL to the origin (Moodle page, email reference)"),
      resources: z.string().optional().describe("JSON array of {title, url, summary?} for related files/links"),
```

- [ ] **Step 4: Update `update_todo` allowedFields**

Change the allowedFields array to include the new fields:

```typescript
      const allowedFields = ["title", "description", "type", "deadline", "priority", "completed", "course_id", "source_link", "resources"] as const;
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/mcp/tools/actions.ts
git commit -m "feat: add source_link and resources params to create_todo and update_todo MCP tools"
```

---

### Task 3: Pass new fields through REST API

**Files:**
- Modify: `backend/src/api/todos.ts:48-66` (POST handler)
- Modify: `backend/src/api/todos.ts:69-99` (PATCH handler)

- [ ] **Step 1: Update POST handler to accept new fields**

Change the destructuring in the POST handler (line 49):

```typescript
  const { title, type, description, deadline, priority, course_id, source, session_id, source_link, resources } = req.body;
```

Update the INSERT statement:

```typescript
  db.prepare(
    `INSERT INTO todos (id, title, description, type, deadline, priority, course_id, source, session_id, source_link, resources)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, title, description ?? null, type, deadline ?? null, priority ?? null, course_id ?? null, source ?? "user", session_id ?? null, source_link ?? null, resources ?? null);
```

- [ ] **Step 2: Update PATCH handler allowedFields**

Change the allowedFields array in the PATCH handler (line 77):

```typescript
  const allowedFields = ["title", "description", "type", "deadline", "priority", "completed", "course_id", "source_link", "resources"];
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/todos.ts
git commit -m "feat: pass source_link and resources through todos REST API"
```

---

### Task 4: Extend frontend Todo type

**Files:**
- Modify: `frontend/src/hooks/useTodos.ts:3-15`

- [ ] **Step 1: Add new fields to Todo type**

Add two fields to the `Todo` type after `created_at`:

```typescript
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
  session_id: string | null;
  created_at: string;
  source_link: string | null;
  resources: string | null;
};
```

- [ ] **Step 2: Add a helper type for parsed resources**

Add below the `Todo` type:

```typescript
export type TodoResource = {
  title: string;
  url: string;
  summary?: string;
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useTodos.ts
git commit -m "feat: add source_link and resources to frontend Todo type"
```

---

### Task 5: Render source link and resources in TodoPanel

**Files:**
- Modify: `frontend/src/components/TodoPanel.tsx:146-191`

- [ ] **Step 1: Add source link icon to todo row**

In the pending todo row (the `items.map` block inside `TodoPanel`), add a source link icon between the title `<span>` and the deadline badge. Replace the existing title span and deadline badge section:

```tsx
                        {/* Title */}
                        <span className="text-(--text-sm) font-medium text-ink flex-1 truncate">
                          {todo.title}
                        </span>

                        {/* Source link */}
                        {todo.source_link && (
                          <a
                            href={todo.source_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex-shrink-0 text-ink-muted hover:text-accent transition-colors duration-100"
                            title="Open source"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                              <path d="M8.914 6.025a.75.75 0 0 1 1.06 0 3.5 3.5 0 0 1 0 4.95l-2 2a3.5 3.5 0 0 1-5.054-4.838.75.75 0 0 1 1.06 1.06 2 2 0 0 0 2.934 2.718l2-2a2 2 0 0 0 0-2.83.75.75 0 0 1 0-1.06Zm1.172-2.95a3.5 3.5 0 0 1 0 4.95.75.75 0 0 1-1.06-1.06 2 2 0 0 0-2.934-2.718l-2 2a2 2 0 0 0 0 2.83.75.75 0 0 1-1.06 1.06 3.5 3.5 0 0 1 0-4.95l2-2a3.5 3.5 0 0 1 4.95 0l.104.088Z" />
                            </svg>
                          </a>
                        )}

                        {/* Deadline badge */}
                        {todo.deadline && (() => {
                          const dl = deadlineLabel(todo.deadline);
                          return (
                            <span
                              className={`text-(--text-xs) px-1.5 py-0.5 rounded flex-shrink-0 font-medium ${
                                dl.urgent
                                  ? "bg-danger/10 text-danger"
                                  : "text-ink-muted"
                              }`}
                            >
                              {dl.text}
                            </span>
                          );
                        })()}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/TodoPanel.tsx
git commit -m "feat: render source link icon in TodoPanel"
```

---

### Task 6: Render source link and resources in TodoDetail

**Files:**
- Modify: `frontend/src/components/TodoDetail.tsx`

- [ ] **Step 1: Add import for TodoResource type**

Add to the imports at the top:

```typescript
import {
  useTodo,
  useToggleTodo,
  useDeleteTodo,
  type TodoResource,
} from "../hooks/useTodos";
```

- [ ] **Step 2: Add source link to the metadata card**

In the metadata card grid (after the "Created" grid cell at line ~196), add a new grid cell:

```tsx
            {todo.source_link && (
              <div>
                <div className="text-(--text-xs) font-semibold text-ink-muted uppercase tracking-wider mb-1">
                  Source
                </div>
                <a
                  href={todo.source_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--text-sm) font-medium text-accent hover:underline flex items-center gap-1"
                >
                  Open source
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                    <path d="M8.914 6.025a.75.75 0 0 1 1.06 0 3.5 3.5 0 0 1 0 4.95l-2 2a3.5 3.5 0 0 1-5.054-4.838.75.75 0 0 1 1.06 1.06 2 2 0 0 0 2.934 2.718l2-2a2 2 0 0 0 0-2.83.75.75 0 0 1 0-1.06Zm1.172-2.95a3.5 3.5 0 0 1 0 4.95.75.75 0 0 1-1.06-1.06 2 2 0 0 0-2.934-2.718l-2 2a2 2 0 0 0 0 2.83.75.75 0 0 1-1.06 1.06 3.5 3.5 0 0 1 0-4.95l2-2a3.5 3.5 0 0 1 4.95 0l.104.088Z" />
                  </svg>
                </a>
              </div>
            )}
```

- [ ] **Step 3: Add resources section after the description card**

After the description card (line ~214), add a resources section:

```tsx
        {/* Resources */}
        {todo.resources && (() => {
          let parsed: TodoResource[] = [];
          try { parsed = JSON.parse(todo.resources); } catch { /* ignore */ }
          if (parsed.length === 0) return null;
          return (
            <div className="bg-surface rounded-(--radius-lg) border border-border-subtle p-5 mb-6">
              <div className="text-(--text-xs) font-semibold text-ink-muted uppercase tracking-wider mb-3">
                Resources ({parsed.length})
              </div>
              <div className="space-y-3">
                {parsed.map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-ink-muted mt-0.5 flex-shrink-0">
                      <path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 12.5 5H7.621a1.5 1.5 0 0 1-1.06-.44L5.439 3.44A1.5 1.5 0 0 0 4.378 3H3.5Z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-(--text-sm) font-medium text-accent hover:underline"
                      >
                        {r.title}
                      </a>
                      {r.summary && (
                        <p className="text-(--text-xs) text-ink-muted mt-0.5 leading-relaxed">
                          {r.summary}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/TodoDetail.tsx
git commit -m "feat: render source link and resources section in TodoDetail"
```

---

### Task 7: Rewrite plan-week skill (9 phases)

**Files:**
- Rewrite: `backend/src/skills/plan-week.md`

- [ ] **Step 1: Replace the entire plan-week.md with the new 9-phase version**

Write the following content to `backend/src/skills/plan-week.md`:

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

## Preferences

- Food: vegetarian. When recommending meals, pick vegetarian options.
- Home campus: assume the student commutes FROM central Munich.

## Phase 1: Lectures & Calendar

Tell the user: "Let me start by pulling your lecture schedule..."

1. Call `tum_calendar` to get iCal events.
2. Call `tum_lectures` to get enrolled courses.
3. For each lecture/event in the upcoming week:
   - Extract the room code from the iCal location field (e.g., "MW 0001", "MI HS1", "5602.EG.001")
   - Call `navigatum_search` with the room code to determine the campus location. If the result contains "Garching" in the address or parent building, mark it as Garching. Otherwise mark it as Stammgelände/city center.
   - Call `create_course` if the course doesn't exist yet
   - Call `create_event` with type "lecture", color "#3070b3", linked to the course. Include the resolved location (campus name) in the description.
4. Keep a mental map of which campus the student is on each day and at what times. You'll use this in Phase 2 and Phase 5.
5. Report: "Found N lectures across N courses this week. [X days in Garching, Y in city center]."

## Phase 2: Commute Blocks

Tell the user: "Adding travel time for your Garching days..."

For each day, look at the lecture locations from Phase 1:

1. If the FIRST lecture of the day is in Garching: create a 1-hour commute block BEFORE it. Call `create_event` with type "custom", color "#6b7280", title "Commute → Garching". The commute ends when the lecture starts.
2. If the student transitions between campuses during the day (Garching → city or city → Garching): create a 1-hour commute block between the last lecture at one campus and the first lecture at the other.
3. If the LAST event of the day is in Garching and the student needs to return to the city: create a 1-hour commute block AFTER the last Garching event, titled "Commute → City".
4. Do NOT add commute blocks between consecutive lectures on the same campus.

Report: "Added travel time for N Garching trips this week."

## Phase 3: Assignments & Moodle Deep Dive

Tell the user: "Now checking Moodle for assignments and course materials..."

1. Call `moodle_courses` to get enrolled Moodle courses.
2. Call `moodle_assignments` for upcoming deadlines.
3. For each course that has assignments due in the next 14 days:
   - Call `moodle_course_content` with the course's Moodle ID to find exercise sheets, lecture slides, and resources related to the assignment.
   - For important resources (PDFs, exercise sheets), call `moodle_fetch` on their URLs to extract a brief text summary (first 200 characters is fine).
   - Call `create_todo` with:
     - type: "assignment"
     - title: the assignment name
     - description: "For [Course Name]. [Brief description of what's expected based on the assignment details]"
     - deadline: the assignment due date (ISO 8601)
     - priority: due within 3 days = "high", within 7 = "medium", otherwise "low"
     - course_id: linked to the course
     - source_link: the Moodle assignment URL (e.g., "https://www.moodle.tum.de/mod/assign/view.php?id=XXXXX")
     - resources: JSON string array of related files, e.g., `[{"title": "Exercise Sheet 3", "url": "https://www.moodle.tum.de/mod/resource/view.php?id=123", "summary": "Covers topics: ..."}]`
4. Report: "You have N assignments coming up. I've linked the relevant course materials."

If Moodle is unavailable, say "Couldn't reach Moodle right now — I'll skip that" and continue.

## Phase 4: Email

Tell the user: "Checking your inbox for anything that needs attention..."

1. Call `tum_email_read` with limit 15, since_days 7.
2. Scan each email for actionable items: reply needed, meeting invites, deadlines, requests.
3. For each actionable email:
   - Check the email body for any explicit deadline or date mentioned (e.g., "please reply by Friday", "deadline: April 25").
   - Call `create_todo` with:
     - type: "email_action"
     - title: "Reply to [Sender Name] — [Subject]" or "Follow up — [Subject]" as appropriate
     - description: "From [sender]. [1-sentence summary of what action is needed]. Related to [course name] if identifiable."
     - deadline: the explicit deadline if found in the email, otherwise set to 2 days from now (ISO 8601)
     - priority: "high" if deadline is within 2 days, "medium" otherwise
     - source_link: use the format "mailto:[sender_email]?subject=Re: [subject]" so the link opens a reply draft
     - course_id: link to a course if the email is clearly about a specific course
4. Report: "Scanned N emails — N need replies (deadlines set)."

If email is unavailable, skip gracefully and continue.

## Phase 5: Canteen & Meals (Location-Aware)

Tell the user: "Let me check what's for lunch this week..."

Using the campus location map from Phase 1:

1. For each day that has lectures:
   - Determine where the student is around lunchtime (12:00-13:00). Use the campus of the lecture closest to noon.
   - If in Garching: call `canteen_menu` with location "mensa-garching"
   - If at Stammgelände: call `canteen_menu` with location "mensa-arcisstr"
2. From the menu, find a vegetarian option for that day. Look for items tagged as vegetarian or items that are clearly meat-free.
3. Call `create_event` with:
   - type: "meal", color "#f97316"
   - title: "Lunch @ Mensa Garching" or "Lunch @ Mensa Arcisstraße" depending on campus
   - description: include the vegetarian pick, e.g., "Veggie pick: Spinach Lasagna (€3.20)"
   - time: slot into the gap between morning and afternoon lectures. If no clear gap, use 12:00-13:00.
4. Report: "Added lunch breaks with veggie picks for N campus days."

## Phase 6: Club Events

Tell the user: "Checking your student club events..."

1. Call `club_events` to fetch from configured club URLs.
2. For any events happening in the upcoming week:
   - Call `create_event` with type "club", color "#a855f7"
3. Report what was found: "Added N club events — let me know if you want to remove any."

If no clubs are configured, skip silently.

## Phase 7: Weekly Summary & Conflicts

Tell the user: "Almost done — let me check for conflicts and summarize your week..."

1. Call `query_events` for the full Monday-Sunday range.
2. Call `query_todos` to get all pending todos.
3. Check for overlapping events (where one event's start < another's end and vice versa).
4. Deliver a summary that includes:
   - **Schedule overview**: "N lectures, N commute blocks, N lunch breaks, N club events"
   - **Todo summary**: group pending todos by type:
     - "Assignments: [list with deadlines]"
     - "Email replies: [list with deadlines]"
   - **Conflicts**: if any overlaps, describe each one clearly
   - **Observations**: note busy vs. free days, clusters, warnings about early mornings or late evenings

## Phase 8: Prep for Tomorrow

Tell the user: "Here's your briefing for tomorrow..."

Look at tomorrow's schedule and todos:

1. What's the first event? Note the time, location, and course.
2. If it's in Garching, calculate the departure time (event start minus 1 hour): "Leave by HH:MM for your HH:MM lecture in Garching."
3. What assignments or email replies are due tomorrow or the day after? List them.
4. Where is lunch? Note the mensa and the veggie pick.
5. Any resources to review or bring? Reference the todo resources.

Deliver this as a concise briefing paragraph, not a bullet list.

## Phase 9: Ad-Hoc Events

End with:

"That's your week planned! Do you have any personal events, hobbies, or time you'd like to block off? For example: gym sessions, study groups, social plans, or just downtime."

Wait for the user to respond. If they mention events, create them with appropriate types and colors. If they say they're good, wrap up.
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/skills/plan-week.md
git commit -m "feat: rewrite plan-week skill with 9 phases — location-aware, richer todos, email deadlines"
```

---

### Task 8: Create review-lectures skill

**Files:**
- Create: `backend/src/skills/review-lectures.md`

- [ ] **Step 1: Create the review-lectures skill file**

Write the following to `backend/src/skills/review-lectures.md`:

```markdown
---
name: review-lectures
description: Create review todos and schedule study blocks for each lecture this week
---

When the user asks to schedule lecture reviews, or after running plan-week:

## Step 1: Gather lectures and courses

1. Call `query_events` for the upcoming Monday-Sunday range with type "lecture".
2. Call `query_courses` to get course metadata (especially moodle_course_id).
3. Group lectures by course — each course gets ONE review todo per day it has a lecture.

## Step 2: Create review todos with materials

For each unique (course, day) pair:

1. If the course has a `moodle_course_id`, call `moodle_course_content` to find this week's materials (slides, readings, exercises posted recently).
2. Call `create_todo` with:
   - title: "Review: [Course Name] ([Day name])"
   - type: "revision"
   - description: "Review the [Day name] lecture for [Course Name]. Focus areas: [brief note from course content if available]."
   - deadline: if the lecture is in the morning (before 14:00), set deadline to end of the same day (23:59). If the lecture is in the afternoon, set deadline to end of the next day (23:59).
   - priority: "medium"
   - course_id: linked to the course
   - source_link: the Moodle course page URL if available (e.g., "https://www.moodle.tum.de/course/view.php?id=XXXXX")
   - resources: JSON string array of this week's materials, e.g., `[{"title": "Lecture 7 Slides", "url": "https://...", "summary": "Covers: dynamic programming, greedy algorithms"}]`

## Step 3: Schedule study blocks

1. Call `query_events` for the full week to see all events (including the ones just created).
2. For each review todo, find a free slot:
   - Prefer a slot on the SAME day as the lecture, after the lecture ends
   - If no same-day slot available, look for the next day
   - Each study block should be 1 hour
   - Avoid scheduling before 08:00 or after 21:00
   - Avoid overlapping with existing events (including commute blocks and meals)
3. Call `create_event` for each study block with:
   - type: "study", color "#22c55e"
   - title: "Review: [Course Name]"
   - course_id: linked to the course
   - description: "Scheduled review session. Materials linked in your todo list."

## Step 4: Report

Tell the user: "Created N review todos and scheduled N study blocks. Here's the breakdown:"

List each course with its review time. For example:
- "Linear Algebra (Monday) — review Tuesday 14:00-15:00"
- "Algorithms (Wednesday) — review Wednesday 17:00-18:00"

If some reviews couldn't be scheduled due to a packed week, mention it:
"Couldn't find a slot for [Course] — your [day] is packed. You might want to move something."
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/skills/review-lectures.md
git commit -m "feat: add review-lectures skill for post-planning lecture review scheduling"
```

---

### Task 9: Update demo script

**Files:**
- Modify: `docs/demo_script.md`

- [ ] **Step 1: Replace the demo script with the updated version**

Write the following to `docs/demo_script.md`:

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

## Act 1: The Cascade (~3 min)

**What you say to the audience:**
"Nico is a CS student at TUM. It's Sunday evening and he wants to plan his week. He opens AssisTUM and types one message."

**Type into chat:**
> Let's plan my next week

**What happens (what to point at):**
1. Chat shows "Pulling your lecture schedule..." — point at the calendar as lecture blocks appear (blue)
2. Chat shows "Adding travel time..." — point at gray commute blocks appearing before Garching lectures. Say: "It looked up each lecture room in TUM's building database and figured out which campus it's on. Now it's adding an hour of travel time before each Garching trip."
3. Chat shows "Checking Moodle..." — point at the todo panel as assignments appear WITH deadline badges. Say: "Each todo links back to the Moodle assignment and includes the exercise sheets."
4. Chat shows "Checking inbox..." — point at email todos appearing WITH deadlines (no more 'No deadline' section). Say: "It gives you 48 hours to reply unless the email has a specific deadline."
5. Chat shows "Checking lunch..." — point at orange lunch blocks. Say: "It picked the mensa closest to where you actually are — Garching on Garching days, Arcisstraße when you're in the city. And it picked a vegetarian option."
6. Chat shows "Club events..." — purple blocks if any
7. Agent delivers weekly summary with conflict warnings
8. Agent delivers "tomorrow's briefing" — point at this. Say: "It tells you exactly when to leave tomorrow and what to bring."
9. Agent asks about personal events/hobbies

**Talking points while agent works:**
- "It's pulling real data from 5 different university systems"
- "Every item you see is a real tool call to a real API"
- "It resolved lecture locations through TUM's room database"
- "The calendar and task list update in real-time"

**If something goes wrong:**
- Agent hangs > 30s: "The agent is making real API calls — sometimes TUM systems are slow" (buy time)
- One source fails: Agent should skip gracefully. Say: "It handles failures gracefully — notice it moved on"
- Nothing appears in calendar: Check that dates are correct week. Worst case, move to Act 2 manually.

---

## Act 2: Review Lectures (~1 min)

**What you say:**
"Now let's have it schedule review sessions for each lecture."

**Type into chat:**
> /review-lectures

**What happens:**
- Revision todos appear in the todo panel with linked Moodle materials
- Green study blocks appear on the calendar after each lecture
- Agent reports which courses got review slots

**Talking points:**
- "It created a review todo for each lecture and linked the relevant Moodle materials — click through to the slides"
- "It found free slots after each lecture to schedule the review"
- Point at a todo with resources: "See the linked resources? Those are the actual exercise sheets from Moodle with summaries."

---

## Act 3: The Personal Touch (~1 min)

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

## Act 4: The Intelligence (~1 min)

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

**Option C — Todo deep dive:**
Click on an assignment todo to show the detail view. Point out: the source link to Moodle, the linked resources with summaries, the deadline badge.

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
git commit -m "docs: update demo script with new planner features and review-lectures act"
```

---

## Verification

After all tasks are complete, run through this checklist:

- [ ] **Schema**: Delete `assistum.db`, restart backend, verify `source_link` and `resources` columns exist in todos table
- [ ] **MCP tools**: Start the MCP server, verify `create_todo` accepts `source_link` and `resources` parameters
- [ ] **REST API**: `curl -X POST http://localhost:3001/api/todos -H 'Content-Type: application/json' -d '{"title":"Test","type":"assignment","source_link":"https://moodle.tum.de/test","resources":"[{\"title\":\"Sheet 1\",\"url\":\"https://moodle.tum.de/sheet1\",\"summary\":\"Covers topic A\"}]"}'` — verify it returns with both fields populated
- [ ] **Frontend type**: No TypeScript errors when running `npx tsc --noEmit` in the frontend directory
- [ ] **TodoPanel**: Create a todo with source_link via curl, verify the link icon appears in the todo list
- [ ] **TodoDetail**: Click a todo with source_link and resources, verify both render correctly
- [ ] **Plan-week skill**: Run `/plan-week` in a session, verify all 9 phases execute
- [ ] **Review-lectures skill**: Run `/review-lectures` after planning, verify revision todos and study blocks appear
- [ ] **Demo flow**: Run through the full demo script (Acts 1-4) and verify timing
