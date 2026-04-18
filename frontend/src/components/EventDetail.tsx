import { useState } from "react";
import { useEvent, useDeleteEvent } from "../hooks/useEvents";
import { useCourse } from "../hooks/useCourses";

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  lecture: { bg: "bg-blue-500/10", text: "text-blue-600" },
  study: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
  meal: { bg: "bg-amber-500/10", text: "text-amber-600" },
  club: { bg: "bg-violet-500/10", text: "text-violet-600" },
  recreation: { bg: "bg-pink-500/10", text: "text-pink-600" },
  custom: { bg: "bg-surface-hover", text: "text-ink-secondary" },
};

const typeLabels: Record<string, string> = {
  lecture: "Lecture",
  study: "Study",
  meal: "Meal",
  club: "Club",
  recreation: "Recreation",
  custom: "Custom",
};

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr.replace(" ", "T"));
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }) + " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false });
}

function formatTimeRange(start: string, end: string): string {
  const s = new Date(start.replace(" ", "T"));
  const e = new Date(end.replace(" ", "T"));
  const sameDay = s.toDateString() === e.toDateString();

  const date = s.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startTime = s.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false });
  const endTime = e.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false });

  if (sameDay) return `${date}, ${startTime} \u2013 ${endTime}`;
  return `${formatDateTime(start)} \u2013 ${formatDateTime(end)}`;
}

function durationText(start: string, end: string): string {
  const ms = new Date(end.replace(" ", "T")).getTime() - new Date(start.replace(" ", "T")).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function EventDetail({
  eventId,
  onBack,
  onOpenCourse,
}: {
  eventId: string;
  onBack: () => void;
  onOpenCourse?: (id: string) => void;
}) {
  const { data: event, isLoading } = useEvent(eventId);
  const deleteEvent = useDeleteEvent();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: course } = useCourse(event?.course_id ?? null);

  if (isLoading || !event) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-ink-muted text-(--text-sm)">Loading...</p>
      </div>
    );
  }

  const tc = TYPE_COLORS[event.type] ?? TYPE_COLORS.custom;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[560px] mx-auto py-8 px-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-(--text-sm) text-ink-muted hover:text-ink-secondary transition-colors duration-100 mb-8 cursor-pointer"
        >
          <span>&larr;</span>
          <span className="font-medium">Back to calendar</span>
        </button>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-ink mb-3">{event.title}</h1>
          <div className="flex justify-center gap-2 flex-wrap">
            <span className={`text-(--text-xs) px-2.5 py-1 rounded-full font-medium ${tc.bg} ${tc.text}`}>
              {typeLabels[event.type] ?? event.type}
            </span>
          </div>
        </div>

        <div className="bg-surface rounded-(--radius-lg) border border-border-subtle p-5 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-(--text-xs) font-semibold text-ink-muted uppercase tracking-wider mb-1">When</div>
              <div className="text-(--text-sm) font-medium text-ink">{formatTimeRange(event.start, event.end)}</div>
            </div>
            <div>
              <div className="text-(--text-xs) font-semibold text-ink-muted uppercase tracking-wider mb-1">Duration</div>
              <div className="text-(--text-sm) font-medium text-ink">{durationText(event.start, event.end)}</div>
            </div>
            {event.course_id && course && (
              <div>
                <div className="text-(--text-xs) font-semibold text-ink-muted uppercase tracking-wider mb-1">Course</div>
                <button
                  onClick={() => onOpenCourse?.(event.course_id!)}
                  className="text-(--text-sm) font-medium text-accent hover:underline cursor-pointer text-left"
                >
                  {course.name}
                </button>
              </div>
            )}
            <div>
              <div className="text-(--text-xs) font-semibold text-ink-muted uppercase tracking-wider mb-1">Source</div>
              <div className="text-(--text-sm) font-medium text-ink flex items-center gap-1.5">
                {event.source === "agent" ? (
                  <>
                    <span className="w-[18px] h-[18px] rounded-full bg-accent inline-flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">AI</span>
                    Agent
                  </>
                ) : event.source === "tum_online" ? (
                  <>
                    <span className="w-[18px] h-[18px] rounded-full bg-accent inline-flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">T</span>
                    TUM Online
                  </>
                ) : "You"}
              </div>
            </div>
          </div>
        </div>

        {event.description && (
          <div className="bg-surface rounded-(--radius-lg) border border-border-subtle p-5 mb-6">
            <div className="text-(--text-xs) font-semibold text-ink-muted uppercase tracking-wider mb-2">Description</div>
            <p className="text-(--text-sm) text-ink-secondary leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          {confirmDelete ? (
            <div className="flex gap-2">
              <button
                onClick={() => deleteEvent.mutate(event.id, { onSuccess: onBack })}
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
