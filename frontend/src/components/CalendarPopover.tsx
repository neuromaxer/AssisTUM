import { useState, useEffect, useRef, useCallback } from "react";
import { useCreateEvent, useUpdateEvent, useDeleteEvent } from "../hooks/useEvents";
import { useCreateTodo, useUpdateTodo, useDeleteTodo } from "../hooks/useTodos";

const EVENT_TYPES = [
  { value: "lecture", label: "Lecture", color: "#3070b3" },
  { value: "study", label: "Study", color: "#16a34a" },
  { value: "meal", label: "Meal", color: "#d97706" },
  { value: "club", label: "Club", color: "#7c3aed" },
  { value: "recreation", label: "Recreation", color: "#db2777" },
  { value: "custom", label: "Custom", color: "#6b7280" },
] as const;

const TODO_TYPES = ["assignment", "reading", "exam", "study", "personal"] as const;
const PRIORITIES = ["none", "low", "medium", "high"] as const;

export type PopoverState = {
  x: number;
  y: number;
  start: string;
  end: string;
  editEvent?: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    start: string;
    end: string;
    course_id: string | null;
  };
  editTodo?: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    deadline: string | null;
    priority: string | null;
    course_id: string | null;
  };
};

export type PreviewEvent = {
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  color: string;
  isTodo?: boolean;
};

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toTimeInputValue(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function CalendarPopover({
  state,
  onClose,
  onPreviewChange,
}: {
  state: PopoverState;
  onClose: () => void;
  onPreviewChange: (preview: PreviewEvent | null) => void;
}) {
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const popoverRef = useRef<HTMLDivElement>(null);

  const isEditingEvent = !!state.editEvent;
  const isEditingTodo = !!state.editTodo;
  const isEditing = isEditingEvent || isEditingTodo;

  const [mode, setMode] = useState<"event" | "reminder">(
    isEditingTodo ? "reminder" : "event"
  );

  // Event fields
  const [title, setTitle] = useState(state.editEvent?.title ?? "");
  const [description, setDescription] = useState(state.editEvent?.description ?? "");
  const [eventType, setEventType] = useState(state.editEvent?.type ?? "custom");
  const [startDate, setStartDate] = useState(toDateInputValue(state.start));
  const [startTime, setStartTime] = useState(toTimeInputValue(state.start));
  const [endTime, setEndTime] = useState(toTimeInputValue(state.end));
  const [courseId, setCourseId] = useState(state.editEvent?.course_id ?? "");

  // Reminder fields — pre-fill from editTodo if present
  const todoDeadline = state.editTodo?.deadline;
  const todoHasDate = !!todoDeadline;
  const todoHasTime = !!todoDeadline && todoDeadline.includes("T") && !todoDeadline.endsWith("T23:59:00");

  const [reminderTitle, setReminderTitle] = useState(state.editTodo?.title ?? "");
  const [notes, setNotes] = useState(state.editTodo?.description ?? "");
  const [hasDate, setHasDate] = useState(isEditingTodo ? todoHasDate : true);
  const [hasTime, setHasTime] = useState(isEditingTodo ? todoHasTime : true);
  const [reminderDate, setReminderDate] = useState(
    todoDeadline ? toDateInputValue(todoDeadline) : toDateInputValue(state.start)
  );
  const [reminderTime, setReminderTime] = useState(
    todoHasTime ? toTimeInputValue(todoDeadline!) : toTimeInputValue(state.start)
  );
  const [todoType, setTodoType] = useState<string>(state.editTodo?.type ?? "assignment");
  const [priority, setPriority] = useState<string>(state.editTodo?.priority ?? "none");
  const [reminderCourseId, setReminderCourseId] = useState(state.editTodo?.course_id ?? "");

  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  const currentTypeColor =
    EVENT_TYPES.find((t) => t.value === eventType)?.color ?? "#6b7280";

  // Update preview whenever fields change
  useEffect(() => {
    if (mode === "event" && !isEditingEvent) {
      onPreviewChange({
        title: title || "New Event",
        start: `${startDate}T${startTime}:00`,
        end: `${startDate}T${endTime}:00`,
        color: currentTypeColor,
      });
    } else if (mode === "reminder" && !isEditingTodo) {
      if (hasDate) {
        onPreviewChange({
          title: reminderTitle || "Reminder",
          start: reminderDate,
          allDay: true,
          color: "transparent",
          isTodo: true,
        });
      } else {
        onPreviewChange(null);
      }
    } else {
      onPreviewChange(null);
    }
  }, [mode, title, startDate, startTime, endTime, currentTypeColor, isEditingEvent, reminderTitle, hasDate, hasTime, reminderDate, reminderTime, isEditingTodo]);

  useEffect(() => {
    return () => onPreviewChange(null);
  }, []);

  const saveEvent = useCallback(() => {
    if (!title.trim()) return;
    const start = `${startDate}T${startTime}:00`;
    const end = `${startDate}T${endTime}:00`;

    if (isEditingEvent && state.editEvent) {
      updateEvent.mutate({
        id: state.editEvent.id,
        title: title.trim(),
        description: description.trim() || null,
        type: eventType,
        start,
        end,
        course_id: courseId || null,
      });
    } else {
      createEvent.mutate({
        title: title.trim(),
        description: description.trim() || null,
        type: eventType,
        start,
        end,
        course_id: courseId || null,
      });
    }
  }, [title, description, eventType, startDate, startTime, endTime, courseId, isEditingEvent, state.editEvent]);

  const saveReminder = useCallback(() => {
    if (!reminderTitle.trim()) return;
    let deadline: string | null = null;
    if (hasDate) {
      deadline = hasTime
        ? `${reminderDate}T${reminderTime}:00`
        : `${reminderDate}T23:59:00`;
    }
    const fields = {
      title: reminderTitle.trim(),
      description: notes.trim() || null,
      type: todoType,
      deadline,
      priority: priority === "none" ? null : priority,
      course_id: reminderCourseId || null,
    };

    if (isEditingTodo && state.editTodo) {
      updateTodo.mutate({ id: state.editTodo.id, ...fields });
    } else {
      createTodo.mutate(fields);
    }
  }, [reminderTitle, notes, todoType, hasDate, hasTime, reminderDate, reminderTime, priority, reminderCourseId, isEditingTodo, state.editTodo]);

  function handleDismiss() {
    if (mode === "event") saveEvent();
    else saveReminder();
    onClose();
  }

  function handleDelete() {
    if (isEditingEvent && state.editEvent) {
      deleteEvent.mutate(state.editEvent.id);
    } else if (isEditingTodo && state.editTodo) {
      deleteTodo.mutate(state.editTodo.id);
    }
    onClose();
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={handleDismiss} />

      <div
        ref={popoverRef}
        className="fixed z-50"
        style={{ left: state.x, top: state.y, width: 300 }}
      >
        <div
          style={{
            background: "rgba(247,246,243,0.88)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)",
            border: "1px solid rgba(255,255,255,0.5)",
            padding: 14,
          }}
        >
          {/* Segmented Control — hide when editing (mode is locked) */}
          {!isEditing && (
            <div
              style={{
                display: "flex",
                background: "rgba(0,0,0,0.06)",
                borderRadius: 7,
                padding: 2,
                marginBottom: 14,
              }}
            >
              {(["event", "reminder"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "5px 0",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: mode === m ? 600 : 500,
                    color: mode === m ? "#1c1c1c" : "#5c5c5c",
                    background: mode === m ? "white" : "transparent",
                    boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textTransform: "capitalize",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {mode === "event" ? (
            <>
              <div className="bg-surface rounded-lg overflow-hidden mb-2" style={{ boxShadow: "0 0.5px 1px rgba(0,0,0,0.05)" }}>
                <div className="flex items-center px-2.5 py-2">
                  <input
                    autoFocus
                    className="flex-1 text-[15px] font-medium text-ink bg-transparent outline-none border-none font-sans"
                    placeholder="New Event"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <div className="relative">
                    <button
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer bg-transparent border-none"
                      onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                    >
                      <div className="w-[9px] h-[9px] rounded-full" style={{ background: currentTypeColor }} />
                      <span className="text-[10px] text-ink-muted">&#9662;</span>
                    </button>
                    {typeDropdownOpen && (
                      <div
                        className="absolute right-0 top-full mt-1 bg-surface rounded-lg border border-border-subtle py-1 z-10"
                        style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: 120 }}
                      >
                        {EVENT_TYPES.map((t) => (
                          <button
                            key={t.value}
                            className="flex items-center gap-2 w-full px-2.5 py-1.5 text-left bg-transparent border-none cursor-pointer hover:bg-surface-hover font-sans"
                            onClick={() => { setEventType(t.value); setTypeDropdownOpen(false); }}
                          >
                            <div className="w-[9px] h-[9px] rounded-full" style={{ background: t.color }} />
                            <span className="text-(--text-sm) text-ink">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mx-2.5" style={{ height: 1, background: "#ebe9e4" }} />
                <div className="px-2.5 py-2">
                  <input
                    className="text-(--text-sm) text-ink-muted bg-transparent outline-none border-none w-full font-sans"
                    placeholder="Add description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-surface rounded-lg px-2.5 py-2 mb-2" style={{ boxShadow: "0 0.5px 1px rgba(0,0,0,0.05)" }}>
                <div className="flex items-center gap-2">
                  <input type="date" className="text-(--text-sm) font-medium text-ink bg-transparent outline-none border-none font-sans" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <input type="time" className="text-(--text-sm) font-medium text-accent bg-transparent outline-none border-none font-sans" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  <span className="text-(--text-sm) text-ink-muted">–</span>
                  <input type="time" className="text-(--text-sm) font-medium text-accent bg-transparent outline-none border-none font-sans" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>

              <div className="bg-surface rounded-lg mb-2" style={{ boxShadow: "0 0.5px 1px rgba(0,0,0,0.05)" }}>
                <div className="flex items-center justify-between px-2.5 py-2">
                  <span className="text-(--text-sm) text-ink-secondary">Course</span>
                  <input className="text-(--text-sm) text-ink-muted bg-transparent outline-none border-none text-right font-sans w-32" placeholder="None" value={courseId} onChange={(e) => setCourseId(e.target.value)} />
                </div>
              </div>

              {isEditingEvent && (
                <button onClick={handleDelete} className="w-full py-[7px] bg-surface text-danger border border-border rounded-[7px] text-[12px] cursor-pointer font-sans hover:bg-danger/10 mt-1">
                  Delete Event
                </button>
              )}
            </>
          ) : (
            <>
              <div className="bg-surface rounded-lg overflow-hidden mb-2" style={{ boxShadow: "0 0.5px 1px rgba(0,0,0,0.05)" }}>
                <div className="px-2.5 py-2">
                  <input
                    autoFocus
                    className="text-[15px] font-medium text-ink bg-transparent outline-none border-none w-full font-sans"
                    placeholder="Title"
                    value={reminderTitle}
                    onChange={(e) => setReminderTitle(e.target.value)}
                  />
                </div>
                <div className="mx-2.5" style={{ height: 1, background: "#ebe9e4" }} />
                <div className="px-2.5 py-2">
                  <input
                    className="text-(--text-sm) text-ink-muted bg-transparent outline-none border-none w-full font-sans"
                    placeholder="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Date & Time toggles */}
              <div className="bg-surface rounded-lg overflow-hidden mb-2" style={{ boxShadow: "0 0.5px 1px rgba(0,0,0,0.05)" }}>
                <div className="flex items-center justify-between px-2.5 py-2" style={{ borderBottom: "1px solid #f0efec" }}>
                  <div>
                    <div className="text-(--text-sm) font-medium text-ink">Date</div>
                    {hasDate && <input type="date" className="text-(--text-xs) text-ink-secondary bg-transparent outline-none border-none font-sans mt-0.5" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} />}
                  </div>
                  <Toggle on={hasDate} onToggle={() => setHasDate(!hasDate)} />
                </div>
                <div className="flex items-center justify-between px-2.5 py-2">
                  <div>
                    <div className="text-(--text-sm) font-medium text-ink">Time</div>
                    {hasTime && <input type="time" className="text-(--text-xs) text-ink-secondary bg-transparent outline-none border-none font-sans mt-0.5" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />}
                  </div>
                  <Toggle on={hasTime} onToggle={() => setHasTime(!hasTime)} />
                </div>
              </div>

              {/* Type, Priority, Course */}
              <div className="bg-surface rounded-lg overflow-hidden mb-2" style={{ boxShadow: "0 0.5px 1px rgba(0,0,0,0.05)" }}>
                <Row label="Type">
                  <select className="text-(--text-sm) text-ink-muted bg-transparent outline-none border-none font-sans cursor-pointer text-right appearance-none" value={todoType} onChange={(e) => setTodoType(e.target.value)}>
                    {TODO_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Row>
                <Row label="Priority">
                  <select className="text-(--text-sm) text-ink-muted bg-transparent outline-none border-none font-sans cursor-pointer text-right appearance-none" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p === "none" ? "None" : p}</option>)}
                  </select>
                </Row>
                <Row label="Course" last>
                  <input className="text-(--text-sm) text-ink-muted bg-transparent outline-none border-none text-right font-sans w-28" placeholder="None" value={reminderCourseId} onChange={(e) => setReminderCourseId(e.target.value)} />
                </Row>
              </div>

              {isEditingTodo && (
                <button onClick={handleDelete} className="w-full py-[7px] bg-surface text-danger border border-border rounded-[7px] text-[12px] cursor-pointer font-sans hover:bg-danger/10 mt-1">
                  Delete Reminder
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="border-none cursor-pointer p-0"
      style={{
        width: 36, height: 20, borderRadius: 10,
        background: on ? "#3070b3" : "#e0ddd7",
        position: "relative", transition: "background 0.15s",
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: "50%", background: "white",
        position: "absolute", top: 2,
        transition: "left 0.15s, right 0.15s",
        ...(on ? { right: 2, left: "auto" } : { left: 2, right: "auto" }),
        boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
      }} />
    </button>
  );
}

function Row({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className="flex items-center justify-between px-2.5 py-2" style={last ? {} : { borderBottom: "1px solid #f0efec" }}>
      <span className="text-(--text-sm) text-ink-secondary">{label}</span>
      {children}
    </div>
  );
}
