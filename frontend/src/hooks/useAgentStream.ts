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
  }, [sessionId]);

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

  const abortSession = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    await fetch(`/api/agent/session/${sid}/abort`, { method: "POST" });
  }, []);

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
    abortSession,
    connectionStatus,
  };
}
