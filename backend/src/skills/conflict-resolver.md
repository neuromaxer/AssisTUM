---
name: conflict-resolver
description: Detect and resolve overlapping calendar events
---

1. Call `query_events` to get all events in the relevant time range.
2. Check for overlapping time ranges.
3. Present each conflict to the user: "Event A (time) overlaps with Event B (time)".
4. Ask which to keep, remove, or reschedule.
5. Execute the user's choice with `delete_event` or `update_event`.
