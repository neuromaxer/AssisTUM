# AssisTUM Features

## Moodle Integration

- **Automatic login via Shibboleth SAML** — users enter TUM ID + password, backend handles the full SSO dance (no manual token copying)
- **Browse enrolled courses** — fetch all courses the student is enrolled in
- **View assignments & deadlines** — pull upcoming deadlines from the Moodle calendar
- **Read course content** — browse course sections, activities, and resources
- **Read exercise sheets & lecture notes** — download and extract text from PDFs behind Moodle login (using pdf.js via unpdf)
- **Auto session refresh** — re-authenticates transparently when the Moodle session expires

## TUM Online Integration

- **One-click API token setup** — enter TUM ID, confirm via email, done
- **Lecture list** — fetch all enrolled lectures for the semester
- **Grades** — view TUM Online grades
- **Course sync** — import TUM Online courses into the local database

## TUM Calendar (iCal)

- **Schedule import** — paste iCal subscription URL to pull in all calendar events
- **Visual calendar** — full calendar view with time grid, color-coded event types
- **Drag-and-drop rescheduling** — move events by dragging them on the calendar

## TUM Email

- **Inbox monitoring** — read recent emails from TUM IMAP inbox (configurable timeframe and limit)
- **Send emails** — compose and send emails via TUM SMTP directly from the agent
- **Email-to-action** — agent can read emails and create todos/events from them

## Canteen / Mensa

- **Daily menu** — fetch the Mensa menu for any location and week (e.g. Mensa Garching)
- **Live occupancy** — check current headcount at a canteen before heading there
- **Dashboard lunch widget** — today's menu shown on the dashboard

## Public Transport (MVV)

- **Real-time departures** — check live departure times for any Munich transit station
- **Commute planning** — agent skill that combines MVV departures with NavigaTUM to plan your route to campus

## Study Rooms

- **Live availability** — check which study rooms are currently free (via ASTA API)
- **Find nearby rooms** — agent skill that searches for available rooms near a specific building

## Campus Navigation (NavigaTUM)

- **Room & building search** — search TUM rooms, buildings, and locations
- **Used by agent skills** — powers commute planning and study room discovery

## Student Clubs

- **Club event tracking** — configure club URLs, agent scrapes their event pages
- **Event integration** — club events can be added to the calendar

## Agent Skills (Slash Commands)

- **/plan-week** — 6-phase automated weekly planning: import lectures, pull Moodle assignments, scan emails, plan meals, check club events, resolve conflicts
- **/course-brainstorm** — discuss course prep strategy, fetch Moodle materials, create study sessions
- **/schedule-study-sessions** — find gaps in the calendar and schedule study blocks based on assignment deadlines
- **/conflict-resolver** — detect overlapping calendar events and suggest resolutions
- **/commute-helper** — plan commute using live MVV departures + NavigaTUM
- **/find-study-room** — find available study rooms near your location

## Dashboard

- **At-a-glance overview** — classes today, pending todos, upcoming events
- **Next up** — the 5 upcoming events
- **Today's lunch** — Mensa menu widget
- **Urgent todos** — deadlines that need attention

## Task Management

- **Todo list** — organized by deadline with priority badges (high/medium/low)
- **Completion tracking** — toggle todos as done
- **Course-linked tasks** — todos tied to specific courses
- **Assignment import** — Moodle assignments become todos automatically

## Deployment to Appx

AssisTUM can run as a managed project inside [Appx](https://github.com/neuromaxer/appx) — a self-hostable platform for hosting agentic applications. Appx handles TLS, authentication, subdomain routing, and egress control, so you get `assistum.<your-domain>` with zero infra work.

### Setup

1. Create project "assistum" in the Appx dashboard — note the assigned port (e.g., 10000)
2. Copy the assistum codebase into the Appx project directory (`<ProjectRoot>/assistum/`)
3. Build: `npm install && npm run build -w frontend && npm run build -w backend`
4. Start: `task start:appx APPX_PORT=<assigned_port>`
5. Access at `assistum.<baseDomain>`

The `start:appx` task launches Express (serving both API and frontend) on the assigned port and a dedicated OpenCode instance on port 4097. Appx proxies all subdomain traffic to Express. Local dev (`task dev`) is unaffected — it uses separate ports and the default `.env`.
