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
