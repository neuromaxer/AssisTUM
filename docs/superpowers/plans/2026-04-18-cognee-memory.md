# Cognee Memory Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add conversational memory to AssisTUM's agent using Cognee Cloud, with `memory_store` and `memory_recall` MCP tools and prompt-level instructions for when to use them.

**Architecture:** Two new MCP tools in `live.ts` call Cognee Cloud's REST API (`/api/v1/remember` and `/api/v1/recall`). Cognee API key and URL are stored in the existing settings table. A new skill markdown file teaches the agent when/how to use memory.

**Tech Stack:** TypeScript, Express, Cognee Cloud REST API, MCP SDK (existing), SQLite settings (existing)

---

### Task 1: Add Cognee settings to the Settings UI

**Files:**
- Modify: `frontend/src/components/SettingsDialog.tsx`
- Modify: `frontend/src/hooks/useSettings.ts`

- [ ] **Step 1: Add Cognee fields to the auth status hook**

Read `frontend/src/hooks/useSettings.ts` and add `cognee` to the auth status type. The existing `useAuthStatus` hook fetches from `/api/auth/status` — cognee status will be added to that response in Task 2.

In `frontend/src/hooks/useSettings.ts`, add to the status type:

```typescript
cognee: boolean;
```

- [ ] **Step 2: Add Cognee Cloud settings section to SettingsDialog**

After the "TUM Credentials" section and before the "Student Clubs" section in `SettingsDialog.tsx`, add a new section:

```tsx
<div className="space-y-(--spacing-element)">
  <h3 className="text-(--text-sm) font-medium text-ink-secondary">Cognee Memory</h3>
  <input
    className={inputClass}
    placeholder="Cognee Cloud URL (e.g. https://your-instance.cognee.ai)"
    value={cogneeUrl}
    onChange={(e) => setCogneeUrl(e.target.value)}
  />
  <input
    className={inputClass}
    placeholder="Cognee API Key"
    type="password"
    value={cogneeKey}
    onChange={(e) => setCogneeKey(e.target.value)}
  />
  <button
    className={`${buttonClass} w-full`}
    disabled={cogneeLoading || !cogneeUrl || !cogneeKey}
    onClick={saveCognee}
  >
    {cogneeLoading ? "Saving..." : "Save Cognee Settings"}
  </button>
  <Feedback message={cogneeMsg?.text ?? null} isError={cogneeMsg?.error} />
</div>
```

Add the corresponding state variables at the top of the component:

```typescript
const [cogneeUrl, setCogneeUrl] = useState("");
const [cogneeKey, setCogneeKey] = useState("");
const [cogneeLoading, setCogneeLoading] = useState(false);
const [cogneeMsg, setCogneeMsg] = useState<{ text: string; error: boolean } | null>(null);
```

Add the save handler:

```typescript
const saveCognee = async () => {
  setCogneeLoading(true);
  setCogneeMsg(null);
  try {
    await fetch("/api/settings/cognee_url", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: cogneeUrl }),
    });
    await fetch("/api/settings/cognee_api_key", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: cogneeKey }),
    });
    setCogneeMsg({ text: "Saved!", error: false });
    setCogneeKey("");
    refetch();
  } catch (err: any) {
    setCogneeMsg({ text: err.message, error: true });
  } finally {
    setCogneeLoading(false);
  }
};
```

- [ ] **Step 3: Add Cognee to the ServiceRow list**

Below the Calendar `ServiceRow`, add:

```tsx
<ServiceRow label="Memory" connected={!!status?.cognee} result={results?.cognee} />
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/SettingsDialog.tsx frontend/src/hooks/useSettings.ts
git commit -m "feat: add Cognee Cloud settings UI for memory configuration"
```

---

### Task 2: Add Cognee status to the auth status endpoint

**Files:**
- Modify: `backend/src/api/auth.ts`

- [ ] **Step 1: Read the auth status endpoint**

Read `backend/src/api/auth.ts` and find the `GET /status` handler that returns the auth status object.

- [ ] **Step 2: Add cognee status to the response**

In the handler that builds the status response, add a `cognee` field that checks whether both `cognee_url` and `cognee_api_key` are set:

```typescript
const cogneeUrl = db.prepare("SELECT value FROM settings WHERE key = ?").get("cognee_url") as { value: string } | undefined;
const cogneeKey = db.prepare("SELECT value FROM settings WHERE key = ?").get("cognee_api_key") as { value: string } | undefined;
```

Add to the response object:

```typescript
cognee: !!(cogneeUrl?.value && cogneeKey?.value),
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/auth.ts
git commit -m "feat: include Cognee connection status in auth endpoint"
```

---

### Task 3: Implement memory_store and memory_recall MCP tools

**Files:**
- Modify: `backend/src/mcp/tools/live.ts`

- [ ] **Step 1: Add the memory_store tool**

At the end of `registerLiveTools()` in `live.ts` (before the closing `}`), add:

```typescript
  // =========================================================================
  // memory_store
  // =========================================================================
  server.tool(
    "memory_store",
    "Store a fact in the student's long-term memory. Use this to remember user preferences, plans, struggles, and important conversation context across sessions.",
    {
      text: z.string().describe("The fact to remember, as a clear standalone statement"),
      type: z.enum(["preference", "context"]).describe("'preference' for stable traits/likes/dislikes, 'context' for conversation facts/plans/struggles"),
      topic: z.string().optional().describe("Optional grouping tag: a course name, 'scheduling', 'food', 'study', etc."),
    },
    async (args) => {
      const baseUrl = getSetting("cognee_url");
      const apiKey = getSetting("cognee_api_key");
      if (!baseUrl || !apiKey) {
        return err("Cognee not configured. Please set cognee_url and cognee_api_key in Settings.");
      }

      try {
        const taggedText = `[${args.type}]${args.topic ? `[${args.topic}]` : ""} ${args.text}`;
        const form = new FormData();
        form.append("data", new Blob([taggedText], { type: "text/plain" }), "data.txt");
        form.append("datasetName", "assistum-memory");

        const res = await fetch(`${baseUrl}/api/v1/remember`, {
          method: "POST",
          headers: { "X-Api-Key": apiKey },
          body: form,
        });

        if (!res.ok) {
          const body = await res.text();
          return err(`Cognee API returned HTTP ${res.status}: ${body}`);
        }

        const data = await res.json();
        return ok({ stored: true, text: args.text, type: args.type, topic: args.topic ?? null, status: data.status });
      } catch (e: unknown) {
        return err(`Failed to store memory: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );
```

- [ ] **Step 2: Add the memory_recall tool**

Immediately after `memory_store`, add:

```typescript
  // =========================================================================
  // memory_recall
  // =========================================================================
  server.tool(
    "memory_recall",
    "Recall relevant facts from the student's long-term memory. Use this before making personalized recommendations, when the student references past conversations, or when planning.",
    {
      query: z.string().describe("Natural language query describing what to recall"),
      type: z.enum(["preference", "context"]).optional().describe("Filter to only preferences or only context"),
      topic: z.string().optional().describe("Filter to a specific topic"),
    },
    async (args) => {
      const baseUrl = getSetting("cognee_url");
      const apiKey = getSetting("cognee_api_key");
      if (!baseUrl || !apiKey) {
        return err("Cognee not configured. Please set cognee_url and cognee_api_key in Settings.");
      }

      try {
        const filters: string[] = [];
        if (args.type) filters.push(`[${args.type}]`);
        if (args.topic) filters.push(`[${args.topic}]`);
        const enrichedQuery = filters.length > 0
          ? `${filters.join("")} ${args.query}`
          : args.query;

        const res = await fetch(`${baseUrl}/api/v1/recall`, {
          method: "POST",
          headers: {
            "X-Api-Key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: enrichedQuery,
            datasets: ["assistum-memory"],
            searchType: "GRAPH_COMPLETION",
            topK: 10,
            onlyContext: true,
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          return err(`Cognee API returned HTTP ${res.status}: ${body}`);
        }

        const results = await res.json();
        return ok({ query: args.query, memories: results });
      } catch (e: unknown) {
        return err(`Failed to recall memories: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc -p backend/tsconfig.json --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/mcp/tools/live.ts
git commit -m "feat: add memory_store and memory_recall MCP tools via Cognee Cloud"
```

---

### Task 4: Add agent memory skill (behavioral instructions)

**Files:**
- Create: `backend/src/skills/memory-guidelines.md`

- [ ] **Step 1: Create the memory guidelines skill**

Write `backend/src/skills/memory-guidelines.md`:

```markdown
---
name: memory-guidelines
description: Guidelines for how and when to use the memory_store and memory_recall tools
---

You have access to long-term memory via two tools: `memory_store` and `memory_recall`.
These let you remember facts about the student across conversations.

## When to store memories (do this automatically)

- User states a preference: "I'm vegetarian", "I prefer Garching library", "I hate early mornings"
  -> memory_store with type "preference"
- User shares a plan or intention: "I'll start the ML assignment this weekend"
  -> memory_store with type "context"
- User expresses a struggle: "Linear algebra is really hard for me"
  -> memory_store with type "context", topic: course name
- A meaningful decision is made: "We decided to drop the Statistics tutorial"
  -> memory_store with type "context"

Do NOT store: greetings, confirmations, trivial one-off queries, or facts already in the database (events, todos, courses).

## When to recall memories

- Before making personalized recommendations (food, study rooms, scheduling)
- When the user says "like I said before", "remember when", or references a past conversation
- Before running plan-week or schedule-study-sessions (recall preferences and context)
- When advising on courses or study strategies

## Explicit commands

- If the user says "remember that..." -> call memory_store with the stated fact
- If the user says "forget that..." -> acknowledge and note that explicit deletion is coming soon

## Tags

Use the `topic` parameter to group memories by subject. Good topics: a course name ("Linear Algebra"), "scheduling", "food", "study", "commute", "exams".
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/skills/memory-guidelines.md
git commit -m "feat: add memory-guidelines skill for agent behavioral instructions"
```

---

### Task 5: Inject memory context into skill invocations

**Files:**
- Modify: `backend/src/api/skills.ts`

- [ ] **Step 1: Add memory preamble to skill prompts**

In `backend/src/api/skills.ts`, modify the `POST /:name/invoke` handler. Before the line that constructs the `prompt` string, add a memory preamble import:

```typescript
import { readFile } from "fs/promises";
```

(Already imported — no change needed.)

Find the line:
```typescript
const prompt = `[Skill: ${skillName}]\n\n${skillContent}\n\n${userMessage || "Please execute this skill."}`;
```

Replace with:
```typescript
let memoryPreamble = "";
const memorySkillPath = resolve(skillsDir, "memory-guidelines.md");
try {
  memoryPreamble = await readFile(memorySkillPath, "utf-8");
} catch {}

const prompt = memoryPreamble
  ? `[Memory Guidelines]\n\n${memoryPreamble}\n\n[Skill: ${skillName}]\n\n${skillContent}\n\n${userMessage || "Please execute this skill."}`
  : `[Skill: ${skillName}]\n\n${skillContent}\n\n${userMessage || "Please execute this skill."}`;
```

This ensures every skill invocation includes the memory guidelines, so the agent knows to use `memory_store` and `memory_recall` during plan-week, course-brainstorm, etc.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc -p backend/tsconfig.json --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/skills.ts
git commit -m "feat: inject memory guidelines preamble into all skill invocations"
```

---

### Task 6: Inject memory guidelines into regular agent messages

**Files:**
- Modify: `backend/src/api/agent.ts`

- [ ] **Step 1: Read the agent message handler**

Read `backend/src/api/agent.ts` and find the `POST /session/:id/message` handler.

- [ ] **Step 2: Add memory preamble to agent messages**

Import the necessary modules and add the memory preamble to every user message sent to the agent. This ensures the agent has memory guidelines even in freeform chat (not just skill invocations).

At the top of the file, add:
```typescript
import { readFile } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
```

(Keep only the imports that aren't already present.)

Add a helper to load the memory guidelines (cached after first load):

```typescript
const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = resolve(__dirname, "../skills");

let cachedMemoryGuidelines: string | null = null;
async function getMemoryGuidelines(): Promise<string> {
  if (cachedMemoryGuidelines !== null) return cachedMemoryGuidelines;
  try {
    cachedMemoryGuidelines = await readFile(resolve(skillsDir, "memory-guidelines.md"), "utf-8");
  } catch {
    cachedMemoryGuidelines = "";
  }
  return cachedMemoryGuidelines;
}
```

In the message handler, before passing the user message to `client.session.prompt`, prepend the memory guidelines:

Find where the message is sent:
```typescript
body: { parts: [{ type: "text", text: message }] },
```

Replace with:
```typescript
body: { parts: [{ type: "text", text: `${memoryGuidelines}\n\n${message}` }] },
```

And add before that line:
```typescript
const memoryGuidelines = await getMemoryGuidelines();
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc -p backend/tsconfig.json --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/agent.ts
git commit -m "feat: inject memory guidelines into all agent messages"
```

---

### Task 7: Manual integration test

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Configure Cognee settings**

Open the app in a browser, go to Settings, enter a Cognee Cloud URL and API key. Verify the "Memory" service row shows "Connected" after saving.

- [ ] **Step 3: Test memory_store via chat**

In the chat panel, type: "Remember that I'm vegetarian and prefer the Garching mensa."

Verify the agent calls `memory_store` with type "preference" and appropriate text. Check the response confirms storage.

- [ ] **Step 4: Test memory_recall via chat**

In a new session (or same one), type: "What food preferences do you know about me?"

Verify the agent calls `memory_recall` and surfaces the previously stored preference.

- [ ] **Step 5: Test automatic extraction**

Type: "I'm finding the linear algebra homework really difficult this week."

Verify the agent auto-stores this as type "context" with topic related to linear algebra.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration test fixes for memory tools"
```
