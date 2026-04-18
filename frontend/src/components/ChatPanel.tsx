import { useRef, useEffect, useState, FormEvent } from "react";
import { useAgent } from "../hooks/useAgent";

export function ChatPanel() {
  const { messages, sendMessage, loading } = useAgent();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    sendMessage(text);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading && (
          <p className="text-zinc-600 font-mono text-sm">
            Type a message to start planning your week...
          </p>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="space-y-1">
            {msg.role === "user" ? (
              <>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">You</span>
                <p className="text-zinc-300 text-sm font-mono whitespace-pre-wrap">
                  {msg.content}
                </p>
              </>
            ) : (
              <>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-tum-blue" />
                  AssisTUM
                </span>
                <p className="text-zinc-100 text-sm font-mono whitespace-pre-wrap">
                  {msg.content}
                </p>
              </>
            )}
          </div>
        ))}

        {loading && (
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-tum-blue" />
              AssisTUM
            </span>
            <p className="text-zinc-400 text-sm font-mono animate-pulse">Agent is working...</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-800/80 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AssisTUM..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-tum-blue/50 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-tum-blue hover:bg-tum-blue-light disabled:opacity-40 text-sm px-4 py-2.5 rounded-lg font-medium transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
