# Chat Experience Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the chat panel from a synchronous plain-text interface into a streaming, markdown-rendered, session-persistent chat with visible tool calls and one-click skill invocation.

**Architecture:** Frontend opens an SSE EventSource to the existing `/api/agent/events` proxy. Messages are sent fire-and-forget via the async endpoint. A pure reducer processes SSE events into React state. Session ID is persisted in localStorage. Skills are invoked server-side by prepending skill markdown to the agent prompt.

**Tech Stack:** React 19, Tailwind CSS v4, `marked` + `dompurify` for markdown, `@tanstack/react-query` for data fetching, OpenCode SDK v1 (`@opencode-ai/sdk/client`), Express 5, better-sqlite3.

**Spec:** `docs/superpowers/specs/2026-04-18-chat-experience-design.md`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `frontend/src/types/agent.ts` | TypeScript types for SSE wire format (Message, Part, Event) |
| `frontend/src/lib/agent-core/types.ts` | SessionState interface and initial state |
| `frontend/src/lib/agent-core/reducers.ts` | Pure reducer for SSE events → state |
| `frontend/src/hooks/useAgentStream.ts` | Streaming hook: EventSource, reducer, session management |
| `frontend/src/hooks/useSkills.ts` | React Query hook for skills list |
| `frontend/src/components/Markdown.tsx` | Markdown renderer with sanitization and copy buttons |
| `frontend/src/components/ToolCallCard.tsx` | Collapsible tool call status card |
| `frontend/src/components/SessionPicker.tsx` | Session dropdown switcher |
| `frontend/src/components/SkillBar.tsx` | Skill chip buttons row |
| `backend/src/api/skills.ts` | Skills list and invoke API endpoints |

### Modified Files

| File | Changes |
|------|---------|
| `frontend/package.json` | Add `marked`, `dompurify`, `@types/dompurify` |
| `frontend/src/components/ChatPanel.tsx` | Full rewrite: textarea, streaming, markdown, sessions, skills |
| `backend/src/api/agent.ts` | Add GET /session (list) and DELETE /session/:id |
| `backend/src/index.ts` | Mount skills router |

### Removed Files

| File | Reason |
|------|--------|
| `frontend/src/hooks/useAgent.ts` | Replaced by `useAgentStream.ts` |

---

## Task 1: Install frontend dependencies

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install marked and dompurify**

```bash
cd frontend && npm install marked dompurify && npm install -D @types/dompurify
```

- [ ] **Step 2: Verify installation**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -5
```

Expected: no new errors related to marked/dompurify.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "deps: add marked and dompurify for markdown rendering"
```

---

## Task 2: Auto-expanding textarea

**Files:**
- Modify: `frontend/src/components/ChatPanel.tsx`

This task modifies only the input area. The rest of ChatPanel stays unchanged temporarily.

- [ ] **Step 1: Replace input with textarea and add auto-resize**

In `frontend/src/components/ChatPanel.tsx`, replace the `<input>` element (line 67-73) and add the supporting ref + effect. The full updated component:

```tsx
import { useRef, useEffect, useState, FormEvent, KeyboardEvent } from "react";
import { useAgent } from "../hooks/useAgent";

export function ChatPanel() {
  const { messages, sendMessage, loading } = useAgent();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    sendMessage(text);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-(--spacing-panel) space-y-(--spacing-section)">
        {messages.length === 0 && !loading && (
          <p className="text-ink-muted font-mono text-(--text-sm)">
            Type a message to start planning your week...
          </p>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="space-y-1">
            {msg.role === "user" ? (
              <>
                <span className="text-(--text-xs) text-ink-muted uppercase tracking-wider">You</span>
                <p className="text-ink-secondary text-(--text-sm) font-mono whitespace-pre-wrap">
                  {msg.content}
                </p>
              </>
            ) : (
              <>
                <span className="text-(--text-xs) text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  AssisTUM
                </span>
                <p className="text-ink text-(--text-sm) font-mono whitespace-pre-wrap">
                  {msg.content}
                </p>
              </>
            )}
          </div>
        ))}

        {loading && (
          <div className="space-y-1">
            <span className="text-(--text-xs) text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              AssisTUM
            </span>
            <p className="text-ink-muted text-(--text-sm) font-mono animate-pulse">Agent is working...</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-border flex gap-(--spacing-element)">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask AssisTUM..."
          rows={1}
          className="flex-1 bg-surface border border-border rounded-(--radius-md) px-3 py-2.5 text-(--text-sm) font-mono text-ink placeholder-ink-faint focus:outline-none focus:border-accent/50 transition-colors resize-none max-h-[200px] overflow-y-auto"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-(--text-sm) px-4 py-2.5 rounded-(--radius-md) font-medium transition-colors self-end"
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Run the dev server (`cd frontend && npm run dev`). In the chat input:
1. Type a short message — verify textarea is single-line height.
2. Type multiple lines with Shift+Enter — verify textarea expands.
3. Type enough to exceed 200px — verify it caps and shows scrollbar.
4. Press Enter — verify message sends and textarea resets to single line.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ChatPanel.tsx
git commit -m "feat: replace chat input with auto-expanding textarea"
```

---

## Task 3: Markdown component

**Files:**
- Create: `frontend/src/components/Markdown.tsx`

- [ ] **Step 1: Create the Markdown component**

Create `frontend/src/components/Markdown.tsx`:

```tsx
import { useMemo, useRef, useEffect } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface MarkdownProps {
  text: string;
}

export function Markdown({ text }: MarkdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const html = useMemo(() => {
    if (!text) return "";
    const raw = marked.parse(text, { async: false }) as string;
    return DOMPurify.sanitize(raw);
  }, [text]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const pres = container.querySelectorAll("pre");
    pres.forEach((pre) => {
      if (pre.querySelector("[data-copy-btn]")) return;
      const btn = document.createElement("button");
      btn.setAttribute("data-copy-btn", "");
      btn.textContent = "Copy";
      Object.assign(btn.style, {
        position: "absolute",
        top: "6px",
        right: "6px",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        color: "var(--color-ink-muted)",
        borderRadius: "3px",
        padding: "2px 8px",
        fontSize: "10px",
        cursor: "pointer",
        fontFamily: "var(--font-mono)",
      } satisfies Partial<Record<keyof CSSStyleDeclaration, string>>);
      btn.addEventListener("click", () => {
        const code = pre.querySelector("code");
        const t = code?.textContent ?? pre.textContent ?? "";
        navigator.clipboard.writeText(t).then(() => {
          btn.textContent = "Copied!";
          setTimeout(() => {
            btn.textContent = "Copy";
          }, 2000);
        });
      });
      pre.style.position = "relative";
      pre.appendChild(btn);
    });
  }, [html]);

  return (
    <div
      ref={containerRef}
      className="assistum-markdown"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const styleId = "assistum-markdown-styles";
if (typeof document !== "undefined" && !document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .assistum-markdown {
      font-size: var(--text-sm);
      line-height: 1.6;
      color: var(--color-ink);
      font-family: var(--font-sans);
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .assistum-markdown p { margin: 0 0 8px 0; }
    .assistum-markdown p:last-child { margin-bottom: 0; }
    .assistum-markdown pre {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 12px;
      overflow-x: auto;
      margin: 8px 0;
      position: relative;
    }
    .assistum-markdown code {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
    }
    .assistum-markdown :not(pre) > code {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 3px;
      padding: 1px 5px;
      font-size: var(--text-xs);
    }
    .assistum-markdown ul, .assistum-markdown ol { margin: 4px 0; padding-left: 20px; }
    .assistum-markdown li { margin: 2px 0; }
    .assistum-markdown a { color: var(--color-accent); text-decoration: none; }
    .assistum-markdown a:hover { text-decoration: underline; }
    .assistum-markdown h1, .assistum-markdown h2, .assistum-markdown h3 {
      margin: 12px 0 6px 0;
      color: var(--color-ink);
    }
    .assistum-markdown h1 { font-size: var(--text-lg); }
    .assistum-markdown h2 { font-size: var(--text-base); }
    .assistum-markdown h3 { font-size: var(--text-sm); font-weight: 600; }
    .assistum-markdown blockquote {
      border-left: 3px solid var(--color-border);
      margin: 8px 0;
      padding: 4px 12px;
      color: var(--color-ink-muted);
    }
    .assistum-markdown table { border-collapse: collapse; margin: 8px 0; }
    .assistum-markdown th, .assistum-markdown td {
      border: 1px solid var(--color-border);
      padding: 6px 10px;
      font-size: var(--text-xs);
    }
    .assistum-markdown th { background: var(--color-surface); }
    .assistum-markdown strong { font-weight: 600; }
  `;
  document.head.appendChild(style);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors related to Markdown.tsx.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Markdown.tsx
git commit -m "feat: add Markdown component with sanitization and copy buttons"
```

---

## Task 4: Frontend agent types

**Files:**
- Create: `frontend/src/types/agent.ts`

- [ ] **Step 1: Create the types file**

Create `frontend/src/types/agent.ts`:

```ts
export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  parentID?: string;
  sessionID: string;
  createdAt?: string;
  error?: unknown;
}

export interface TextPart {
  id: string;
  type: "text";
  messageID: string;
  text: string;
}

export interface ToolState {
  status: "pending" | "running" | "completed" | "error";
  title?: string;
  output?: string;
  error?: string;
}

export interface ToolPart {
  id: string;
  type: "tool";
  messageID: string;
  tool: string;
  callID: string;
  state: ToolState;
}

export type Part = TextPart | ToolPart;

export interface AgentEvent {
  type: string;
  properties: Record<string, unknown>;
}

export interface GlobalEvent {
  directory: string;
  payload: AgentEvent;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/types/agent.ts
git commit -m "feat: add TypeScript types for agent SSE wire format"
```

---

## Task 5: Session state types and reducer

**Files:**
- Create: `frontend/src/lib/agent-core/types.ts`
- Create: `frontend/src/lib/agent-core/reducers.ts`

- [ ] **Step 1: Create the state types**

Create `frontend/src/lib/agent-core/types.ts`:

```ts
import type { AgentMessage, Part } from "../../types/agent";

export interface SessionState {
  messages: AgentMessage[];
  parts: Record<string, Part[]>;
  status: "idle" | "running" | "error";
  error: string | null;
}

export const initialSessionState: SessionState = {
  messages: [],
  parts: {},
  status: "idle",
  error: null,
};
```

- [ ] **Step 2: Create the reducer**

Create `frontend/src/lib/agent-core/reducers.ts`:

```ts
import type { AgentMessage, AgentEvent, Part } from "../../types/agent";
import type { SessionState } from "./types";
import { initialSessionState } from "./types";

export type ReducerAction = AgentEvent | { type: "__reset" };

function findIndex(arr: { id: string }[], id: string): number {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].id === id) return i;
  }
  return -1;
}

function upsertById<T extends { id: string }>(arr: T[], item: T): T[] {
  const idx = findIndex(arr, item.id);
  if (idx >= 0) {
    const next = [...arr];
    next[idx] = item;
    return next;
  }
  return [...arr, item];
}

function removeById<T extends { id: string }>(arr: T[], id: string): T[] {
  return arr.filter((x) => x.id !== id);
}

export function getSessionID(event: AgentEvent): string | undefined {
  const props = event.properties as Record<string, unknown>;
  if ("sessionID" in props && typeof props.sessionID === "string") {
    return props.sessionID;
  }
  if ("part" in props && typeof props.part === "object" && props.part !== null) {
    const part = props.part as Record<string, unknown>;
    if ("sessionID" in part && typeof part.sessionID === "string") {
      return part.sessionID;
    }
  }
  if ("info" in props && typeof props.info === "object" && props.info !== null) {
    const info = props.info as Record<string, unknown>;
    if ("sessionID" in info && typeof info.sessionID === "string") {
      return info.sessionID;
    }
  }
  return undefined;
}

export function applyAction(state: SessionState, action: ReducerAction): SessionState {
  if (action.type === "__reset") return initialSessionState;
  return applyEvent(state, action);
}

function applyEvent(state: SessionState, event: AgentEvent): SessionState {
  switch (event.type) {
    case "message.updated": {
      const msg = event.properties.info as AgentMessage;
      return { ...state, messages: upsertById(state.messages, msg) };
    }

    case "message.removed": {
      const { messageID } = event.properties as { messageID: string };
      const { [messageID]: _, ...restParts } = state.parts;
      return {
        ...state,
        messages: state.messages.filter((m) => m.id !== messageID),
        parts: restParts,
      };
    }

    case "message.part.updated": {
      const part = event.properties.part as Part;
      const msgId = part.messageID;
      const existing = state.parts[msgId] ?? [];
      return {
        ...state,
        parts: { ...state.parts, [msgId]: upsertById(existing, part) },
      };
    }

    case "message.part.removed": {
      const { messageID, partID } = event.properties as {
        messageID: string;
        partID: string;
      };
      const existing = state.parts[messageID];
      if (!existing) return state;
      return {
        ...state,
        parts: { ...state.parts, [messageID]: removeById(existing, partID) },
      };
    }

    case "message.part.delta": {
      const { messageID, partID, field, delta } = event.properties as {
        messageID: string;
        partID: string;
        field: string;
        delta: string;
      };
      let existing = state.parts[messageID] ?? [];
      let idx = findIndex(existing, partID);
      if (idx < 0) {
        existing = [
          ...existing,
          { id: partID, type: "text", messageID, text: "" } as Part,
        ];
        idx = existing.length - 1;
      }
      const part = { ...existing[idx] } as Record<string, unknown>;
      part[field] = ((part[field] as string) ?? "") + delta;
      const next = [...existing];
      next[idx] = part as Part;
      return { ...state, parts: { ...state.parts, [messageID]: next } };
    }

    case "session.status": {
      const { status } = event.properties as {
        status: { type: string };
      };
      return {
        ...state,
        status: status.type === "busy" ? "running" : "idle",
      };
    }

    case "session.idle": {
      return { ...state, status: "idle" };
    }

    case "session.error": {
      const err = event.properties.error;
      return {
        ...state,
        status: "error",
        error: err ? JSON.stringify(err) : "Unknown error",
      };
    }

    default:
      return state;
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/agent-core/types.ts frontend/src/lib/agent-core/reducers.ts
git commit -m "feat: add SSE event reducer and session state types"
```

---

## Task 6: Streaming hook (useAgentStream)

**Files:**
- Create: `frontend/src/hooks/useAgentStream.ts`

- [ ] **Step 1: Create the streaming hook**

Create `frontend/src/hooks/useAgentStream.ts`:

```ts
import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import type { AgentEvent, AgentMessage, GlobalEvent, Part } from "../types/agent";
import { applyAction, getSessionID, type ReducerAction } from "../lib/agent-core/reducers";
import { initialSessionState, type SessionState } from "../lib/agent-core/types";

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

function reducer(state: SessionState, action: ReducerAction): SessionState {
  return applyAction(state, action);
}

const STORAGE_KEY = "assistum:sessionId";

export function useAgentStream() {
  const [state, dispatch] = useReducer(reducer, initialSessionState);
  const [sessionId, setSessionIdRaw] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  );
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const sessionIdRef = useRef(sessionId);

  const setSessionId = useCallback((id: string | null) => {
    setSessionIdRaw(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  });

  useEffect(() => {
    dispatch({ type: "__reset" });
  }, [sessionId]);

  const syncMessages = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/agent/session/${sid}/messages`);
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;
      for (const item of data) {
        const info: AgentMessage = item.info ?? item;
        dispatch({
          type: "message.updated",
          properties: { sessionID: sid, info },
        } as AgentEvent);
        const parts: Part[] = item.parts ?? [];
        for (const part of parts) {
          dispatch({
            type: "message.part.updated",
            properties: { sessionID: sid, part },
          } as AgentEvent);
        }
      }
    } catch {
      // OpenCode may not be running
    }
  }, []);

  // SSE connection
  useEffect(() => {
    setConnectionStatus("connecting");
    const es = new EventSource("/api/agent/events");

    es.onopen = () => {
      setConnectionStatus("connected");
      const sid = sessionIdRef.current;
      if (sid) syncMessages(sid);
    };

    es.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data) as GlobalEvent;
        const agentEvent = raw.payload ?? (raw as unknown as AgentEvent);

        const activeId = sessionIdRef.current;
        if (!activeId) return;

        const eventSessionId = getSessionID(agentEvent);
        if (eventSessionId && eventSessionId !== activeId) return;

        dispatch(agentEvent);
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      setConnectionStatus("connecting");
    };

    return () => {
      es.close();
      setConnectionStatus("disconnected");
    };
  }, [syncMessages]);

  // Sync messages when sessionId changes (and we're connected)
  useEffect(() => {
    if (sessionId && connectionStatus === "connected") {
      syncMessages(sessionId);
    }
  }, [sessionId, connectionStatus, syncMessages]);

  const ensureSession = useCallback(async (): Promise<string> => {
    let sid = sessionIdRef.current;
    if (sid) return sid;
    const res = await fetch("/api/agent/session", { method: "POST" });
    if (!res.ok) throw new Error("Failed to create session");
    const data = await res.json();
    sid = data.id as string;
    if (!sid) throw new Error("No session ID returned");
    setSessionId(sid);
    return sid;
  }, [setSessionId]);

  const sendMessage = useCallback(async (text: string) => {
    const sid = await ensureSession();
    await fetch(`/api/agent/session/${sid}/message/async`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
  }, [ensureSession]);

  const createSession = useCallback(async () => {
    const res = await fetch("/api/agent/session", { method: "POST" });
    if (!res.ok) throw new Error("Failed to create session");
    const data = await res.json();
    const sid = data.id as string;
    if (!sid) throw new Error("No session ID returned");
    setSessionId(sid);
  }, [setSessionId]);

  return {
    state,
    sessionId,
    setSessionId,
    createSession,
    sendMessage,
    ensureSession,
    connectionStatus,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useAgentStream.ts
git commit -m "feat: add streaming hook with SSE EventSource and session management"
```

---

## Task 7: ToolCallCard component

**Files:**
- Create: `frontend/src/components/ToolCallCard.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/ToolCallCard.tsx`:

```tsx
import { useState } from "react";
import type { ToolPart } from "../types/agent";

interface ToolCallCardProps {
  part: ToolPart;
}

export function ToolCallCard({ part }: ToolCallCardProps) {
  const { tool, state } = part;
  const status = state.status;
  const isRunning = status === "running";
  const isError = status === "error";
  const isCompleted = status === "completed";

  const [open, setOpen] = useState(isRunning || isError);

  const title =
    (isCompleted || isRunning) && state.title ? state.title : tool;

  return (
    <div className="border border-border rounded-(--radius-md) overflow-hidden my-1">
      <button
        className="flex items-center gap-2 w-full px-3 py-1.5 bg-surface border-none cursor-pointer text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="flex-1 font-mono text-(--text-xs) text-ink truncate">
          {title}
        </span>
        <span className={`font-mono text-[10px] tracking-wider flex items-center gap-1 ${
          isError ? "text-danger" : isRunning ? "text-warning" : isCompleted ? "text-success" : "text-ink-muted"
        }`}>
          {isRunning && <span className="inline-block animate-spin">&#x27F3;</span>}
          {isError ? "error" : isRunning ? "running" : isCompleted ? "done" : "pending"}
        </span>
        <span className="text-[9px] text-ink-muted">
          {open ? "\u25BE" : "\u25B8"}
        </span>
      </button>
      {open && (
        <div className="px-3 py-2 border-t border-border bg-page">
          {isError && (
            <pre className="font-mono text-(--text-xs) text-danger m-0 whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto">
              {state.error}
            </pre>
          )}
          {isCompleted && (
            <pre className="font-mono text-(--text-xs) text-ink m-0 whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto leading-snug">
              {state.output || "(no output)"}
            </pre>
          )}
          {isRunning && (
            <span className="font-mono text-(--text-xs) text-ink-muted">Running...</span>
          )}
          {status === "pending" && (
            <span className="font-mono text-(--text-xs) text-ink-muted">Pending...</span>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ToolCallCard.tsx
git commit -m "feat: add collapsible ToolCallCard component"
```

---

## Task 8: Backend — session list, delete, and skills API

**Files:**
- Modify: `backend/src/api/agent.ts`
- Create: `backend/src/api/skills.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Add list and delete session endpoints**

In `backend/src/api/agent.ts`, add these two endpoints. **The `GET /session` route must go right after the `POST /session` handler (after line 19), before any `/:id` routes.** Otherwise Express will treat `"session"` as an `:id` parameter. The `DELETE` can go at the end of the file.

Insert after line 19 (after the closing `}`/`);` of the `POST /session` handler):

```ts
/* GET /session — list all sessions */
agentRouter.get("/session", async (_req: Request, res: Response) => {
  try {
    const client = await getOpenCodeClient();
    const result = await client.session.list();
    if (result.error) {
      res.status(500).json({ error: JSON.stringify(result.error) });
      return;
    }
    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
```

Add at the end of the file (after the `GET /events` handler):

```ts
/* DELETE /session/:id — delete a session */
agentRouter.delete("/session/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const client = await getOpenCodeClient();
    const result = await client.session.delete({ path: { id } });
    if (result.error) {
      res.status(500).json({ error: JSON.stringify(result.error) });
      return;
    }
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
```

- [ ] **Step 2: Create the skills API**

Create `backend/src/api/skills.ts`:

```ts
import { Router, Request, Response } from "express";
import { readdir, readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getOpenCodeClient } from "../agent/opencode.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = resolve(__dirname, "../skills");

export const skillsRouter = Router();

interface Skill {
  name: string;
  description: string;
}

function parseFrontmatter(content: string): { name: string; description: string; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { name: "", description: "", body: content };

  const frontmatter = match[1];
  const body = match[2];

  let name = "";
  let description = "";
  for (const line of frontmatter.split("\n")) {
    const nameMatch = line.match(/^name:\s*(.+)$/);
    if (nameMatch) name = nameMatch[1].trim();
    const descMatch = line.match(/^description:\s*(.+)$/);
    if (descMatch) description = descMatch[1].trim();
  }

  return { name, description, body };
}

/* GET / — list available skills */
skillsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const files = await readdir(skillsDir);
    const skills: Skill[] = [];

    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const content = await readFile(resolve(skillsDir, file), "utf-8");
      const { name, description } = parseFrontmatter(content);
      if (name) skills.push({ name, description });
    }

    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* POST /:name/invoke — invoke a skill on a session */
skillsRouter.post("/:name/invoke", async (req: Request, res: Response) => {
  try {
    const skillName = req.params.name as string;
    const { sessionId, userMessage } = req.body as {
      sessionId: string;
      userMessage?: string;
    };

    if (!sessionId) {
      res.status(400).json({ error: "Missing required field: sessionId" });
      return;
    }

    const files = await readdir(skillsDir);
    let skillContent: string | null = null;

    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const content = await readFile(resolve(skillsDir, file), "utf-8");
      const { name } = parseFrontmatter(content);
      if (name === skillName) {
        skillContent = content;
        break;
      }
    }

    if (!skillContent) {
      res.status(404).json({ error: `Skill "${skillName}" not found` });
      return;
    }

    const prompt = `[Skill: ${skillName}]\n\n${skillContent}\n\n${userMessage || "Please execute this skill."}`;

    const client = await getOpenCodeClient();
    const result = await client.session.promptAsync({
      path: { id: sessionId },
      body: { parts: [{ type: "text", text: prompt }] },
    });

    if (result.error) {
      res.status(500).json({ error: JSON.stringify(result.error) });
      return;
    }

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
```

- [ ] **Step 3: Mount the skills router**

In `backend/src/index.ts`, add the import and mount:

Add this import after line 12 (`import { authRouter } from "./api/auth.js";`):

```ts
import { skillsRouter } from "./api/skills.js";
```

Add this mount after line 29 (`app.use("/api/auth", authRouter);`):

```ts
app.use("/api/skills", skillsRouter);
```

- [ ] **Step 4: Verify backend compiles**

```bash
cd backend && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/agent.ts backend/src/api/skills.ts backend/src/index.ts
git commit -m "feat: add session list/delete endpoints and skills API"
```

---

## Task 9: SessionPicker component

**Files:**
- Create: `frontend/src/components/SessionPicker.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/SessionPicker.tsx`:

```tsx
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Session {
  id: string;
  title?: string;
  createdAt?: string;
}

interface SessionPickerProps {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => Promise<void>;
  onDeleteSession?: (id: string) => Promise<void>;
}

export function SessionPicker({
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}: SessionPickerProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["sessions"],
    queryFn: async () => {
      const res = await fetch("/api/agent/session");
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const label = activeSession?.title || (activeSessionId ? activeSessionId.slice(0, 8) + "..." : "No session");

  const handleNew = async () => {
    setCreating(true);
    try {
      await onNewSession();
      qc.invalidateQueries({ queryKey: ["sessions"] });
    } finally {
      setCreating(false);
      setOpen(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!onDeleteSession) return;
    await onDeleteSession(id);
    qc.invalidateQueries({ queryKey: ["sessions"] });
  };

  return (
    <div className="flex items-center justify-between px-(--spacing-panel) py-2 border-b border-border" ref={dropdownRef}>
      <div className="flex items-center gap-2">
        <span className="text-(--text-xs) text-ink-muted uppercase tracking-wider font-mono">Session</span>
        <button
          className="text-(--text-xs) text-ink bg-surface-hover border border-border rounded-(--radius-md) px-2.5 py-1 cursor-pointer flex items-center gap-1 hover:bg-surface-active transition-colors"
          onClick={() => setOpen(!open)}
        >
          {label}
          <span className="text-[9px] text-ink-muted">{open ? "\u25BE" : "\u25B8"}</span>
        </button>
      </div>
      <button
        className="text-(--text-xs) text-accent bg-transparent border border-accent/30 rounded-(--radius-md) px-2.5 py-1 cursor-pointer hover:bg-accent-subtle transition-colors"
        onClick={handleNew}
        disabled={creating}
      >
        {creating ? "..." : "+ New"}
      </button>

      {open && (
        <div className="absolute top-full left-(--spacing-panel) right-(--spacing-panel) mt-1 bg-surface border border-border rounded-(--radius-md) shadow-sm z-10 max-h-[240px] overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="px-3 py-3 text-(--text-xs) text-ink-muted font-mono">No sessions yet</div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                className={`flex items-center w-full px-3 py-2 text-left border-none cursor-pointer transition-colors ${
                  s.id === activeSessionId
                    ? "bg-accent-subtle border-l-2 border-l-accent"
                    : "bg-transparent hover:bg-surface-hover"
                }`}
                onClick={() => {
                  onSelectSession(s.id);
                  setOpen(false);
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-(--text-xs) text-ink truncate">
                    {s.title || "Untitled"}
                  </div>
                  <div className="text-[10px] text-ink-muted font-mono">{s.id.slice(0, 8)}</div>
                </div>
                {onDeleteSession && (
                  <button
                    className="text-ink-muted hover:text-danger text-sm bg-transparent border-none cursor-pointer px-1 leading-none"
                    onClick={(e) => handleDelete(e, s.id)}
                    title="Delete session"
                  >
                    &times;
                  </button>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/SessionPicker.tsx
git commit -m "feat: add SessionPicker dropdown component"
```

---

## Task 10: SkillBar component and useSkills hook

**Files:**
- Create: `frontend/src/hooks/useSkills.ts`
- Create: `frontend/src/components/SkillBar.tsx`

- [ ] **Step 1: Create the useSkills hook**

Create `frontend/src/hooks/useSkills.ts`:

```ts
import { useQuery } from "@tanstack/react-query";

export interface Skill {
  name: string;
  description: string;
}

export function useSkills() {
  return useQuery<Skill[]>({
    queryKey: ["skills"],
    queryFn: async () => {
      const res = await fetch("/api/skills");
      if (!res.ok) return [];
      return res.json();
    },
  });
}
```

- [ ] **Step 2: Create the SkillBar component**

Create `frontend/src/components/SkillBar.tsx`:

```tsx
import { useState } from "react";
import { useSkills } from "../hooks/useSkills";

interface SkillBarProps {
  sessionId: string | null;
  ensureSession: () => Promise<string>;
}

export function SkillBar({ sessionId, ensureSession }: SkillBarProps) {
  const { data: skills = [] } = useSkills();
  const [invoking, setInvoking] = useState<string | null>(null);

  if (skills.length === 0) return null;

  const handleInvoke = async (skillName: string) => {
    setInvoking(skillName);
    try {
      const sid = await ensureSession();
      await fetch(`/api/skills/${encodeURIComponent(skillName)}/invoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      });
    } catch (err) {
      console.error("Failed to invoke skill:", err);
    } finally {
      setInvoking(null);
    }
  };

  const displayName = (name: string) =>
    name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  return (
    <div className="flex gap-1.5 overflow-x-auto py-1.5 px-(--spacing-panel) border-t border-border-subtle">
      {skills.map((skill) => (
        <button
          key={skill.name}
          className="bg-surface border border-border rounded-(--radius-sm) px-2 py-1 text-(--text-xs) text-ink-secondary hover:bg-surface-hover whitespace-nowrap cursor-pointer transition-colors disabled:opacity-50"
          onClick={() => handleInvoke(skill.name)}
          disabled={invoking !== null}
          title={skill.description}
        >
          {invoking === skill.name ? "..." : displayName(skill.name)}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/useSkills.ts frontend/src/components/SkillBar.tsx
git commit -m "feat: add SkillBar component and useSkills hook"
```

---

## Task 11: Rewrite ChatPanel to integrate everything

**Files:**
- Modify: `frontend/src/components/ChatPanel.tsx`
- Remove: `frontend/src/hooks/useAgent.ts`

This is the integration task. ChatPanel gets completely rewritten to use the streaming hook, render message parts with Markdown and ToolCallCard, include the SessionPicker and SkillBar, and use the auto-expanding textarea.

- [ ] **Step 1: Rewrite ChatPanel**

Replace the entire contents of `frontend/src/components/ChatPanel.tsx`:

```tsx
import { useRef, useEffect, useState, FormEvent, KeyboardEvent, useMemo } from "react";
import { useAgentStream } from "../hooks/useAgentStream";
import { Markdown } from "./Markdown";
import { ToolCallCard } from "./ToolCallCard";
import { SessionPicker } from "./SessionPicker";
import { SkillBar } from "./SkillBar";
import type { AgentMessage, Part, TextPart, ToolPart } from "../types/agent";

interface Turn {
  user: AgentMessage;
  assistants: AgentMessage[];
}

function groupIntoTurns(messages: AgentMessage[]): Turn[] {
  const users = messages.filter((m) => m.role === "user");
  return users.map((user) => ({
    user,
    assistants: messages.filter(
      (m) => m.role === "assistant" && m.parentID === user.id,
    ),
  }));
}

function renderPart(part: Part) {
  switch (part.type) {
    case "text":
      return <Markdown key={part.id} text={(part as TextPart).text} />;
    case "tool":
      return <ToolCallCard key={part.id} part={part as ToolPart} />;
    default:
      return null;
  }
}

export function ChatPanel() {
  const {
    state,
    sessionId,
    setSessionId,
    createSession,
    sendMessage,
    ensureSession,
  } = useAgentStream();

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pinnedRef = useRef(true);

  const turns = useMemo(() => groupIntoTurns(state.messages), [state.messages]);
  const isRunning = state.status === "running";

  useEffect(() => {
    if (pinnedRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [state.messages, state.parts]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  const handleSubmit = async (e: FormEvent | KeyboardEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || isRunning) return;
    setInput("");
    setSending(true);
    pinnedRef.current = true;
    try {
      await sendMessage(text);
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleDeleteSession = async (id: string) => {
    await fetch(`/api/agent/session/${id}`, { method: "DELETE" });
    if (id === sessionId) {
      setSessionId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Session header */}
      <div className="relative">
        <SessionPicker
          activeSessionId={sessionId}
          onSelectSession={setSessionId}
          onNewSession={createSession}
          onDeleteSession={handleDeleteSession}
        />
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-(--spacing-panel) space-y-(--spacing-section)"
        onScroll={() => {
          const el = scrollRef.current;
          if (!el) return;
          pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {turns.length === 0 && !isRunning && (
          <p className="text-ink-muted font-mono text-(--text-sm)">
            Type a message to start planning your week...
          </p>
        )}

        {turns.map((turn) => (
          <div key={turn.user.id} className="space-y-(--spacing-section)">
            {/* User message */}
            <div className="space-y-1">
              <span className="text-(--text-xs) text-ink-muted uppercase tracking-wider">You</span>
              {(state.parts[turn.user.id] ?? []).map(renderPart)}
              {!(state.parts[turn.user.id]?.length) && (
                <p className="text-ink-secondary text-(--text-sm) font-mono whitespace-pre-wrap">(prompt)</p>
              )}
            </div>

            {/* Assistant messages */}
            {turn.assistants.map((asst) => (
              <div key={asst.id} className="space-y-1">
                <span className="text-(--text-xs) text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  AssisTUM
                </span>
                {(state.parts[asst.id] ?? []).map(renderPart)}
                {asst.error && (
                  <div className="font-mono text-(--text-xs) text-danger bg-danger/10 rounded-(--radius-sm) px-2 py-1.5">
                    {JSON.stringify(asst.error)}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {isRunning && turns.length > 0 && !(
          turns[turns.length - 1]?.assistants.some(
            (a) => (state.parts[a.id]?.length ?? 0) > 0,
          )
        ) && (
          <div className="space-y-1">
            <span className="text-(--text-xs) text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              AssisTUM
            </span>
            <p className="text-ink-muted text-(--text-sm) font-mono animate-pulse">Agent is working...</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Skills bar */}
      <SkillBar sessionId={sessionId} ensureSession={ensureSession} />

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border flex gap-(--spacing-element)">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRunning ? "Agent is working..." : "Ask AssisTUM..."}
          rows={1}
          disabled={sending || isRunning}
          className="flex-1 bg-surface border border-border rounded-(--radius-md) px-3 py-2.5 text-(--text-sm) font-mono text-ink placeholder-ink-faint focus:outline-none focus:border-accent/50 transition-colors resize-none max-h-[200px] overflow-y-auto"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending || isRunning}
          className="bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-(--text-sm) px-4 py-2.5 rounded-(--radius-md) font-medium transition-colors self-end"
        >
          {sending ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Delete the old useAgent hook**

```bash
rm frontend/src/hooks/useAgent.ts
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

If there are errors about `useAgent` being imported elsewhere, check that no other file imports it. It should only have been imported by `ChatPanel.tsx`.

- [ ] **Step 4: Verify in browser**

Run both servers:
```bash
cd backend && npm run dev &
cd frontend && npm run dev
```

Test each feature:
1. **Textarea:** Type text, verify it expands. Shift+Enter for newline. Enter to send.
2. **Session picker:** Click the session dropdown, verify "+ New" creates a session.
3. **Streaming:** Send a message, verify tool call cards appear as the agent works. Verify text renders as markdown.
4. **Skills:** Click a skill chip (e.g., "Plan Week"), verify it streams results.
5. **Persistence:** Reload the page, verify the session and conversation are preserved.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ChatPanel.tsx
git rm frontend/src/hooks/useAgent.ts
git commit -m "feat: rewrite ChatPanel with streaming, markdown, sessions, and skills"
```

---

## Task 12: Add spin keyframe animation

**Files:**
- Modify: `frontend/src/index.css`

The ToolCallCard uses `animate-spin` for the running spinner. Tailwind v4 includes this by default, but verify it works. If the `&#x27F3;` character doesn't spin, add a custom keyframe.

- [ ] **Step 1: Verify animate-spin works**

Check in the browser: when a tool is running, the ⟳ character should spin. If it doesn't, add this to `frontend/src/index.css` after the existing `@keyframes fade-in-up` block (line 77):

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

Tailwind v4 should handle `animate-spin` natively, so this may not be needed.

- [ ] **Step 2: Commit if changes were made**

```bash
git add frontend/src/index.css
git commit -m "fix: add spin keyframe for tool call spinner"
```

---

## Verification Checklist

After all tasks are complete, run through this end-to-end:

1. **Start both servers** — `cd backend && npm run dev` and `cd frontend && npm run dev`
2. **Fresh load** — Open the app, no session should exist. "No session" shows in header.
3. **Type a message** — Textarea should be single-line. Type "what's for lunch today?"
4. **Send it** — Press Enter. A session should be auto-created. The session dropdown should update.
5. **Watch streaming** — Tool call cards should appear (e.g., `canteen_menu` running → done). Text should render as markdown with formatting.
6. **Expand a tool card** — Click the toggle arrow. Output should show.
7. **Reload the page** — Conversation should persist. Session should re-load from localStorage.
8. **Create new session** — Click "+ New". Fresh empty chat. Old session still in dropdown.
9. **Switch sessions** — Click the dropdown, select the old session. Messages should load.
10. **Invoke a skill** — Click "Plan Week" chip. Agent should start working with the skill prompt visible in streaming.
11. **Textarea expansion** — Type a long multi-line message with Shift+Enter. Verify expansion up to 200px.
