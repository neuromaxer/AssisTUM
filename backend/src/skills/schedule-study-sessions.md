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
