---
name: schedule-study-sessions
description: Schedule study blocks based on assignment deadlines and calendar availability
---

Help the student schedule study time:

1. Ask about their workload preferences (hours per day, preferred study times).
2. Call `moodle_course_content` for relevant courses to understand prep needed.
3. Call `query_events` to find free time slots in the week.
4. Call `query_todos` to see upcoming deadlines.
5. Propose study blocks distributed before deadlines.
6. Once agreed, call `create_event` for each study session with type "study" and color "#22c55e".
