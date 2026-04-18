import { useQuery } from "@tanstack/react-query";
import { useEvents } from "../hooks/useEvents";
import { useTodos } from "../hooks/useTodos";

// ── helpers ──────────────────────────────────────────────────────────────────

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - y.getTime()) / 86400000 + 1) / 7);
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fmtRelDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

const TYPE_COLORS: Record<string, string> = {
  lecture: "#3070b3",
  study: "#16a34a",
  meal: "#d97706",
  club: "#7c3aed",
  recreation: "#db2777",
  custom: "#6b7280",
};

// ── mensa hook ────────────────────────────────────────────────────────────────

type Dish = { name: string; prices?: { students?: number } };
type DayMenu = { date: string; categories: Array<{ category: string; dishes: Dish[] }> };
type WeekMenu = { days: DayMenu[] };

function useMensaToday() {
  const now = new Date();
  const year = now.getFullYear();
  const week = String(isoWeek(now)).padStart(2, "0");
  return useQuery<WeekMenu>({
    queryKey: ["mensa", year, week],
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

// ── component ─────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { data: events } = useEvents();
  const { data: todos } = useTodos();
  const { data: menu } = useMensaToday();

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const pendingCount = (todos ?? []).filter((t) => !t.completed).length;

  const upcoming = (events ?? [])
    .filter((e) => new Date(e.start) > now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5);

  const todayMenu = menu?.days?.find((d) => d.date === todayStr);
  const menuByCategory = todayMenu?.categories ?? [];

  return (
    <div className="h-full overflow-y-auto bg-page p-(--spacing-panel)">
      {/* Header */}
      <div className="mb-5">
        <p className="text-(--text-xs) font-mono text-ink-muted uppercase tracking-widest">
          {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <h2 className="text-xl font-semibold text-ink mt-0.5">Dashboard</h2>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-surface border border-border rounded-(--radius-lg) p-4">
          <p className="text-3xl font-semibold text-accent leading-none">{pendingCount}</p>
          <p className="text-(--text-xs) font-mono text-ink-muted mt-1.5">todos remaining</p>
        </div>
        <div className="bg-surface border border-border rounded-(--radius-lg) p-4">
          <p className="text-3xl font-semibold text-accent leading-none">{upcoming.length}</p>
          <p className="text-(--text-xs) font-mono text-ink-muted mt-1.5">upcoming events</p>
        </div>
        <div className="bg-surface border border-border rounded-(--radius-lg) p-4">
          <p className="text-3xl font-semibold text-accent leading-none">
            {(events ?? []).filter((e) => e.start.startsWith(todayStr)).length}
          </p>
          <p className="text-(--text-xs) font-mono text-ink-muted mt-1.5">events today</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {/* Upcoming events — takes 2 cols */}
        <div className="col-span-2 bg-surface border border-border rounded-(--radius-lg) p-4">
          <h3 className="text-(--text-xs) font-mono uppercase tracking-widest text-ink-muted mb-3">
            Upcoming
          </h3>
          {upcoming.length === 0 ? (
            <p className="text-(--text-sm) text-ink-faint font-mono">Nothing scheduled</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((e) => (
                <div key={e.id} className="flex gap-2.5 items-start">
                  <div
                    className="w-0.5 self-stretch rounded-full flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: TYPE_COLORS[e.type] ?? TYPE_COLORS.custom }}
                  />
                  <div className="min-w-0">
                    <p className="text-(--text-sm) font-medium text-ink truncate">{e.title}</p>
                    <p className="text-(--text-xs) font-mono text-ink-muted">
                      {fmtRelDay(e.start)} · {fmtTime(e.start)}–{fmtTime(e.end)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mensa — takes 3 cols, bigger */}
        <div className="col-span-3 bg-surface border border-border rounded-(--radius-lg) p-4">
          <h3 className="text-(--text-xs) font-mono uppercase tracking-widest text-ink-muted mb-3">
            Today's Lunch · Mensa Garching
          </h3>
          {menuByCategory.length === 0 ? (
            <p className="text-(--text-sm) text-ink-faint font-mono">No menu available today</p>
          ) : (
            <div className="space-y-4">
              {menuByCategory.map((cat) => (
                <div key={cat.category}>
                  <p className="text-(--text-xs) font-mono text-ink-muted uppercase tracking-wide mb-1.5">
                    {cat.category}
                  </p>
                  <div className="space-y-1.5">
                    {cat.dishes.map((dish, i) => (
                      <div key={i} className="flex items-start justify-between gap-3">
                        <p className="text-(--text-sm) text-ink leading-snug">{dish.name}</p>
                        {dish.prices?.students != null && (
                          <span className="text-(--text-xs) font-mono text-ink-muted whitespace-nowrap flex-shrink-0">
                            €{dish.prices.students.toFixed(2)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
