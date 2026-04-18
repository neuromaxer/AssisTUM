# Chat Experience Improvements — Design Spec

## Problem

The current chat is a minimal text-in/text-out interface. Messages are sent synchronously (blocking UI until response), displayed as plain text (no markdown), tool calls are invisible, sessions are lost on reload, and skills are not invocable from the UI. This makes the agent feel slow, opaque, and stateless.

## Goals

1. **Auto-expanding input** — textarea that grows with content, supports multiline
2. **Markdown rendering** — rich text in assistant messages
3. **Streaming + tool call display** — real-time SSE streaming with visible tool call cards
4. **Session persistence** — continue conversations across reloads, switch between sessions
5. **Skills invocation** — one-click skill chips to trigger predefined workflows

## Non-Goals

- Character-by-character text streaming animation (chunk-level is fine)
- Permission/question docks (the reference project has these but assistum doesn't need them)
- Slash-command palette for skills (chips only)
- Markdown rendering for user messages (assistant only)

---

## Architecture

### Data Flow

```
User types → sendMessage() → POST /session/:id/message/async → 204

OpenCode agent processes → emits events via global stream

GET /api/agent/events (SSE proxy) → EventSource on frontend
  → reducer dispatches: message.updated, message.part.updated,
    message.part.delta, session.status, etc.
  → React re-renders ChatPanel

On SSE reconnect → GET /session/:id/messages → replay into reducer (idempotent via upsertById)
```

### Component Tree

```
ChatPanel.tsx (modified)
├── SessionPicker.tsx (new) — dropdown in header
├── Message rendering loop
│   ├── Markdown.tsx (new) — for assistant text parts
│   └── ToolCallCard.tsx (new) — for tool parts
├── SkillBar.tsx (new) — chip row above input
└── <textarea> (replaces <input>)

Hooks:
├── useAgentStream.ts (new, replaces useAgent.ts)
│   ├── lib/agent-core/reducers.ts (new)
│   └── lib/agent-core/types.ts (new)
└── useSkills.ts (new)

Backend:
├── api/agent.ts (modified) — add list/delete session endpoints
└── api/skills.ts (new) — list/invoke skills

Types:
└── types/agent.ts (new) — Message, Part, Event wire types
```

---

## Feature 1: Auto-expanding Textarea

**File:** `frontend/src/components/ChatPanel.tsx`

Replace `<input type="text">` with `<textarea rows={1}>`. Add:

- `useRef<HTMLTextAreaElement>` and a `useEffect` that runs on every `input` change:
  ```
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 200) + "px";
  ```
- `onKeyDown`: Enter submits (calls handleSubmit, prevents default). Shift+Enter inserts newline (default behavior).
- Tailwind classes: keep existing input classes, add `resize-none max-h-[200px] overflow-y-auto`.

No new dependencies. No backend changes.

---

## Feature 2: Markdown Rendering

**New dependency:** `marked`, `dompurify`, `@types/dompurify` in frontend.

**New file:** `frontend/src/components/Markdown.tsx`

Adapted from `/Users/max/misc/pj/appx/web/src/components/Markdown.tsx`:

- `useMemo`: parse with `marked.parse(text, { async: false })`, sanitize with `DOMPurify.sanitize()`.
- `useEffect`: after render, find `<pre>` elements in the container, inject a "Copy" button positioned absolute top-right. On click, copy code text to clipboard, show "Copied!" for 2s.
- Global styles injected once via `document.head.appendChild(style)`, scoped to `.assistum-markdown`.

**CSS variable mapping** (reference → assistum):
| Reference | Assistum |
|-----------|----------|
| `var(--text)` | `var(--color-ink)` |
| `var(--surface)` | `var(--color-surface)` |
| `var(--border)` | `var(--color-border)` |
| `var(--muted)` | `var(--color-ink-muted)` |
| `var(--cyan)` | `var(--color-accent)` |
| `var(--bg)` | `var(--color-page)` |

Font: `var(--font-sans)` for body text, `var(--font-mono)` for code blocks. Text sizes use project tokens (`--text-sm`, `--text-xs`).

**ChatPanel change:** Assistant message content renders via `<Markdown text={...} />` instead of a plain `<p>` tag. User messages remain plain text with `whitespace-pre-wrap`.

---

## Feature 3: Streaming + Tool Call Display

### Frontend Types

**New file:** `frontend/src/types/agent.ts`

Minimal types matching the SSE wire format (no SDK import):

```ts
interface Message {
  id: string;
  role: "user" | "assistant";
  parentID?: string;
  sessionID: string;
  createdAt: string;
  error?: unknown;
}

type Part = TextPart | ToolPart;

interface TextPart {
  id: string;
  type: "text";
  messageID: string;
  text: string;
}

interface ToolPart {
  id: string;
  type: "tool";
  messageID: string;
  tool: string;
  callID: string;
  state: {
    status: "pending" | "running" | "completed" | "error";
    title?: string;
    output?: string;
    error?: string;
  };
}

interface AgentEvent {
  type: string;
  properties: Record<string, unknown>;
}

// SSE wire format wraps events in GlobalEvent
interface GlobalEvent {
  directory: string;
  payload: AgentEvent;
}
```

### Session State

**New file:** `frontend/src/lib/agent-core/types.ts`

```ts
interface SessionState {
  messages: Message[];
  parts: Record<string, Part[]>;  // messageID → parts
  status: "idle" | "running" | "error";
  error: string | null;
}

const initialSessionState: SessionState = {
  messages: [],
  parts: {},
  status: "idle",
  error: null,
};
```

### Reducer

**New file:** `frontend/src/lib/agent-core/reducers.ts`

Adapted from `/Users/max/misc/pj/appx/web/src/lib/agent-core/reducers.ts`. Stripped of permission/question/todo handling.

Handles these event types:
- `message.updated` — upsert message by id
- `message.removed` — remove message + its parts
- `message.part.updated` — upsert part into parts[messageID]
- `message.part.removed` — remove part from parts[messageID]
- `message.part.delta` — append delta text to existing part (create stub if missing)
- `session.status` — set status to running/idle based on `status.type`
- `session.idle` — set status to idle
- `session.error` — set status to error, store error message
- `__reset` — return initialSessionState

Helper functions: `upsertById`, `removeById`, `findIndex` — same as reference.

### Streaming Hook

**New file:** `frontend/src/hooks/useAgentStream.ts`

Replaces `useAgent.ts`. Manages:

- **State:** `useReducer(reducer, initialSessionState)`
- **Session ID:** stored in state, persisted to `localStorage` key `assistum:sessionId`
- **EventSource:** opens to `/api/agent/events` on mount. Parses each SSE `data` line as JSON (`GlobalEvent`), unwraps `payload`, filters by active `sessionId`, dispatches to reducer.
- **Reconnection:** on EventSource `open` event (reconnect), fetch `GET /api/agent/session/:id/messages` and replay all messages + parts into reducer. `upsertById` makes this idempotent.
- **sendMessage(text):** lazily creates session if needed (POST `/api/agent/session`), then POST `/api/agent/session/:id/message/async`. Fire-and-forget — the user message arrives via SSE.
- **createSession():** POST `/api/agent/session`, set new session ID, dispatch `__reset`.
- **setSessionId(id):** switch to existing session, dispatch `__reset`, trigger message re-fetch.

Exposed API:
```ts
{
  state: SessionState;
  sessionId: string | null;
  setSessionId: (id: string) => void;
  createSession: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  connectionStatus: "disconnected" | "connecting" | "connected";
}
```

### Tool Call Card

**New file:** `frontend/src/components/ToolCallCard.tsx`

Adapted from `/Users/max/misc/pj/appx/web/src/components/ToolCallCard.tsx`, restyled with Tailwind classes.

- Collapsible card with `useState(isRunning || isError)` for initial open state.
- Header: tool name (or `state.title` if available), status badge (color-coded), toggle arrow.
- Body (when expanded): output as `<pre>` for completed, error text for error, "Running..." for running.
- Status colors: `text-success` (done), `text-warning` (running with `animate-spin` spinner), `text-danger` (error), `text-ink-muted` (pending).
- Card styling: `border border-border rounded-(--radius-md) overflow-hidden my-1`.

### ChatPanel Refactor

**Modified file:** `frontend/src/components/ChatPanel.tsx`

- Import `useAgentStream` instead of `useAgent`.
- Group messages into turns: `Turn { user: Message, assistants: Message[] }` using `parentID` linkage.
- Render each message's parts from `state.parts[msg.id]`:
  - `type === "text"` → `<Markdown text={part.text} />`
  - `type === "tool"` → `<ToolCallCard part={part} />`
  - Other types → skip
- Loading: show pulsing indicator when `state.status === "running"` (not a boolean flag).
- Auto-scroll: pin to bottom when user is near bottom (within 80px), re-pin on send.

### Backend Changes

**Modified file:** `backend/src/api/agent.ts`

Add two endpoints:

```
GET /session — list all sessions
  → client.session.list() → res.json(result.data)

DELETE /session/:id — delete a session
  → client.session.delete({ path: { id } }) → res.status(204).end()
```

---

## Feature 4: Session Persistence

### Frontend Hook (already in useAgentStream)

- On mount, read `sessionId` from `localStorage`. If found and valid, load messages.
- On `sessionId` change, write to `localStorage`, dispatch `__reset`, fetch messages.
- `createSession()` and `setSessionId()` exposed for the picker.

### Session Picker

**New file:** `frontend/src/components/SessionPicker.tsx`

Compact dropdown in the chat panel header:

- Fetches sessions via `GET /api/agent/session` using React Query (`useQuery`).
- Shows current session title (from OpenCode `Session.title` field) or "Untitled" + truncated ID.
- Click to expand dropdown listing all sessions.
- Click session to switch (`setSessionId`).
- "+ New" button calls `createSession()`.
- Delete button (×) on each session calls `DELETE /api/agent/session/:id`.
- Styled with existing design tokens: `bg-surface`, `border-border`, `text-(--text-xs)`, active session highlighted with `border-accent`.

### ChatPanel Change

Add `<SessionPicker>` at the top of ChatPanel, above the messages area.

---

## Feature 5: Skills Invocation

### Backend

**New file:** `backend/src/api/skills.ts`

Two endpoints:

**GET /skills** — list available skills
- Read `backend/src/skills/*.md` files.
- Parse frontmatter using regex: split on `---` delimiters, extract `name:` and `description:` lines.
- Return: `[{ name: string, description: string }]`

**POST /skills/:name/invoke** — invoke a skill
- Body: `{ sessionId: string, userMessage?: string }`
- Read the named skill file.
- Construct prompt: `[Skill: {name}]\n\n{skill markdown content}\n\n{userMessage || "Please execute this skill."}`
- Send via `client.session.promptAsync({ path: { id: sessionId }, body: { parts: [{ type: "text", text: prompt }] } })`
- Return 204. Execution streams to frontend via SSE.

**Modified file:** `backend/src/index.ts`

Mount: `app.use("/api/skills", skillsRouter)`

### Frontend

**New file:** `frontend/src/hooks/useSkills.ts`

```ts
function useSkills() {
  return useQuery<Skill[]>({
    queryKey: ["skills"],
    queryFn: () => fetch("/api/skills").then(r => r.json()),
  });
}
```

**New file:** `frontend/src/components/SkillBar.tsx`

Horizontal scrollable row of skill chips:
- Renders each skill as a button: `bg-surface border border-border rounded-(--radius-sm) px-2 py-1 text-(--text-xs) text-ink-secondary hover:bg-surface-hover whitespace-nowrap`.
- Container: `flex gap-1.5 overflow-x-auto py-1.5 px-(--spacing-panel) border-t border-border-subtle`.
- On click: ensures session exists (creates if needed), then `POST /api/skills/:name/invoke` with `{ sessionId }`. Results stream via SSE into the chat.

### ChatPanel Change

Render `<SkillBar>` between the messages area and the input form. Pass `sessionId`, `createSession`, and `sendMessage` (or a dedicated `invokeSkill` callback).

---

## File Summary

### New Files (10)

| File | Purpose |
|------|---------|
| `frontend/src/components/Markdown.tsx` | Markdown renderer with copy buttons |
| `frontend/src/components/ToolCallCard.tsx` | Collapsible tool call display card |
| `frontend/src/components/SessionPicker.tsx` | Session dropdown switcher |
| `frontend/src/components/SkillBar.tsx` | Skill chip buttons row |
| `frontend/src/types/agent.ts` | TypeScript types for SSE wire format |
| `frontend/src/lib/agent-core/types.ts` | SessionState and initial state |
| `frontend/src/lib/agent-core/reducers.ts` | Pure SSE event reducer |
| `frontend/src/hooks/useAgentStream.ts` | Streaming hook (replaces useAgent.ts) |
| `frontend/src/hooks/useSkills.ts` | React Query hook for skills list |
| `backend/src/api/skills.ts` | Skills list and invoke endpoints |

### Modified Files (4)

| File | Changes |
|------|---------|
| `frontend/src/components/ChatPanel.tsx` | All 5 features: textarea, markdown, streaming, sessions, skills |
| `frontend/package.json` | Add `marked`, `dompurify`, `@types/dompurify` |
| `backend/src/api/agent.ts` | Add GET /session (list) and DELETE /session/:id |
| `backend/src/index.ts` | Mount skills router |

### Removed Files (1)

| File | Reason |
|------|--------|
| `frontend/src/hooks/useAgent.ts` | Replaced by useAgentStream.ts |

---

## Verification Plan

1. **Textarea:** Type a long message — verify textarea expands up to 200px max. Press Shift+Enter — verify newline. Press Enter — verify submit.
2. **Markdown:** Send a message that triggers the agent to respond with lists, bold text, and code blocks. Verify they render correctly. Click "Copy" on a code block.
3. **Tool calls:** Send "plan my week" — verify tool call cards appear in real-time as the agent fetches lectures, creates events. Verify collapsed/running/expanded states.
4. **Sessions:** Reload the page — verify the conversation persists. Click "+ New" — verify fresh session. Switch back to old session — verify messages load.
5. **Skills:** Click "Plan Week" chip — verify it invokes the skill and results stream into chat. Try other skills.
