import { useState } from "react";
import { useRecentEmails } from "../hooks/useRecentEmails";

function stripMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^#+\s+/gm, "");
}

export function EmailWidget() {
  const { data, isLoading, isFetching } = useRecentEmails();
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-(--radius-lg) p-4 flex items-center">
        <p className="text-(--text-xs) font-mono text-ink-faint animate-pulse">Summarising inbox…</p>
      </div>
    );
  }

  if (!data?.configured) return null;

  const cleanSummary = data.summary ? stripMarkdown(data.summary) : null;

  return (
    <>
      <button
        onClick={() => cleanSummary && setOpen(true)}
        className="w-full text-left bg-surface border border-border rounded-(--radius-lg) p-4 hover:border-accent/50 transition-colors overflow-hidden"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-(--text-xs) font-mono uppercase tracking-widest text-ink-muted">
            TUM Inbox · last 48 h · {data.count} email{data.count !== 1 ? "s" : ""}
          </h3>
          {isFetching && (
            <span className="text-(--text-xs) font-mono text-ink-faint animate-pulse">updating…</span>
          )}
        </div>

        <div className="relative">
          {data.error ? (
            <p className="text-(--text-xs) font-mono text-red-400">{data.error}</p>
          ) : cleanSummary ? (
            <>
              <p className="text-(--text-sm) text-ink leading-relaxed line-clamp-3">{cleanSummary}</p>
              <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-surface to-transparent pointer-events-none" />
            </>
          ) : (
            <p className="text-(--text-sm) font-mono text-ink-faint">No emails in the last 48 hours.</p>
          )}
        </div>
      </button>

      {open && cleanSummary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-surface border border-border rounded-(--radius-lg) w-[600px] max-h-[60vh] flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <h3 className="text-(--text-sm) font-semibold text-ink">
                TUM Inbox — last 48 hours · {data.count} email{data.count !== 1 ? "s" : ""}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-ink-muted hover:text-ink text-lg leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto">
              <p className="text-(--text-sm) text-ink leading-relaxed whitespace-pre-wrap">{cleanSummary}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
