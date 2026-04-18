import { useState } from "react";
import {
  useTodo,
  useToggleTodo,
  useDeleteTodo,
} from "../hooks/useTodos";

const priorityColors: Record<string, { bg: string; text: string }> = {
  high: { bg: "bg-danger/10", text: "text-danger" },
  medium: { bg: "bg-warning/10", text: "text-warning" },
  low: { bg: "bg-surface-hover", text: "text-ink-muted" },
};

const typeColors: Record<string, { bg: string; text: string }> = {
  assignment: { bg: "bg-accent-subtle", text: "text-accent" },
  reading: { bg: "bg-success/10", text: "text-success" },
  exam: { bg: "bg-danger/10", text: "text-danger" },
};

function formatDate(dateStr: string): string {
  const normalized = dateStr.replace(" ", "T");
  const date = new Date(normalized);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function parseDate(dateStr: string): Date {
  const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  return new Date(datePart + "T00:00:00");
}

function formatDeadline(dateStr: string): { text: string; urgent: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = parseDate(dateStr);
  const diff = Math.round(
    (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  const formatted = deadline.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (diff < 0) return { text: `${formatted} (${-diff}d overdue)`, urgent: true };
  if (diff === 0) return { text: `${formatted} (today)`, urgent: true };
  if (diff === 1) return { text: `${formatted} (tomorrow)`, urgent: true };
  return { text: formatted, urgent: false };
}

export function TodoDetail({
  todoId,
  onBack,
}: {
  todoId: string;
  onBack: () => void;
}) {
  const { data: todo, isLoading } = useTodo(todoId);
  const toggleTodo = useToggleTodo();
  const deleteTodo = useDeleteTodo();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading || !todo) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-ink-muted text-(--text-sm)">Loading...</p>
      </div>
    );
  }

  const isCompleted = !!todo.completed;
  const pc = todo.priority ? priorityColors[todo.priority] : null;
  const tc = typeColors[todo.type] ?? { bg: "bg-surface-hover", text: "text-ink-secondary" };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[560px] mx-auto py-8 px-4">
        {/* Back link */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-(--text-sm) text-ink-muted hover:text-ink-secondary transition-colors duration-100 mb-8 cursor-pointer"
        >
          <span>&larr;</span>
          <span className="font-medium">Back to calendar</span>
        </button>

        {/* Header — checkbox, title, pills */}
        <div className="text-center mb-8">
          <button
            onClick={() =>
              toggleTodo.mutate({ id: todo.id, completed: !isCompleted })
            }
            className={`w-9 h-9 rounded-full border-[2.5px] mx-auto mb-3 flex items-center justify-center transition-colors duration-150 cursor-pointer ${
              isCompleted
                ? "bg-success border-success"
                : pc
                ? `border-${todo.priority === "high" ? "danger" : todo.priority === "medium" ? "warning" : "border"}`
                : "border-border"
            }`}
          >
            {isCompleted && (
              <span className="text-white text-sm font-bold">&#10003;</span>
            )}
          </button>

          <h1
            className={`text-2xl font-bold mb-3 ${
              isCompleted ? "line-through text-ink-muted" : "text-ink"
            }`}
          >
            {todo.title}
          </h1>

          <div className="flex justify-center gap-2 flex-wrap">
            <span
              className={`text-(--text-xs) px-2.5 py-1 rounded-full font-medium ${tc.bg} ${tc.text}`}
            >
              {todo.type}
            </span>
            {pc && (
              <span
                className={`text-(--text-xs) px-2.5 py-1 rounded-full font-medium ${pc.bg} ${pc.text}`}
              >
                {todo.priority} priority
              </span>
            )}
            {todo.course_id && (
              <span className="text-(--text-xs) px-2.5 py-1 rounded-full font-medium bg-success/10 text-success">
                {todo.course_id}
              </span>
            )}
          </div>
        </div>

        {/* Metadata card */}
        <div className="bg-surface rounded-(--radius-lg) border border-border-subtle p-5 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-(--text-xs) font-semibold text-ink-muted uppercase tracking-wider mb-1">
                Deadline
              </div>
              {todo.deadline ? (
                (() => {
                  const dl = formatDeadline(todo.deadline);
                  return (
                    <div
                      className={`text-(--text-sm) font-medium ${
                        dl.urgent ? "text-danger" : "text-ink"
                      }`}
                    >
                      {dl.text}
                    </div>
                  );
                })()
              ) : (
                <div className="text-(--text-sm) text-ink-muted">
                  No deadline
                </div>
              )}
            </div>

            <div>
              <div className="text-(--text-xs) font-semibold text-ink-muted uppercase tracking-wider mb-1">
                Course
              </div>
              <div className="text-(--text-sm) font-medium text-ink">
                {todo.course_id ?? "—"}
              </div>
            </div>

            <div>
              <div className="text-(--text-xs) font-semibold text-ink-muted uppercase tracking-wider mb-1">
                Created by
              </div>
              <div className="text-(--text-sm) font-medium text-ink flex items-center gap-1.5">
                {todo.source === "agent" ? (
                  <>
                    <span className="w-[18px] h-[18px] rounded-full bg-accent inline-flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                      AI
                    </span>
                    Agent
                  </>
                ) : (
                  "You"
                )}
              </div>
            </div>

            <div>
              <div className="text-(--text-xs) font-semibold text-ink-muted uppercase tracking-wider mb-1">
                Created
              </div>
              <div className="text-(--text-sm) font-medium text-ink">
                {formatDate(todo.created_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Description card */}
        {todo.description && (
          <div className="bg-surface rounded-(--radius-lg) border border-border-subtle p-5 mb-6">
            <div className="text-(--text-xs) font-semibold text-ink-muted uppercase tracking-wider mb-2">
              Description
            </div>
            <p className="text-(--text-sm) text-ink-secondary leading-relaxed whitespace-pre-wrap">
              {todo.description}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              toggleTodo.mutate({ id: todo.id, completed: !isCompleted })
            }
            className={`flex-1 text-(--text-sm) font-medium py-2.5 rounded-(--radius-md) transition-colors duration-150 cursor-pointer ${
              isCompleted
                ? "bg-surface border border-border text-ink-secondary hover:bg-surface-hover"
                : "bg-accent text-white hover:bg-accent-hover"
            }`}
          >
            {isCompleted ? "Mark incomplete" : "Mark complete"}
          </button>

          {confirmDelete ? (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  deleteTodo.mutate(todo.id, { onSuccess: onBack });
                }}
                className="text-(--text-sm) font-medium py-2.5 px-4 rounded-(--radius-md) bg-danger text-white hover:bg-danger/90 transition-colors duration-150 cursor-pointer"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-(--text-sm) font-medium py-2.5 px-4 rounded-(--radius-md) bg-surface border border-border text-ink-secondary hover:bg-surface-hover transition-colors duration-150 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-(--text-sm) font-medium py-2.5 px-4 rounded-(--radius-md) bg-surface border border-border text-danger hover:bg-danger/10 transition-colors duration-150 cursor-pointer"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
