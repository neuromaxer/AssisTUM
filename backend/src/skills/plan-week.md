---
name: plan-week
description: Plan the student's upcoming week by fetching all data sources and populating the calendar and todo list
---

You are planning a student's week. Follow these steps:

1. **Fetch lectures:** Call `tum_lectures` to get enrolled lectures. For each lecture, call `create_event` with type "lecture" and color "#3070b3".

2. **Fetch calendar:** Call `tum_calendar` to get iCal events. For each event not already added as a lecture, call `create_event` with the appropriate type.

3. **Fetch Moodle data:** Call `moodle_courses` to get enrolled courses. For each course, call `create_course`. Then call `moodle_assignments` to get deadlines. For each assignment, call `create_todo` with type "assignment" and link to the course.

4. **Fetch emails:** Call `tum_email_read` to get recent emails. Summarize important emails and create `email_action` todos for any that need a response.

5. **Fetch canteen menus:** Call `canteen_menu` for the student's preferred canteen. Suggest lunch events between lectures.

6. **Fetch club events:** Call `club_events`. For each relevant event, call `create_event` with type "club" and color "#a855f7".

7. **Detect conflicts:** Call `query_events` for the week. Check for overlapping events. Report any conflicts to the user and suggest resolutions.

8. **Summarize:** Tell the user what you've added: N lectures, N todos, N lunch suggestions, any conflicts found.

Important:
- Use `create_event` and `create_todo` tool calls for every item — these persist to the database and show in the UI immediately.
- Set appropriate colors: lectures blue (#3070b3), study green (#22c55e), meals orange (#f97316), clubs purple (#a855f7).
- Link todos and events to courses via course_id when applicable.
- Set todo priorities: assignments due within 3 days = high, within 7 days = medium, else low.
