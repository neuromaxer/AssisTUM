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
