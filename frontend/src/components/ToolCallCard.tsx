import { useState } from "react";
import type { ToolPart } from "../types/agent";

interface ToolCallCardProps {
  part: ToolPart;
}

export function ToolCallCard({ part }: ToolCallCardProps) {
  const { tool, state } = part;
  const status = state.status;
  const isRunning = status === "running";
  const isError = status === "error";
  const isCompleted = status === "completed";

  const [open, setOpen] = useState(isRunning || isError);

  const title =
    (isCompleted || isRunning) && state.title ? state.title : tool;

  return (
    <div className="border border-border rounded-(--radius-md) overflow-hidden my-1">
      <button
        className="flex items-center gap-2 w-full px-3 py-1.5 bg-surface border-none cursor-pointer text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="flex-1 font-mono text-(--text-xs) text-ink truncate">
          {title}
        </span>
        <span className={`font-mono text-[10px] tracking-wider flex items-center gap-1 ${
          isError ? "text-danger" : isRunning ? "text-warning" : isCompleted ? "text-success" : "text-ink-muted"
        }`}>
          {isRunning && <span className="inline-block animate-spin">&#x27F3;</span>}
          {isError ? "error" : isRunning ? "running" : isCompleted ? "done" : "pending"}
        </span>
        <span className="text-[9px] text-ink-muted">
          {open ? "\u25BE" : "\u25B8"}
        </span>
      </button>
      {open && (
        <div className="px-3 py-2 border-t border-border bg-page">
          {isError && (
            <pre className="font-mono text-(--text-xs) text-danger m-0 whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto">
              {state.error}
            </pre>
          )}
          {isCompleted && (
            <pre className="font-mono text-(--text-xs) text-ink m-0 whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto leading-snug">
              {state.output || "(no output)"}
            </pre>
          )}
          {isRunning && (
            <span className="font-mono text-(--text-xs) text-ink-muted">Running...</span>
          )}
          {status === "pending" && (
            <span className="font-mono text-(--text-xs) text-ink-muted">Pending...</span>
          )}
        </div>
      )}
    </div>
  );
}
