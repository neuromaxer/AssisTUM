---
name: course-brainstorm
description: Discuss course prep strategy and create study sessions
---

1. Call `query_courses` to find the course.
2. Call `moodle_course_content` for the course materials.
3. Call `query_todos` filtered by the course to see existing tasks.
4. Discuss with the user: what topics to focus on, estimated hours needed, preferred schedule.
5. Once agreed, call `create_event` for each study session linked to the course.
