import { CalendarView } from "@/components/calendar/calendar-view";

export default function Home() {
  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <h1 className="text-lg font-semibold">Assistum</h1>
        <p className="text-sm text-muted-foreground">TUM Student Planner</p>
      </header>
      <div className="flex-1 overflow-hidden p-4">
        <CalendarView />
      </div>
    </main>
  );
}
