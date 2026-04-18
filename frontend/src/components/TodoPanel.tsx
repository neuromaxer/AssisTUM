import { useState } from "react";
import { useTodos, useToggleTodo, type Todo } from "../hooks/useTodos";

const priorityBorder: Record<string, string> = {
  high: "border-danger",
  medium: "border-warning",
};

function parseDate(dateStr: string): Date {
  const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  return new Date(datePart + "T00:00:00");
}

function deadlineLabel(dateStr: string): { text: string; urgent: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = parseDate(dateStr);
  const diff = Math.round(
    (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return { text: `${-diff}d late`, urgent: true };
  if (diff === 0) return { text: "Today", urgent: true };
  if (diff === 1) return { text: "Tomorrow", urgent: true };
  if (diff <= 7)
    return {
      text: deadline.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      urgent: false,
    };
  return {
    text: deadline.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    urgent: false,
  };
}

function bucketByDeadline(todos: Todo[]): Map<string, Todo[]> {
  const buckets = new Map<string, Todo[]>();
  for (const todo of todos) {
    const key = todo.deadline ? bucketKey(todo.deadline) : "no-deadline";
    const bucket = buckets.get(key);
    if (bucket) bucket.push(todo);
    else buckets.set(key, [todo]);
  }

  const sorted = new Map<string, Todo[]>();
  const keys = [...buckets.keys()].sort((a, b) => {
    if (a === "no-deadline") return 1;
    if (b === "no-deadline") return -1;
    return a.localeCompare(b);
  });
  for (const key of keys) sorted.set(key, buckets.get(key)!);
  return sorted;
}

function bucketKey(dateStr: string): string {
  return dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
}

function formatBucketDate(dateStr: string): string {
  const date = parseDate(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function TodoPanel({
  onOpenTodo,
}: {
  onOpenTodo: (id: string) => void;
}) {
  const { data: todos, isLoading } = useTodos();
  const toggleTodo = useToggleTodo();
  const [completedOpen, setCompletedOpen] = useState(false);

  const pending = todos?.filter((t) => !t.completed) ?? [];
  const completed = todos?.filter((t) => !!t.completed) ?? [];
  const total = todos?.length ?? 0;
  const completedCount = completed.length;
  const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-(--text-lg) font-bold text-ink">Today</h2>
          <div className="flex items-center gap-1.5">
            <span className="text-(--text-lg) font-bold text-ink">
              {pending.length}
            </span>
            <span className="text-(--text-xs) text-ink-muted">remaining</span>
          </div>
        </div>
        <div className="text-(--text-xs) text-ink-muted mb-3">{dateStr}</div>

        {/* Progress bar */}
        <div className="flex items-center gap-2.5">
          <div className="flex-1 h-1.5 bg-surface-active rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-(--text-xs) font-semibold text-accent">
            {progress}%
          </span>
        </div>
      </div>

      {/* Todo list */}
      <div className="flex-1 overflow-y-auto -mx-(--spacing-panel) px-(--spacing-panel)">
        {isLoading ? (
          <p className="text-ink-muted text-(--text-sm)">Loading...</p>
        ) : pending.length === 0 && completedCount === 0 ? (
          <p className="text-ink-muted text-(--text-sm)">No todos yet</p>
        ) : pending.length === 0 ? (
          <p className="text-ink-muted text-(--text-sm) mb-4">
            All done!
          </p>
        ) : (
          <div>
            {[...bucketByDeadline(pending).entries()].map(
              ([dateKey, items]) => (
                <div key={dateKey} className="mb-3">
                  <div className="text-(--text-xs) font-medium text-ink-muted mb-1.5">
                    {dateKey === "no-deadline"
                      ? "No deadline"
                      : formatBucketDate(dateKey)}
                  </div>
                  <div>
                    {items.map((todo, i) => (
                      <div
                        key={todo.id}
                        className={`flex items-center gap-2.5 py-2.5 cursor-pointer hover:bg-surface-hover -mx-1.5 px-1.5 rounded-(--radius-sm) transition-colors duration-100 ${
                          i < items.length - 1
                            ? "border-b border-border-subtle"
                            : ""
                        }`}
                        onClick={() => onOpenTodo(todo.id)}
                      >
                        {/* Checkbox circle */}
                        <button
                          className={`w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 transition-colors duration-100 ${
                            priorityBorder[todo.priority ?? ""] ??
                            "border-border"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTodo.mutate({
                              id: todo.id,
                              completed: true,
                            });
                          }}
                        />

                        {/* Title */}
                        <span className="text-(--text-sm) font-medium text-ink flex-1 truncate">
                          {todo.title}
                        </span>

                        {/* Source link */}
                        {todo.source_link && (
                          <a
                            href={todo.source_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex-shrink-0 text-ink-muted hover:text-accent transition-colors duration-100"
                            title="Open source"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                              <path d="M8.914 6.025a.75.75 0 0 1 1.06 0 3.5 3.5 0 0 1 0 4.95l-2 2a3.5 3.5 0 0 1-5.054-4.838.75.75 0 0 1 1.06 1.06 2 2 0 0 0 2.934 2.718l2-2a2 2 0 0 0 0-2.83.75.75 0 0 1 0-1.06Zm1.172-2.95a3.5 3.5 0 0 1 0 4.95.75.75 0 0 1-1.06-1.06 2 2 0 0 0-2.934-2.718l-2 2a2 2 0 0 0 0 2.83.75.75 0 0 1-1.06 1.06 3.5 3.5 0 0 1 0-4.95l2-2a3.5 3.5 0 0 1 4.95 0l.104.088Z" />
                            </svg>
                          </a>
                        )}

                        {/* Deadline badge */}
                        {todo.deadline && (() => {
                          const dl = deadlineLabel(todo.deadline);
                          return (
                            <span
                              className={`text-(--text-xs) px-1.5 py-0.5 rounded flex-shrink-0 font-medium ${
                                dl.urgent
                                  ? "bg-danger/10 text-danger"
                                  : "text-ink-muted"
                              }`}
                            >
                              {dl.text}
                            </span>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Completed section */}
        {completedCount > 0 && (
          <div className="mt-2 pt-3 border-t border-dashed border-border">
            <button
              className="flex items-center gap-1.5 text-(--text-xs) font-medium text-ink-muted mb-2 hover:text-ink-secondary transition-colors duration-100"
              onClick={() => setCompletedOpen(!completedOpen)}
            >
              <span className="text-success">&#10003;</span>
              {completedCount} completed
              <span
                className={`text-[10px] transition-transform duration-150 ${
                  completedOpen ? "" : "-rotate-90"
                }`}
              >
                &#9662;
              </span>
            </button>

            {completedOpen && (
              <div className="animate-fade-in-up">
                {completed.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-2.5 py-1.5 opacity-45 cursor-pointer hover:opacity-65 transition-opacity duration-100 -mx-1.5 px-1.5"
                    onClick={() => onOpenTodo(todo.id)}
                  >
                    <div className="w-[18px] h-[18px] rounded-full bg-success flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[10px]">&#10003;</span>
                    </div>
                    <span className="text-(--text-sm) text-ink-muted line-through truncate">
                      {todo.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
