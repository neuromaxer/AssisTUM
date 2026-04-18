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
