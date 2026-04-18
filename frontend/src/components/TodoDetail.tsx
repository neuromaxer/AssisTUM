import { useState } from "react";
import {
  useTodo,
  useToggleTodo,
  useDeleteTodo,
  type TodoResource,
} from "../hooks/useTodos";
import { useCourse } from "../hooks/useCourses";

const priorityColors: Record<string, { bg: string; text: string }> = {
  high: { bg: "bg-danger/10", text: "text-danger" },
  medium: { bg: "bg-warning/10", text: "text-warning" },
  low: { bg: "bg-surface-hover", text: "text-ink-muted" },
};

const typeColors: Record<string, { bg: string; text: string }> = {
  assignment: { bg: "bg-accent-subtle", text: "text-accent" },
  reading: { bg: "bg-success/10", text: "text-success" },
  exam: { bg: "bg-danger/10", text: "text-danger" },
  email_action: { bg: "bg-accent-subtle", text: "text-accent" },
};

const typeLabels: Record<string, string> = {
  email_action: "Email",
  assignment: "Assignment",
  reading: "Reading",
  exam: "Exam",
  study: "Study",
  personal: "Personal",
  revision: "Revision",
};

function formatSourceLink(link: string): { label: string; href: string } {
  if (link.startsWith("mailto:")) {
    const subjectMatch = link.match(/subject=([^&]*)/);
    const subject = subjectMatch ? decodeURIComponent(subjectMatch[1]) : null;
    return { label: subject || "Email", href: link };
  }
  try {
    const url = new URL(link);
    return { label: url.hostname + url.pathname, href: link };
  } catch {
    return { label: link, href: link };
  }
}

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
  onOpenCourse,
}: {
  todoId: string;
  onBack: () => void;
  onOpenCourse?: (id: string) => void;
}) {
  const { data: todo, isLoading } = useTodo(todoId);
  const toggleTodo = useToggleTodo();
  const deleteTodo = useDeleteTodo();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: course } = useCourse(todo?.course_id ?? null);

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
              {typeLabels[todo.type] ?? todo.type}
            </span>
            {pc && (
              <span
                className={`text-(--text-xs) px-2.5 py-1 rounded-full font-medium ${pc.bg} ${pc.text}`}
              >
                {todo.priority} priority
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
              {todo.course_id && course ? (
                <button
                  onClick={() => onOpenCourse?.(todo.course_id!)}
                  className="text-(--text-sm) font-medium text-accent hover:underline cursor-pointer text-left"
                >
                  {course.name}
                </button>
              ) : (
                <div className="text-(--text-sm) font-medium text-ink">
                  {todo.course_id ? "Loading..." : "\u2014"}
                </div>
              )}
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

            {todo.source_link && (() => {
              const src = formatSourceLink(todo.source_link);
              return (
                <div>
                  <div className="text-(--text-xs) font-semibold text-ink-muted uppercase tracking-wider mb-1">
                    Source
                  </div>
                  <a
                    href={src.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-(--text-sm) font-medium text-accent hover:underline flex items-center gap-1 break-all"
                  >
                    {src.label}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 flex-shrink-0">
                      <path d="M8.914 6.025a.75.75 0 0 1 1.06 0 3.5 3.5 0 0 1 0 4.95l-2 2a3.5 3.5 0 0 1-5.054-4.838.75.75 0 0 1 1.06 1.06 2 2 0 0 0 2.934 2.718l2-2a2 2 0 0 0 0-2.83.75.75 0 0 1 0-1.06Zm1.172-2.95a3.5 3.5 0 0 1 0 4.95.75.75 0 0 1-1.06-1.06 2 2 0 0 0-2.934-2.718l-2 2a2 2 0 0 0 0 2.83.75.75 0 0 1-1.06 1.06 3.5 3.5 0 0 1 0-4.95l2-2a3.5 3.5 0 0 1 4.95 0l.104.088Z" />
                    </svg>
                  </a>
                </div>
              );
            })()}
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

        {/* Resources */}
        {todo.resources && (() => {
          let parsed: TodoResource[] = [];
          try { parsed = JSON.parse(todo.resources); } catch { /* ignore */ }
          if (parsed.length === 0) return null;
          return (
            <div className="bg-surface rounded-(--radius-lg) border border-border-subtle p-5 mb-6">
              <div className="text-(--text-xs) font-semibold text-ink-muted uppercase tracking-wider mb-3">
                Resources ({parsed.length})
              </div>
              <div className="space-y-3">
                {parsed.map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-ink-muted mt-0.5 flex-shrink-0">
                      <path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 12.5 5H7.621a1.5 1.5 0 0 1-1.06-.44L5.439 3.44A1.5 1.5 0 0 0 4.378 3H3.5Z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-(--text-sm) font-medium text-accent hover:underline"
                      >
                        {r.title}
                      </a>
                      {r.summary && (
                        <p className="text-(--text-xs) text-ink-muted mt-0.5 leading-relaxed">
                          {r.summary}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

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
