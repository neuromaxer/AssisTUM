import { useRef, useEffect, useState, useCallback, type KeyboardEvent, useMemo } from "react";
import { useAgentStream } from "../hooks/useAgentStream";
import { useSkills, type Skill } from "../hooks/useSkills";
import { Markdown } from "./Markdown";
import { ToolCallCard } from "./ToolCallCard";
import { SessionPicker } from "./SessionPicker";
import { SlashCommandPalette } from "./SkillBar";
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
  const { data: allSkills = [] } = useSkills();

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pinnedRef = useRef(true);

  const turns = useMemo(() => groupIntoTurns(state.messages), [state.messages]);
  const isRunning = state.status === "running";

  const filteredSkills = useMemo(() => {
    if (!slashOpen) return [];
    const filter = input.slice(1).toLowerCase();
    return allSkills.filter(
      (s) =>
        s.name.includes(filter) ||
        s.description.toLowerCase().includes(filter),
    );
  }, [slashOpen, input, allSkills]);

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

  const handleInputChange = (value: string) => {
    setInput(value);
    if (value.startsWith("/")) {
      setSlashOpen(true);
      setSlashIndex(0);
    } else {
      setSlashOpen(false);
    }
  };

  const invokeSkill = useCallback(async (skill: Skill) => {
    setInput("");
    setSlashOpen(false);
    setSending(true);
    pinnedRef.current = true;
    try {
      const sid = await ensureSession();
      await fetch(`/api/skills/${encodeURIComponent(skill.name)}/invoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      });
    } catch (err) {
      console.error("Failed to invoke skill:", err);
    } finally {
      setSending(false);
    }
  }, [ensureSession]);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || isRunning) return;
    setInput("");
    setSlashOpen(false);
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
    if (slashOpen && filteredSkills.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => Math.min(i + 1, filteredSkills.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const skill = filteredSkills[slashIndex];
        if (skill) invokeSkill(skill);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlashOpen(false);
        return;
      }
    }
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
            Type a message or press <span className="text-ink-secondary">/</span> for skills...
          </p>
        )}

        {turns.map((turn) => (
          <div key={turn.user.id} className="space-y-(--spacing-section)">
            <div className="space-y-1">
              <span className="text-(--text-xs) text-ink-muted uppercase tracking-wider">You</span>
              {(state.parts[turn.user.id] ?? []).map(renderPart)}
              {!(state.parts[turn.user.id]?.length) && (
                <p className="text-ink-secondary text-(--text-sm) font-mono whitespace-pre-wrap">(prompt)</p>
              )}
            </div>

            {turn.assistants.map((asst) => (
              <div key={asst.id} className="space-y-1">
                <span className="text-(--text-xs) text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  AssisTUM
                </span>
                {(state.parts[asst.id] ?? []).map(renderPart)}
                {asst.error ? (
                  <div className="font-mono text-(--text-xs) text-danger bg-danger/10 rounded-(--radius-sm) px-2 py-1.5">
                    {JSON.stringify(asst.error)}
                  </div>
                ) : null}
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

      {/* Input */}
      <div className="relative p-3 border-t border-border">
        {slashOpen && (
          <SlashCommandPalette
            skills={filteredSkills}
            selectedIndex={slashIndex}
            onSelect={invokeSkill}
            onClose={() => setSlashOpen(false)}
          />
        )}
        <form onSubmit={handleSubmit} className="flex gap-(--spacing-element)">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRunning ? "Agent is working..." : "Ask AssisTUM... (/ for skills)"}
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
    </div>
  );
}
