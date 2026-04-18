import { useQuery } from "@tanstack/react-query";
import { useEvents } from "../hooks/useEvents";
import { useTodos, useToggleTodo } from "../hooks/useTodos";

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

type Dish = { name: string; prices?: { students?: number } };
type DayMenu = { date: string; categories: Array<{ category: string; dishes: Dish[] }> };
type WeekMenu = { days: DayMenu[] };

function useTodayMenu() {
  const now = new Date();
  const year = now.getFullYear();
  const week = String(getISOWeek(now)).padStart(2, "0");
  return useQuery<WeekMenu>({
    queryKey: ["canteen", year, week],
    queryFn: async () => {
      const res = await fetch(
        `https://tum-dev.github.io/eat-api/mensa-garching/${year}/${week}.json`
      );
      if (!res.ok) throw new Error("no menu");
      return res.json();
    },
    staleTime: 1000 * 60 * 30,
  });
}

const TYPE_COLORS: Record<string, string> = {
  lecture: "#3070b3",
  study: "#16a34a",
  meal: "#d97706",
  club: "#7c3aed",
  recreation: "#db2777",
  custom: "#6b7280",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric" });
}

export function Dashboard() {
  const { data: events } = useEvents();
  const { data: todos } = useTodos();
  const { data: menu } = useTodayMenu();
  const toggleTodo = useToggleTodo();

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const upcoming = (events ?? [])
    .filter((e) => new Date(e.start) > now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5);

  const todayClasses = (events ?? []).filter(
    (e) => e.start.startsWith(todayStr) && e.type === "lecture"
  );

  const pendingTodos = (todos ?? []).filter((t) => !t.completed);
  const urgentTodos = pendingTodos
    .filter((t) => t.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 3);

  const todayMenu = menu?.days?.find((d) => d.date === todayStr);
  const dishes = todayMenu?.categories?.flatMap((c) => c.dishes).slice(0, 4) ?? [];

  return (
    <div className="h-full overflow-y-auto p-(--spacing-panel)">
      {/* Header */}
      <div className="mb-6">
        <p className="text-(--text-xs) text-ink-muted font-mono uppercase tracking-widest mb-1">
          {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h2 className="text-2xl font-semibold text-ink tracking-tight">Dashboard</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Stats row */}
        <div className="col-span-2 grid grid-cols-3 gap-3">
          {[
            { label: "Classes today", value: todayClasses.length },
            { label: "Todos pending", value: pendingTodos.length },
            { label: "Upcoming events", value: upcoming.length },
          ].map((s) => (
            <div key={s.label} className="bg-surface border border-border rounded-(--radius-lg) p-4">
              <p className="text-3xl font-semibold text-accent">{s.value}</p>
              <p className="text-(--text-xs) text-ink-muted mt-1 font-mono">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Next Up */}
        <div className="bg-surface border border-border rounded-(--radius-lg) p-4">
          <h3 className="text-(--text-xs) font-mono uppercase tracking-widest text-ink-muted mb-3">
            Next Up
          </h3>
          {upcoming.length === 0 ? (
            <p className="text-(--text-sm) text-ink-faint font-mono">No upcoming events</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((e) => (
                <div key={e.id} className="flex items-start gap-2.5">
                  <div
                    className="w-1 rounded-full mt-1 flex-shrink-0"
                    style={{
                      height: "36px",
                      backgroundColor: TYPE_COLORS[e.type] ?? TYPE_COLORS.custom,
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-(--text-sm) font-medium text-ink truncate">{e.title}</p>
                    <p className="text-(--text-xs) font-mono text-ink-muted">
                      {formatDate(e.start)} · {formatTime(e.start)}–{formatTime(e.end)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Lunch */}
        <div className="bg-surface border border-border rounded-(--radius-lg) p-4">
          <h3 className="text-(--text-xs) font-mono uppercase tracking-widest text-ink-muted mb-3">
            Today's Lunch · Mensa Garching
          </h3>
          {dishes.length === 0 ? (
            <p className="text-(--text-sm) text-ink-faint font-mono">No menu available</p>
          ) : (
            <div className="space-y-2.5">
              {dishes.map((d, i) => (
                <div key={i} className="flex items-start justify-between gap-2">
                  <p className="text-(--text-sm) text-ink leading-snug">{d.name}</p>
                  {d.prices?.students != null && (
                    <span className="text-(--text-xs) font-mono text-ink-muted whitespace-nowrap">
                      €{d.prices.students.toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Urgent Todos */}
        {urgentTodos.length > 0 && (
          <div className="col-span-2 bg-surface border border-border rounded-(--radius-lg) p-4">
            <h3 className="text-(--text-xs) font-mono uppercase tracking-widest text-ink-muted mb-3">
              Deadlines Coming Up
            </h3>
            <div className="space-y-2">
              {urgentTodos.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 group">
                  <button
                    onClick={() => toggleTodo.mutate({ id: t.id, completed: true })}
                    className="flex items-center gap-2 text-left min-w-0"
                  >
                    <span className="w-4 h-4 rounded-full border border-border group-hover:border-accent flex-shrink-0 transition-colors duration-150" />
                    <p className="text-(--text-sm) text-ink group-hover:text-ink-secondary transition-colors duration-150 truncate">
                      {t.title}
                    </p>
                  </button>
                  {t.deadline && (
                    <span className="text-(--text-xs) font-mono text-warning whitespace-nowrap">
                      due {formatDate(t.deadline)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
