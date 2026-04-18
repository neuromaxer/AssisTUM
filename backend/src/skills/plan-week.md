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
