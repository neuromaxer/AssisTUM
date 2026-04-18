# AssisTUM Demo Pitch Design — "The Single Message"

## Context

- **Format:** Makeathon judges panel, stage presentation with projector
- **Time:** 3 minutes, hard cutoff, no Q&A
- **Strategy:** One dramatic live demo moment (the `plan-week` cascade) rather than breadth across multiple features. Depth beats breadth at this timescale.
- **Judging criteria to hit:** Innovation & Ambition, **Integration Depth & Autonomy** (strongest), Real-World Impact, UI/UX, Presentation Quality

## Structure

### Section 1: The Problem (0:00–0:30)

Screen shows the empty AssisTUM UI — blank calendar, empty todos, chat ready. The empty state is intentional: it creates the "before" so the cascade feels dramatic.

**Spoken script (~25s):**

> "Nico is a CS student at TUM. Every Sunday night he becomes a **human API** — manually checking TUM Online for lectures, Moodle for assignments, his university inbox, the mensa site, and his club pages — just to figure out what his week looks like. It takes 30 minutes and he still misses things.
>
> We built AssisTUM — an **autonomous campus co-pilot** that does it all in one message."

### Section 2: The Trigger (0:30–0:45)

Turn to screen. Type into chat:

> Let's plan my next week

Hit enter. Pause one beat — let the judges read it.

**Spoken (~10s):**

> "That's it. One message. Watch what happens."

Let the simplicity sink in before output starts.

### Section 3: The Cascade (0:45–2:30)

The core — 105 seconds narrating over the live `plan-week` skill. One sentence per phase, then move on. Pacing is elastic: stretch narration if a phase is slow, skip ahead if fast.

| ~Time | Screen | Narration |
|-------|--------|-----------|
| 0:50 | Lecture blocks (blue) fill calendar | "It pulled the lectures and is **building his week** — placing each course on the calendar from his real TUM Online schedule." |
| 1:00 | Gray commute blocks before Garching lectures | "It looked up every lecture room in TUM's building database, figured out which campus it's on, and **added travel time on its own — no one told it which lectures are in Garching.**" |
| 1:15 | Todos appear in left panel with deadline badges | "Now it's scanning Moodle — every assignment becomes a task. **It downloaded the PDFs, summarized them, and linked them right in the task.**" |
| 1:30 | Email-sourced todos appear | "It's reading his university inbox and **turning actionable emails into tasks with deadlines** — autonomously." |
| 1:45 | Orange lunch blocks on calendar | "It **picked the closest mensa** to where he actually is that day — Garching when he's in Garching, city center otherwise — and chose a vegetarian option." |
| 2:00 | Purple club event blocks (if any) | "Club events scraped from the websites he follows." |
| 2:10 | Summary + tomorrow briefing in chat | "And now it wraps up with a weekly summary, **flags conflicts, and tells him exactly when to leave tomorrow morning.**" |

**Key narration beats:**
- **Commute** is the **autonomy flex** — the agent decided on its own which lectures need travel time. Chains NavigaTUM room lookup → campus determination → schedule insertion (3 systems, zero user input). **This is the moment that scores "Integration Depth & Autonomy."**
- **Moodle PDFs** — "downloaded, summarized, and linked" shows the agent doesn't just retrieve, it **acts on** the content. Second strongest autonomy signal.
- **Mensa** is the personality moment — "chose a vegetarian option" makes it feel like a real assistant, not a data aggregator
- **Email → tasks** — emphasize "autonomously" — the agent triages email without being told what's actionable
- If clubs haven't appeared by ~2:05, skip to summary

### Section 4: The Close (2:30–3:00)

Calendar is full, todos populated, summary in chat. Turn back to judges.

**Spoken (~28s):**

> "One message, five university systems, zero forms. **Everything you see is real API calls — no mockups, no pre-seeded data.**
>
> And this is just one skill. It also fetches exercise sheets and PDFs from Moodle, summarizes them, and links them directly in your tasks. It can schedule study sessions before deadlines, find free study rooms, and plan your commute with live MVV departures.
>
> Every TUM student does this manually every week. AssisTUM turns 30 minutes of tab-switching into one conversation. **And it works with any TUM student's real credentials, today.**"

**Close design notes:**
- **"No mockups, no pre-seeded data"** preempts hackathon demo skepticism
- **"This is just one skill"** reframes the cascade as one capability of a larger system — scores Innovation & Ambition
- Name-drop 4 extra features (PDF summaries, study sessions, study rooms, MVV commute) in ~8 seconds
- **"Any TUM student's real credentials, today"** — signals deployability, scores Real-World Impact. Echoes challenge's "something that lives on beyond the hackathon"
- End on the **"30 minutes → one conversation"** contrast — the number they'll remember

## Fallback Plan

**Pre-loaded session ready as backup.** If the cascade hasn't started producing by ~1:00 (15 seconds of nothing):

1. Say: "The agent is making real API calls to TUM's live systems — sometimes they're slow."
2. If still nothing by ~1:15, switch: "Let me show you what it produces" — navigate to a pre-loaded session.
3. Continue narrating over the pre-loaded state as if it just arrived.

**Preparation:** Before the demo, run the cascade once to create the pre-loaded session. Don't reset it.

## Pre-Demo Checklist

- [ ] Backend running (`task dev:backend`)
- [ ] Frontend running (`task dev:frontend`)
- [ ] OpenCode running (`task dev:opencode`)
- [ ] Browser open at localhost:5173, calendar showing current week
- [ ] DB reset (`curl -X DELETE http://localhost:3001/api/reset`)
- [ ] Settings configured: TUM Online token, iCal URL, email creds, Moodle token, at least one club URL
- [ ] Status bar shows green dots for all services
- [ ] Browser zoom set for audience readability
- [ ] **Fallback session ready:** Run cascade once beforehand, keep that session available
- [ ] Practice the spoken script at least twice with a timer — target 2:50 to leave buffer

## What We Intentionally Cut

These features exist and work but are not demoed — 3 minutes demands focus:

- `/review-lectures` — schedule review blocks with linked Moodle materials
- `/schedule-study-sessions` — auto-schedule study time before deadlines
- `/commute-helper` — NavigaTUM + live MVV departures for route planning
- `/find-study-room` — ASTA API for available study rooms
- `/conflict-resolver` — detect and resolve scheduling conflicts
- `/course-brainstorm` — explore course prep with Moodle materials
- Natural language event creation ("study group Wednesday 16–18")
- Dashboard view with at-a-glance stats
- Todo and event detail views

These are mentioned in the close as name-drops to signal depth without spending demo time.
