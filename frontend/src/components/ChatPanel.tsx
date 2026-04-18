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
