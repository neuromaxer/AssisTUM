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

  // Sort buckets: dated ones first (chronologically), "no-deadline" last
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
  high: "text-red-400",
  medium: "text-yellow-400",
  low: "text-zinc-500",
};

export function TodoPanel() {
  const { data: todos, isLoading } = useTodos();
  const toggleTodo = useToggleTodo();

  return (
    <div>
      <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
        Todos
      </h2>

      {isLoading ? (
        <p className="text-zinc-600 text-sm">Loading...</p>
      ) : !todos || todos.length === 0 ? (
        <p className="text-zinc-600 text-sm">No todos yet</p>
      ) : (
        <div className="space-y-4">
          {[...bucketTodos(todos).entries()].map(([dateKey, items]) => (
            <div key={dateKey}>
              <div className="text-xs font-medium text-zinc-500 pb-1 mb-2 border-b border-zinc-800">
                {dateKey === "no-deadline"
                  ? "No deadline"
                  : formatBucketDate(dateKey)}
              </div>
              <div className="space-y-0.5">
                {items.map((todo) => (
                  <label
                    key={todo.id}
                    className="flex items-start gap-2 hover:bg-zinc-900/50 rounded px-1 py-1 cursor-pointer animate-fade-in-up"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={!!todo.completed}
                      onChange={() =>
                        toggleTodo.mutate({
                          id: todo.id,
                          completed: !todo.completed,
                        })
                      }
                    />
                    <span
                      className={`text-sm ${
                        todo.completed
                          ? "line-through text-zinc-600"
                          : "text-zinc-200"
                      }`}
                    >
                      {todo.title}
                    </span>
                    {todo.priority && (
                      <span
                        className={`text-xs ml-2 ${
                          priorityClass[todo.priority] ?? "text-zinc-500"
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
