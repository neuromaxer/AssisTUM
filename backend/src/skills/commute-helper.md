---
name: commute-helper
description: Help plan commute to campus using live MVV data
---

1. Call `query_events` to find the next upcoming lecture/event.
2. Call `navigatum_search` with the event's location or building.
3. Call `mvv_departures` for the nearest station to campus
   (default: "Garching-Forschungszentrum").
4. Calculate when to leave based on departure times and
   a 10-minute walking buffer.
5. Tell the user: "Your [event] is at [time] in [building].
   The next U6 from [station] leaves at [time] — head out
   by [time] to make it comfortably."
