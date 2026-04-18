import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventDropArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { useEvents, useCreateEvent, useUpdateEvent } from "../hooks/useEvents";

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
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();

  const fcEvents = (events ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    backgroundColor: e.color ?? TYPE_COLORS[e.type] ?? TYPE_COLORS.custom,
    borderColor: "transparent",
    extendedProps: { type: e.type, description: e.description },
  }));

  function handleSelect(info: DateSelectArg) {
    const title = prompt("Event title:");
    if (!title) return;
    createEvent.mutate({
      title,
      start: info.startStr,
      end: info.endStr,
      type: "custom",
    });
  }

  function handleEventDrop(info: EventDropArg) {
    updateEvent.mutate({
      id: info.event.id,
      start: info.event.startStr,
      end: info.event.endStr,
    });
  }

  function handleEventResize(info: EventResizeDoneArg) {
    updateEvent.mutate({
      id: info.event.id,
      start: info.event.startStr,
      end: info.event.endStr,
    });
  }

  return (
    <div className="h-full">
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
        selectable={true}
        nowIndicator={true}
        allDaySlot={false}
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        height="100%"
        select={handleSelect}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
      />
    </div>
  );
}
