import { useState, useCallback } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

export function useAgent() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    setMessages((prev) => [...prev, { role: "user", content: text, timestamp: Date.now() }]);
    setLoading(true);

    try {
      let sid = sessionId;
      if (!sid) {
        const createRes = await fetch("/api/agent/session", { method: "POST" });
        if (!createRes.ok) throw new Error("Failed to create agent session — is OpenCode running?");
        const session = await createRes.json();
        sid = session.id;
        if (!sid) throw new Error("Agent session created but no ID returned");
        setSessionId(sid);
      }

      const res = await fetch(`/api/agent/session/${sid}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      const textParts = (data.parts ?? [])
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("\n");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: textParts || "(Agent is working...)", timestamp: Date.now() },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message}`, timestamp: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  return { messages, sendMessage, loading };
}
