import { useTodos, useToggleTodo, type Todo } from "../hooks/useTodos";

function formatBucketDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function bucketTodos(todos: Todo[]): Map<string, Todo[]> {
  const buckets = new Map<string, Todo[]>();

  for (const todo of todos) {
    const key = todo.deadline ?? "no-deadline";
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(todo);
    } else {
      buckets.set(key, [todo]);
    }
  }

  const sorted = new Map<string, Todo[]>();
  const keys = [...buckets.keys()].sort((a, b) => {
    if (a === "no-deadline") return 1;
    if (b === "no-deadline") return -1;
    return a.localeCompare(b);
  });

  for (const key of keys) {
    sorted.set(key, buckets.get(key)!);
  }

  return sorted;
}

const priorityClass: Record<string, string> = {
  high: "text-danger",
  medium: "text-warning",
  low: "text-ink-muted",
};

export function TodoPanel() {
  const { data: todos, isLoading } = useTodos();
  const toggleTodo = useToggleTodo();

  return (
    <div>
      <h2 className="text-(--text-xs) font-semibold text-ink-muted uppercase tracking-widest mb-3">
        Todos
      </h2>

      {isLoading ? (
        <p className="text-ink-muted text-(--text-sm)">Loading...</p>
      ) : !todos || todos.length === 0 ? (
        <p className="text-ink-muted text-(--text-sm)">No todos yet</p>
      ) : (
        <div className="space-y-(--spacing-section)">
          {[...bucketTodos(todos).entries()].map(([dateKey, items]) => (
            <div key={dateKey}>
              <div className="text-(--text-xs) font-medium text-ink-secondary pb-1 mb-2 border-b border-border-subtle">
                {dateKey === "no-deadline"
                  ? "No deadline"
                  : formatBucketDate(dateKey)}
              </div>
              <div className="space-y-0.5">
                {items.map((todo) => (
                  <label
                    key={todo.id}
                    className="flex items-start gap-2 hover:bg-surface-hover rounded-(--radius-sm) px-1.5 py-1 cursor-pointer animate-fade-in-up"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-accent"
                      checked={!!todo.completed}
                      onChange={() =>
                        toggleTodo.mutate({
                          id: todo.id,
                          completed: !todo.completed,
                        })
                      }
                    />
                    <span
                      className={`text-(--text-sm) ${
                        todo.completed
                          ? "line-through text-ink-faint"
                          : "text-ink"
                      }`}
                    >
                      {todo.title}
                    </span>
                    {todo.priority && (
                      <span
                        className={`text-(--text-xs) ml-auto ${
                          priorityClass[todo.priority] ?? "text-ink-muted"
                        }`}
                      >
                        {todo.priority}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
