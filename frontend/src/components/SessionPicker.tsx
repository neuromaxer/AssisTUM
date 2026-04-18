import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Session {
  id: string;
  title?: string;
  createdAt?: string;
}

interface SessionPickerProps {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => Promise<void>;
  onDeleteSession?: (id: string) => Promise<void>;
}

export function SessionPicker({
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}: SessionPickerProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["sessions"],
    queryFn: async () => {
      const res = await fetch("/api/agent/session");
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const label = activeSession?.title || (activeSessionId ? activeSessionId.slice(0, 8) + "..." : "No session");

  const handleNew = async () => {
    setCreating(true);
    try {
      await onNewSession();
      qc.invalidateQueries({ queryKey: ["sessions"] });
    } finally {
      setCreating(false);
      setOpen(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!onDeleteSession) return;
    await onDeleteSession(id);
    qc.invalidateQueries({ queryKey: ["sessions"] });
  };

  return (
    <div className="flex items-center justify-between px-(--spacing-panel) py-2 border-b border-border" ref={dropdownRef}>
      <div className="flex items-center gap-2">
        <span className="text-(--text-xs) text-ink-muted uppercase tracking-wider font-mono">Session</span>
        <button
          className="text-(--text-xs) text-ink bg-surface-hover border border-border rounded-(--radius-md) px-2.5 py-1 cursor-pointer flex items-center gap-1 hover:bg-surface-active transition-colors"
          onClick={() => setOpen(!open)}
        >
          {label}
          <span className="text-[9px] text-ink-muted">{open ? "\u25BE" : "\u25B8"}</span>
        </button>
      </div>
      <button
        className="text-(--text-xs) text-accent bg-transparent border border-accent/30 rounded-(--radius-md) px-2.5 py-1 cursor-pointer hover:bg-accent-subtle transition-colors"
        onClick={handleNew}
        disabled={creating}
      >
        {creating ? "..." : "+ New"}
      </button>

      {open && (
        <div className="absolute top-full left-(--spacing-panel) right-(--spacing-panel) mt-1 bg-surface border border-border rounded-(--radius-md) shadow-sm z-10 max-h-[240px] overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="px-3 py-3 text-(--text-xs) text-ink-muted font-mono">No sessions yet</div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                className={`flex items-center w-full px-3 py-2 text-left border-none cursor-pointer transition-colors ${
                  s.id === activeSessionId
                    ? "bg-accent-subtle border-l-2 border-l-accent"
                    : "bg-transparent hover:bg-surface-hover"
                }`}
                onClick={() => {
                  onSelectSession(s.id);
                  setOpen(false);
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-(--text-xs) text-ink truncate">
                    {s.title || "Untitled"}
                  </div>
                  <div className="text-[10px] text-ink-muted font-mono">{s.id.slice(0, 8)}</div>
                </div>
                {onDeleteSession && (
                  <button
                    className="text-ink-muted hover:text-danger text-sm bg-transparent border-none cursor-pointer px-1 leading-none"
                    onClick={(e) => handleDelete(e, s.id)}
                    title="Delete session"
                  >
                    &times;
                  </button>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
