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
