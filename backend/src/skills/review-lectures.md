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
