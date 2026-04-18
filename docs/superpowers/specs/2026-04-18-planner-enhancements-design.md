# Planner Enhancements Design

## Context

The plan-week skill is the core demo flow for AssisTUM. It currently runs 6 phases (lectures, moodle assignments, email, canteen, clubs, summary) but lacks location awareness, rich todo metadata, email deadlines, and lecture review scheduling. These enhancements make the planning cascade smarter and the demo more impressive.

## Changes Overview

1. **Schema**: Add `source_link` and `resources` columns to todos table
2. **plan-week skill**: Rewrite from 6 to 9 phases with location-aware logic
3. **review-lectures skill**: New skill for post-planning lecture review scheduling
4. **MCP tool**: Extend `create_todo` to accept `source_link` and `resources`
5. **Frontend**: Update TodoPanel to render links and resources
6. **Demo script**: Update to reflect new flow

---

## 1. Schema Change: Todos Table

Add two columns to the `todos` table:

```sql
source_link  TEXT     -- URL to origin (Moodle assignment page, email reference)
resources    TEXT     -- JSON string stored in SQLite, parsed as array in frontend: [{ title: string, url: string, summary?: string }]
```

### Files to modify
- `backend/src/db/schema.ts` — add columns to CREATE TABLE
- `backend/src/mcp/tools/actions.ts` — add `source_link` and `resources` to `create_todo` and `update_todo` tool parameters
- `backend/src/api/todos.ts` — pass new fields through REST API
- `frontend/src/hooks/useTodos.ts` — extend `Todo` type

### MCP tool changes

`create_todo` gains:
- `source_link` (string, optional) — URL back to origin
- `resources` (string, optional) — JSON string of `[{ title, url, summary? }]`

`update_todo` gains the same two optional fields.

---

## 2. Rewritten plan-week Skill (9 Phases)

File: `backend/src/skills/plan-week.md`

### Phase 1: Lectures & Calendar
- Call `tum_calendar` for iCal events
- Call `tum_lectures` for enrolled courses
- For each lecture in the upcoming week:
  - Extract room code from iCal location
  - Call `navigatum_search` with the room code to resolve campus (Garching vs Stammgelande vs other)
  - Call `create_course` if course doesn't exist
  - Call `create_event` (type "lecture", color "#3070b3", linked to course)
  - Track per-day campus locations for later phases
- Report: "Found N lectures across N courses. [X days in Garching, Y in city center]"

### Phase 2: Commute Blocks
- For each day's lectures, determine campus transitions:
  - If first lecture of the day is in Garching: add 1hr travel block before it ("Commute to Garching", type "custom", color "#6b7280")
  - If transitioning from Garching to Stammgelande (or vice versa) within the same day: add 1hr travel block between them
  - Skip commute blocks between consecutive same-campus lectures
- Report: "Added travel time for N Garching trips"

### Phase 3: Assignments & Moodle Deep Dive
- Call `moodle_courses` for enrolled courses
- Call `moodle_assignments` for deadlines
- For each course with assignments, call `moodle_course_content` to find exercise sheets and resources
- For key resources (PDFs, exercise sheets), call `moodle_fetch` to extract text summaries
- Call `create_todo` for each assignment:
  - type: "assignment"
  - priority: due within 3 days = high, 7 days = medium, else low
  - course_id: linked to course
  - source_link: Moodle assignment page URL
  - resources: array of `{ title, url, summary }` for related files
  - description: richer text referencing the course name and what's expected
- Report: "You have N assignments coming up with resources linked"

### Phase 4: Email
- Call `tum_email_read` (limit 15, since_days 7)
- For each actionable email, call `create_todo`:
  - type: "email_action"
  - title: includes sender + subject
  - deadline: check email body for explicit deadlines; if none found, set to +2 days from now
  - source_link: reference to email (e.g., "email:MESSAGE_ID" or subject-based reference)
  - description: brief summary of what action is needed, referencing the course if identifiable
- Report: "Scanned N emails — N need replies (deadlines set)"

### Phase 5: Canteen & Meals (Location-Aware)
- For each day with lectures, determine the primary campus location from Phase 1
- Garching days: call `canteen_menu("mensa-garching")`
- Stammgelande days: call `canteen_menu("mensa-arcisstr")`
- Mixed days: use the campus where the student is during lunchtime
- Find a vegetarian option from the menu for each day
- Call `create_event`:
  - type: "meal", color "#f97316"
  - title: "Lunch @ Mensa [Location]"
  - description: include the vegetarian pick (e.g., "Veggie pick: Spinach Lasagna")
  - time: slot into gap between lectures, or 12:00-13:00 default
- Report: "Added lunch breaks with veggie picks for N campus days"

### Phase 6: Club Events
- Call `club_events` for configured club URLs
- For events in the upcoming week, call `create_event` (type "club", color "#a855f7")
- Report what was found: "Added N club events — let me know if you want to remove any"
- If no clubs configured, skip silently

### Phase 7: Weekly Summary & Conflicts
- Call `query_events` for the full week
- Call `query_todos` for all pending todos
- Detect overlapping events
- Deliver summary:
  - Schedule overview: N lectures, N commute blocks, N meals, N club events
  - Todo summary: all pending items grouped by type (assignments, email actions) with deadlines
  - Conflict warnings if any overlaps found
  - Observations about the week (busy/free days, clusters)

### Phase 8: Prep for Tomorrow
- Look at tomorrow's events (first event, key deadlines)
- Note:
  - Location and departure time if Garching ("Leave by 07:15 for 08:15 lecture in Garching")
  - What to bring: any assignments due tomorrow or next day, resources to review
  - Lunch location
- Deliver as a concise "Tomorrow" card

### Phase 9: Ad-Hoc Events Prompt
- End with: "Do you have any personal events, hobbies, or time you'd like to block off this week?"
- Wait for user response, then create events accordingly

---

## 3. New Skill: review-lectures

File: `backend/src/skills/review-lectures.md`

Invoked separately after plan-week (via `/review-lectures` in chat).

### Workflow
1. Call `query_events` for the week, filter to type "lecture"
2. Call `query_courses` to get course metadata
3. For each unique lecture (deduplicate by course):
   - Call `moodle_course_content` if Moodle course ID is available to find this week's materials
   - Call `create_todo`:
     - title: "Review: [Course Name] ([Day])"
     - type: "revision"
     - deadline: end of same day (morning lectures) or end of next day (afternoon lectures)
     - course_id: linked to course
     - source_link: Moodle course page URL if available
     - resources: week's materials (slides, readings) from moodle_course_content
4. Call `query_events` to find free slots after each lecture (same or next day)
5. Create study events (type "study", color "#22c55e") in free slots, one per review
6. Report: "Created N review todos and scheduled study blocks for them"

---

## 4. Frontend: TodoPanel Changes

File: `frontend/src/components/TodoPanel.tsx`

### source_link rendering
- If `source_link` is present, render a small external-link icon next to the todo title
- Clicking it opens the URL in a new tab
- For email references (prefixed "email:"), render a mail icon instead

### resources rendering
- If `resources` array is non-empty, show a collapsed "N resources" indicator
- On expand: list each resource as a clickable title with summary text below
- Styling: subtle, doesn't dominate the todo card. Small text, indented under description.

### description rendering
- Descriptions are now richer (referencing course names, action needed)
- Render as-is, no markdown parsing needed for demo

---

## 5. Demo Script Updates

File: `docs/demo_script.md`

### Act 1 updates
- Point out commute blocks appearing before Garching lectures
- Point out location-aware lunch (Garching vs Arcisstraße)
- Point out vegetarian picks in lunch descriptions
- Point out email todos now have deadlines (no more "No deadline" section)
- Talking point: "It resolved lecture locations through TUM's room database and planned travel time automatically"

### New Act (after Act 1, before current Act 2): Review Lectures
- Type: `/review-lectures`
- What happens: green study blocks appear, revision todos with resources show up
- Talking point: "It scheduled review sessions after each lecture and linked the relevant Moodle materials"

### Act 3 (was Act 2): The Personal Touch
- Unchanged

### Act 4 (was Act 3): The Intelligence
- Unchanged (schedule study sessions for deadlines)

### Updated talking points
- "It knows which campus you're on and plans lunch and travel accordingly"
- "Every todo links back to its source — click through to Moodle or the email"
- "Tomorrow's briefing tells you exactly when to leave and what to bring"

---

## Verification

### Schema
- Reset DB, verify new columns exist
- Create a todo via API with source_link and resources, verify it round-trips

### Plan-week skill
- Run `/plan-week` in a session
- Verify: commute blocks appear before Garching lectures
- Verify: lunch events reference correct mensa based on campus
- Verify: email todos have deadlines (not "No deadline")
- Verify: assignment todos have source_link and resources populated
- Verify: Phase 8 "prep for tomorrow" summary appears
- Verify: Phase 9 prompt for ad-hoc events appears

### Review-lectures skill
- Run `/review-lectures` after planning
- Verify: revision todos created for each lecture
- Verify: study event blocks appear in free slots
- Verify: resources linked from Moodle

### Frontend
- Click source_link on a todo — should open Moodle/email reference
- Expand resources on a todo — should show files with summaries
- Email todos should show deadline badges (no longer in "No deadline" bucket)

### Demo flow
- Run full demo script Acts 1-4
- Verify timing fits within ~5 min total
