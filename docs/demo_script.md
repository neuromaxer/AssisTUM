# AssisTUM Demo Script

## Pre-Demo Checklist (5 min before)

- [ ] Backend running (`task dev:backend`)
- [ ] Frontend running (`task dev:frontend`)
- [ ] OpenCode running (`task dev:opencode` or via OPENCODE_URL)
- [ ] Browser open at localhost:5173, calendar showing current week
- [ ] DB is clean — no stale events/todos from previous runs
- [ ] Settings configured: TUM Online token, iCal URL, email creds, Moodle token, at least one club URL
- [ ] Status bar shows green dots for all services
- [ ] Browser zoom set so audience can read the chat + calendar

## Reset Between Runs

```bash
curl -X DELETE http://localhost:3001/api/reset
```

---

## Act 1: The Cascade (~2.5 min)

**What you say to the audience:**
"Nico is a CS student at TUM. It's Sunday evening and he wants to plan his week. He opens AssisTUM and types one message."

**Type into chat:**
> Let's plan my next week

**What happens (what to point at):**
1. Chat shows "Pulling your lectures..." — point at the calendar as lecture blocks appear (blue)
2. Chat shows "Checking Moodle..." — point at the todo panel as assignments appear with deadlines
3. Chat shows "Checking inbox..." — todo panel gets email action items
4. Chat shows "Checking lunch..." — orange lunch blocks appear between lectures
5. Chat shows "Club events..." — purple blocks if any
6. Agent delivers summary with conflict warnings

**Talking points while agent works:**
- "It's pulling real data from 5 different university systems"
- "Every item you see appearing is a real tool call to a real API"
- "The calendar and task list update in real-time"

**If something goes wrong:**
- Agent hangs > 30s: "The agent is making real API calls — sometimes TUM systems are slow" (buy time)
- One source fails: Agent should skip gracefully. Say: "It handles failures gracefully — notice it moved on"
- Nothing appears in calendar: Check that dates are correct week. Worst case, move to Act 2 manually.

---

## Act 2: The Personal Touch (~1 min)

**What you say:**
"But Nico also has things the university doesn't know about."

**Type into chat:**
> I have a study group for Linear Algebra on Wednesday from 16:00 to 18:00, and I want to go to Mensa Garching for lunch on Tuesday

**What happens:**
- Agent creates both events, you see them pop up on the calendar
- Agent may notice a conflict with the study group and mention it

**Talking point:**
"It understands natural language — no forms, no dropdowns. Just tell it what you need."

---

## Act 3: The Intelligence (~1 min)

**What you say:**
"Now Nico has a busy week. He asks for help studying."

**Type into chat:**
> Can you schedule study sessions before my deadlines?

**What happens:**
- Agent looks at free time + deadlines
- Proposes study blocks
- After you say "looks good", green study blocks appear on the calendar

**Talking point:**
"It reasons about your workload and finds the right time slots automatically."

---

## Bonus (if time allows, pick one):

**Option A — Commute:**
> How do I get to my first lecture tomorrow?

Agent checks NavigaTUM + live MVV departures, tells you which U-Bahn to take and when to leave.

**Option B — Quick question:**
> What's for lunch at Mensa Garching on Thursday?

Agent already has the canteen data, gives a quick answer.

---

## Emergency Fallbacks

**If OpenCode won't start:**
Pre-seed the DB with events/todos via curl, demo the UI and explain the agent architecture. "Let me show you what it produces" (show pre-populated state).

**If all APIs fail:**
Have a pre-seeded DB backup ready:
```bash
cp assistum-demo-backup.db assistum.db
```
Then restart the backend.

**If agent is too slow:**
Narrate over it: "While it's working — what's happening under the hood is..." and explain the MCP architecture. The agent will catch up.

**If agent creates wrong dates:**
This is the most likely bug. If events appear outside the visible week, click "next week" on the calendar and say "there they are."
