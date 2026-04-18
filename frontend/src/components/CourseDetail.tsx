import { useCourse } from "../hooks/useCourses";
import { useEvents } from "../hooks/useEvents";
import { useTodos } from "../hooks/useTodos";

function formatDate(dateStr: string): string {
  const normalized = dateStr.replace(" ", "T");
  const d = new Date(normalized);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr.replace(" ", "T"));
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false });
}

export function CourseDetail({
  courseId,
  onBack,
  onOpenTodo,
}: {
  courseId: string;
  onBack: () => void;
  onOpenTodo?: (id: string) => void;
}) {
  const { data: course, isLoading } = useCourse(courseId);
  const { data: allEvents } = useEvents();
  const { data: allTodos } = useTodos();

  if (isLoading || !course) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-ink-muted text-(--text-sm)">Loading...</p>
      </div>
    );
  }

  const events = (allEvents ?? [])
    .filter((e) => e.course_id === courseId)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.start) >= now);
  const past = events.filter((e) => new Date(e.start) < now);

  const todos = (allTodos ?? [])
    .filter((t) => t.course_id === courseId)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed - b.completed;
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      return a.deadline ? -1 : 1;
    });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[680px] mx-auto py-8 px-4">
        {/* Back link */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-(--text-sm) text-ink-muted hover:text-ink-secondary transition-colors duration-100 mb-8 cursor-pointer"
        >
          <span>&larr;</span>
          <span className="font-medium">Back to calendar</span>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-ink mb-3">{course.name}</h1>
          <div className="flex justify-center gap-2 flex-wrap">
            {course.module_code && (
              <span className="text-(--text-xs) px-2.5 py-1 rounded-full font-medium bg-accent-subtle text-accent">
                {course.module_code}
              </span>
            )}
            {course.semester_name && (
              <span className="text-(--text-xs) px-2.5 py-1 rounded-full font-medium bg-surface-hover text-ink-secondary">
                {course.semester_name}
              </span>
            )}
            {course.course_type && (
              <span className="text-(--text-xs) px-2.5 py-1 rounded-full font-medium bg-surface-hover text-ink-secondary">
                {course.course_type}
              </span>
            )}
          </div>
        </div>

        {/* Metadata card — only show fields that have values */}
        {(() => {
          const fields: { label: string; value: React.ReactNode }[] = [];
          if (course.lecturers) fields.push({ label: "Lecturers", value: course.lecturers });
          if (course.department) fields.push({ label: "Department", value: course.department });
          if (course.sws) fields.push({ label: "SWS", value: course.sws });
          fields.push({
            label: "Source",
            value: (
              <span className="flex items-center gap-1.5">
                {course.source === "tum_online" ? (
                  <>
                    <span className="w-[18px] h-[18px] rounded-full bg-accent inline-flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">T</span>
                    TUM Online
                  </>
                ) : course.source === "agent" ? (
                  <>
                    <span className="w-[18px] h-[18px] rounded-full bg-accent inline-flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">AI</span>
                    Agent
                  </>
                ) : "Manual"}
              </span>
            ),
          });
          return (
            <div className="bg-surface rounded-(--radius-lg) border border-border-subtle p-5 mb-4">
              <div className="grid grid-cols-2 gap-4">
                {fields.map((f) => (
                  <div key={f.label}>
                    <div className="text-(--text-xs) font-semibold text-ink-muted uppercase tracking-wider mb-1">{f.label}</div>
                    <div className="text-(--text-sm) font-medium text-ink">{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Upcoming events */}
        <div className="mb-4">
          <h2 className="text-(--text-sm) font-semibold text-ink mb-2">
            Upcoming ({upcoming.length})
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-(--text-sm) text-ink-muted">No upcoming lectures</p>
          ) : (
            <div className="bg-surface rounded-(--radius-lg) border border-border-subtle divide-y divide-border-subtle">
              {upcoming.map((e) => (
                <div key={e.id} className="flex items-start gap-4 px-4 py-2.5">
                  <div className="flex-shrink-0 w-24">
                    <div className="text-(--text-xs) text-ink-muted">{formatDate(e.start)}</div>
                    <div className="text-(--text-xs) text-accent font-medium whitespace-nowrap">
                      {formatTime(e.start)}{" \u2013 "}{formatTime(e.end)}
                    </div>
                  </div>
                  <div className="text-(--text-sm) text-ink flex-1 min-w-0">{e.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past events */}
        {past.length > 0 && (
          <div className="mb-4">
            <h2 className="text-(--text-sm) font-semibold text-ink-muted mb-2">
              Past ({past.length})
            </h2>
            <div className="bg-surface rounded-(--radius-lg) border border-border-subtle divide-y divide-border-subtle opacity-60">
              {past.slice(-5).map((e) => (
                <div key={e.id} className="flex items-start gap-4 px-4 py-2.5">
                  <div className="flex-shrink-0 w-24">
                    <div className="text-(--text-xs) text-ink-muted">{formatDate(e.start)}</div>
                    <div className="text-(--text-xs) text-ink-muted font-medium whitespace-nowrap">
                      {formatTime(e.start)}{" \u2013 "}{formatTime(e.end)}
                    </div>
                  </div>
                  <div className="text-(--text-sm) text-ink-muted flex-1 min-w-0">{e.title}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Linked todos */}
        <div className="mb-4">
          <h2 className="text-(--text-sm) font-semibold text-ink mb-2">
            Todos ({todos.length})
          </h2>
          {todos.length === 0 ? (
            <p className="text-(--text-sm) text-ink-muted">No linked todos</p>
          ) : (
            <div className="bg-surface rounded-(--radius-lg) border border-border-subtle divide-y divide-border-subtle">
              {todos.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-surface-hover transition-colors duration-100"
                  onClick={() => onOpenTodo?.(t.id)}
                >
                  <div className={`w-[10px] h-[10px] rounded-full flex-shrink-0 mt-1 ${t.completed ? "bg-success" : "border-2 border-border"}`} />
                  <div className={`text-(--text-sm) flex-1 min-w-0 ${t.completed ? "text-ink-muted line-through" : "text-ink"}`}>
                    {t.title}
                  </div>
                  {t.deadline && (
                    <div className="text-(--text-xs) text-ink-muted flex-shrink-0 whitespace-nowrap pt-0.5">
                      {formatDate(t.deadline)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
