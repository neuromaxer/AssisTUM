"use client";

import { useRef, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";

const SAMPLE_EVENTS: EventInput[] = [
  {
    title: "Analysis 1 - Lecture",
    start: new Date().toISOString().split("T")[0] + "T08:00:00",
    end: new Date().toISOString().split("T")[0] + "T10:00:00",
    backgroundColor: "hsl(221, 83%, 53%)",
    borderColor: "hsl(221, 83%, 53%)",
    textColor: "#fff",
  },
  {
    title: "Linear Algebra - Tutorial",
    start: new Date().toISOString().split("T")[0] + "T12:00:00",
    end: new Date().toISOString().split("T")[0] + "T14:00:00",
    backgroundColor: "hsl(142, 71%, 45%)",
    borderColor: "hsl(142, 71%, 45%)",
    textColor: "#fff",
  },
  {
    title: "Intro to CS - Lab",
    start: new Date().toISOString().split("T")[0] + "T15:00:00",
    end: new Date().toISOString().split("T")[0] + "T17:00:00",
    backgroundColor: "hsl(262, 83%, 58%)",
    borderColor: "hsl(262, 83%, 58%)",
    textColor: "#fff",
  },
];

export function CalendarView() {
  const calendarRef = useRef<FullCalendar>(null);

  const handleEventContent = useCallback(
    (arg: { event: { title: string }; timeText: string }) => {
      return (
        <div className="flex h-full flex-col overflow-hidden rounded-md px-2 py-1 text-xs">
          <span className="font-semibold">{arg.event.title}</span>
          <span className="opacity-80">{arg.timeText}</span>
        </div>
      );
    },
    [],
  );

  return (
    <div className="assistum-calendar h-full">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={SAMPLE_EVENTS}
        eventContent={handleEventContent}
        nowIndicator
        editable
        selectable
        selectMirror
        dayMaxEvents
        weekends
        allDaySlot={false}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        height="100%"
        expandRows
        stickyHeaderDates
      />
    </div>
  );
}
