import { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventDropArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { useEvents, useUpdateEvent } from "../hooks/useEvents";
import { useTodos } from "../hooks/useTodos";
import { CalendarPopover, type PopoverState, type PreviewEvent } from "./CalendarPopover";

const TYPE_COLORS: Record<string, string> = {
  lecture: "#3070b3",
  study: "#16a34a",
  meal: "#d97706",
  club: "#7c3aed",
  recreation: "#db2777",
  custom: "#6b7280",
};


export function Calendar() {
  const { data: events } = useEvents();
  const { data: todos } = useTodos();
  const updateEvent = useUpdateEvent();
  const calendarRef = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [preview, setPreview] = useState<PreviewEvent | null>(null);

  const fcEvents: {
    id: string;
    title: string;
    start: string;
    end?: string;
    allDay?: boolean;
    backgroundColor: string;
    borderColor: string;
    editable?: boolean;
    extendedProps: { type: string; description: string | null; course_id: string | null };
  }[] = (events ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    backgroundColor: e.color ?? TYPE_COLORS[e.type] ?? TYPE_COLORS.custom,
    borderColor: "transparent",
    extendedProps: {
      type: e.type,
      description: e.description,
      course_id: e.course_id,
    },
  }));

  // Add incomplete todos with deadlines as all-day items
  for (const todo of todos ?? []) {
    if (todo.completed || !todo.deadline) continue;
    const datePart = todo.deadline.includes("T") ? todo.deadline.split("T")[0] : todo.deadline;
    fcEvents.push({
      id: `todo-${todo.id}`,
      title: todo.title,
      start: datePart,
      allDay: true,
      backgroundColor: "transparent",
      borderColor: "transparent",
      editable: false,
      extendedProps: { type: "todo", description: todo.description, course_id: todo.course_id },
    });
  }

  // Add preview ghost event
  if (preview) {
    fcEvents.push({
      id: "__preview__",
      title: preview.title,
      start: preview.start,
      end: preview.end,
      allDay: preview.allDay,
      backgroundColor: preview.color,
      borderColor: "transparent",
      editable: false,
      extendedProps: {
        type: preview.isTodo ? "todo-preview" : "preview",
        description: null,
        course_id: null,
      },
    });
  }

  useEffect(() => {
    const el = calendarRef.current;
    if (!el) return;

    function timeFromSlots(slotsEl: Element, mouseY: number): string {
      // FullCalendar renders td[data-time] for each slot lane
      const cells = slotsEl.querySelectorAll("td.fc-timegrid-slot-lane[data-time]");
      let prevTime = "07:00:00";
      let prevTop = 0;

      for (const cell of cells) {
        const rect = (cell as HTMLElement).getBoundingClientRect();
        if (rect.top > mouseY) {
          const slotHeight = rect.top - prevTop;
          if (slotHeight <= 0) break;
          const frac = (mouseY - prevTop) / slotHeight;
          const [h, m] = prevTime.split(":").map(Number);
          const slotMin = 30;
          const extra = Math.round((frac * slotMin) / 15) * 15;
          const totalMin = h * 60 + m + extra;
          const finalH = String(Math.floor(totalMin / 60)).padStart(2, "0");
          const finalM = String(totalMin % 60).padStart(2, "0");
          return `${finalH}:${finalM}:00`;
        }
        prevTime = cell.getAttribute("data-time") ?? prevTime;
        prevTop = rect.top;
      }

      // Clicked past the last slot — use the last time
      return prevTime;
    }

    function findClickedCol(mouseX: number): { date: string; rect: DOMRect } | null {
      const colBodies = el!.querySelectorAll(".fc-timegrid-col");
      const colHeaders = el!.querySelectorAll(".fc-col-header-cell");
      for (let i = 0; i < colBodies.length; i++) {
        const rect = (colBodies[i] as HTMLElement).getBoundingClientRect();
        if (mouseX >= rect.left && mouseX <= rect.right) {
          const dateAttr = colBodies[i].getAttribute("data-date") ??
            colHeaders[i]?.getAttribute("data-date") ??
            new Date().toISOString().split("T")[0];
          return { date: dateAttr, rect };
        }
      }
      return null;
    }

    function popoverPosition(anchorRect: DOMRect, mouseY: number): { x: number; y: number } {
      const popW = 300;
      const popH = 400;
      const gap = 8;
      const spaceRight = window.innerWidth - anchorRect.right;
      const x = spaceRight >= popW + gap
        ? anchorRect.right + gap
        : anchorRect.left - popW - gap;
      const y = Math.min(Math.max(mouseY - 40, 8), window.innerHeight - popH - 16);
      return { x: Math.max(8, x), y };
    }

    function handleContextMenu(e: MouseEvent) {
      e.preventDefault();

      // Check if right-clicked on an existing event or todo
      const eventEl = (e.target as HTMLElement).closest(".fc-event");
      if (eventEl) {
        // Get title from either default FC elements or our custom todo title
        const titleEl = eventEl.querySelector(".fc-event-title, .fc-event-title-container, .fc-todo-title");
        const titleText = titleEl?.textContent?.trim();

        // Check if it's a todo on the calendar
        const matchedTodo = todos?.find((t) => t.title === titleText && !t.completed);
        if (matchedTodo) {
          const eventRect = (eventEl as HTMLElement).getBoundingClientRect();
          const pos = popoverPosition(eventRect, eventRect.top);
          setPopover({
            x: pos.x,
            y: pos.y,
            start: matchedTodo.deadline ?? new Date().toISOString(),
            end: new Date().toISOString(),
            editTodo: {
              id: matchedTodo.id,
              title: matchedTodo.title,
              description: matchedTodo.description,
              type: matchedTodo.type,
              deadline: matchedTodo.deadline,
              priority: matchedTodo.priority,
              course_id: matchedTodo.course_id,
            },
          });
          return;
        }

        const matched = events?.find((ev) => ev.title === titleText);
        if (matched) {
          const eventRect = (eventEl as HTMLElement).getBoundingClientRect();
          const pos = popoverPosition(eventRect, eventRect.top);
          setPopover({
            x: pos.x,
            y: pos.y,
            start: matched.start,
            end: matched.end,
            editEvent: {
              id: matched.id,
              title: matched.title,
              description: matched.description,
              type: matched.type,
              start: matched.start,
              end: matched.end,
              course_id: matched.course_id,
            },
          });
          return;
        }
      }

      // Right-clicked on empty slot
      const inBody = (e.target as HTMLElement).closest(
        ".fc-timegrid-slot, .fc-timegrid-col, .fc-timegrid-slot-lane, .fc-timegrid-body"
      );
      if (!inBody) return;

      const slotsEl = el!.querySelector(".fc-timegrid-slots");
      const col = findClickedCol(e.clientX);
      if (!col || !slotsEl) return;

      const clickedTime = timeFromSlots(slotsEl, e.clientY);
      const startISO = `${col.date}T${clickedTime}`;
      const startDateObj = new Date(startISO);
      const endDateObj = new Date(startDateObj.getTime() + 60 * 60 * 1000);
      const endISO = endDateObj.toISOString();

      const pos = popoverPosition(col.rect, e.clientY);

      setPopover({
        x: pos.x,
        y: pos.y,
        start: startISO,
        end: endISO,
      });
    }

    el.addEventListener("contextmenu", handleContextMenu);
    return () => el.removeEventListener("contextmenu", handleContextMenu);
  }, [events]);

  function handleEventDrop(info: EventDropArg) {
    if (info.event.id === "__preview__") return;
    updateEvent.mutate({
      id: info.event.id,
      start: info.event.startStr,
      end: info.event.endStr,
    });
  }

  function handleEventResize(info: EventResizeDoneArg) {
    if (info.event.id === "__preview__") return;
    updateEvent.mutate({
      id: info.event.id,
      start: info.event.startStr,
      end: info.event.endStr,
    });
  }

  return (
    <div className="h-full" ref={calendarRef}>
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "",
        }}
        events={fcEvents}
        editable={true}
        selectable={false}
        nowIndicator={true}
        allDaySlot={true}
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        height="100%"
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        eventClassNames={(arg) => {
          if (arg.event.id === "__preview__") return ["fc-preview-event"];
          if (arg.event.id.startsWith("todo-")) return ["fc-todo-event"];
          return [];
        }}
        eventContent={(arg) => {
          const isTodo = arg.event.id.startsWith("todo-") ||
            (arg.event.id === "__preview__" && arg.event.extendedProps.type === "todo-preview");
          if (isTodo) {
            return {
              html: `<span class="fc-todo-dot"></span><span class="fc-todo-title">${arg.event.title}</span>`,
            };
          }
          // Default rendering for regular events
          const timeText = arg.timeText ? `<div class="fc-event-time">${arg.timeText}</div>` : "";
          return {
            html: `${timeText}<div class="fc-event-title-container"><div class="fc-event-title fc-sticky">${arg.event.title || "&nbsp;"}</div></div>`,
          };
        }}
      />

      {popover && (
        <CalendarPopover
          state={popover}
          onClose={() => {
            setPopover(null);
            setPreview(null);
          }}
          onPreviewChange={setPreview}
        />
      )}
    </div>
  );
}
