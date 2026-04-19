import { useEvents } from "../hooks/useEvents";
import { useTodos } from "../hooks/useTodos";
import { EmailWidget } from "./EmailWidget";

// ── helpers ──────────────────────────────────────────────────────────────────

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

const PRIORITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#9ca3af",
};

// ── component ─────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { data: events } = useEvents();
  const { data: todos } = useTodos();

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const pending = (todos ?? []).filter((t) => !t.completed);
  const pendingCount = pending.length;

  const upcoming = (events ?? [])
    .filter((e) => new Date(e.start) > now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5);

  const upcomingAssignments = pending
    .filter((t) => t.type === "assignment")
    .sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    })
    .slice(0, 6);

  return (
    <div className="h-full overflow-y-auto bg-page">
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

      {/* Email widget */}
      <div className="mb-3">
        <EmailWidget />
      </div>

      <div className="grid grid-cols-5 gap-3">
        {/* Upcoming events — takes 2 cols */}
        <div className="col-span-2 bg-surface border border-border rounded-(--radius-lg) p-4">
          <h3 className="text-(--text-xs) font-mono uppercase tracking-widest text-ink-muted mb-3">
            Upcoming Events
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

        {/* Upcoming assignments — takes 3 cols */}
        <div className="col-span-3 bg-surface border border-border rounded-(--radius-lg) p-4">
          <h3 className="text-(--text-xs) font-mono uppercase tracking-widest text-ink-muted mb-3">
            Upcoming Assignments
          </h3>
          {upcomingAssignments.length === 0 ? (
            <p className="text-(--text-sm) text-ink-faint font-mono">All caught up</p>
          ) : (
            <div className="space-y-3">
              {upcomingAssignments.map((t) => (
                <div key={t.id} className="flex gap-2.5 items-start">
                  <div
                    className="w-0.5 self-stretch rounded-full flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: PRIORITY_COLORS[t.priority ?? ""] ?? "#e0ddd7" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-(--text-sm) font-medium text-ink">{t.title}</p>
                    <p className="text-(--text-xs) font-mono text-ink-muted">
                      {t.deadline ? fmtRelDay(t.deadline) : "No deadline"}
                    </p>
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
