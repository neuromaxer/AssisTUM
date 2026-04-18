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
  return applyEvent(state, action as AgentEvent);
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
      next[idx] = part as unknown as Part;
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
