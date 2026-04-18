# Cognee Memory Integration — Design Spec

## Overview

Add conversational memory to AssisTUM's agent using Cognee Cloud. The agent gains the ability to remember user preferences and conversation context across sessions, and recall relevant memories when answering questions or making recommendations.

## Decisions

- **Memory scope**: User preferences (stable) + conversation context (evolving)
- **Extraction model**: Hybrid — agent auto-extracts noteworthy facts, user can also explicitly say "remember X" / "forget X"
- **Backend**: Cognee Cloud REST API (no local Python process)
- **Integration pattern**: Two new MCP tools (`memory_store`, `memory_recall`), agent decides when to use them via prompt instructions
- **Memory structure**: Tagged — each memory has a `type` and optional `topic` for filtered recall

## Tool Definitions

### `memory_store`

Stores a fact in the agent's long-term memory.

**Parameters:**
| Name   | Type   | Required | Description |
|--------|--------|----------|-------------|
| `text` | string | yes      | The fact to remember, written as a clear standalone statement (e.g., "User is vegetarian", "User said they'll start the ML assignment this weekend") |
| `type` | enum   | yes      | `preference` (stable user traits/likes/dislikes) or `context` (conversation facts, plans, struggles, evolving state) |
| `topic`| string | no       | Optional grouping tag — a course name, "scheduling", "food", "study", etc. |

**Behavior:**
- Calls Cognee Cloud `remember` endpoint with `text` as the payload
- Includes `type` and `topic` as metadata
- Returns confirmation to the agent

### `memory_recall`

Retrieves relevant memories for a given query.

**Parameters:**
| Name    | Type   | Required | Description |
|---------|--------|----------|-------------|
| `query` | string | yes      | Natural language query describing what to recall |
| `type`  | enum   | no       | Filter to `preference` or `context` only |
| `topic` | string | no       | Filter to a specific topic |

**Behavior:**
- Calls Cognee Cloud `recall` endpoint with `query`
- Filters results by `type` and `topic` if provided
- Returns matched memories as a list to the agent

## Agent Prompt Updates

Add the following behavioral instructions to the agent's system prompt:

### When to store memories (automatic)
- When the user states a preference ("I'm vegetarian", "I prefer the Garching library")
- When the user shares a plan or intention ("I'll start the ML assignment this weekend")
- When the user expresses a struggle or concern ("I'm finding linear algebra really hard")
- When a meaningful decision is made during conversation ("We decided to drop the Statistics tutorial")
- Do NOT store trivial/transient facts (greetings, confirmations, one-off queries)

### When to recall memories
- Before making personalized recommendations (food, study rooms, scheduling)
- When the user references something from a past conversation ("like I said before", "remember when")
- When planning or advising on courses, studying, or scheduling
- At the start of plan-week or other skills that benefit from user context

### Explicit user commands
- "Remember that..." → call `memory_store` with the stated fact
- "Forget that..." → (future: call forget endpoint; for now, acknowledge the request)

## Implementation

### New files
- `backend/src/mcp/tools/live/memory.ts` — tool definitions + Cognee Cloud API wrapper

### Modified files
- `backend/src/mcp/tools/live/index.ts` — register the new tools
- Agent system prompt (wherever the agent's behavioral instructions live) — add memory usage guidelines
- `backend/src/db/settings.ts` or settings schema — store Cognee Cloud API key/URL

### Cognee Cloud API integration
- Base URL and API key stored in the settings table (same pattern as Moodle/TUM credentials)
- HTTP calls via fetch to Cognee Cloud endpoints
- Memory text is prefixed/tagged with type and topic for filtered retrieval

## Out of scope (future work)
- `memory_forget` tool (explicit deletion of specific memories)
- Automatic session-end memory extraction hooks
- Session-scoped memory (cognee `session_id` support)
- Memory management UI in the frontend
