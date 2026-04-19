import "./index.css";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./components/Layout";
import { Calendar } from "./components/Calendar";
import { Dashboard } from "./components/Dashboard";
import { TodoPanel } from "./components/TodoPanel";
import { TodoDetail } from "./components/TodoDetail";
import { CourseDetail } from "./components/CourseDetail";
import { EventDetail } from "./components/EventDetail";
import { ChatPanel } from "./components/ChatPanel";
import { SettingsDialog } from "./components/SettingsDialog";
import { StatusBar } from "./components/StatusBar";

const queryClient = new QueryClient();

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  const toggleDashboard = () => setShowDashboard((v) => !v);

  const toggleBtn = (
    <div className="sticky top-0 z-10 flex justify-end pb-1">
      <button
        onClick={toggleDashboard}
        className="text-(--text-xs) font-medium text-ink-secondary bg-surface border border-border rounded-(--radius-sm) px-2.5 h-[1.625rem] hover:bg-surface-hover transition-colors"
      >
        {showDashboard ? "Open Calendar" : "Open Dashboard"}
      </button>
    </div>
  );

  const calendarView = (
    <div className="h-full relative">
      <div className={`absolute inset-0 overflow-auto transition-opacity duration-300 ${showDashboard ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        {toggleBtn}
        <div className="h-[calc(100%-2rem)]">
          <Calendar
            onOpenTodo={setSelectedTodoId}
            onOpenCourse={setSelectedCourseId}
            onOpenEvent={setSelectedEventId}
            initialDate={calendarDate}
            onDateChange={setCalendarDate}
          />
        </div>
      </div>
      <div className={`absolute inset-0 overflow-auto transition-opacity duration-300 ${showDashboard ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        {toggleBtn}
        <Dashboard />
      </div>
    </div>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Layout
        sidebar={<TodoPanel onOpenTodo={setSelectedTodoId} />}
        main={
          selectedTodoId ? (
            <TodoDetail todoId={selectedTodoId} onBack={() => setSelectedTodoId(null)} onOpenCourse={(id) => { setSelectedTodoId(null); setSelectedCourseId(id); }} />
          ) : selectedCourseId ? (
            <CourseDetail courseId={selectedCourseId} onBack={() => setSelectedCourseId(null)} onOpenTodo={(id) => { setSelectedCourseId(null); setSelectedTodoId(id); }} />
          ) : selectedEventId ? (
            <EventDetail eventId={selectedEventId} onBack={() => setSelectedEventId(null)} onOpenCourse={(id) => { setSelectedEventId(null); setSelectedCourseId(id); }} />
          ) : (
            calendarView
          )
        }
        chat={({ chatWide, onToggleChatWide }) => <ChatPanel chatWide={chatWide} onToggleChatWide={onToggleChatWide} />}
        onSettingsClick={() => setSettingsOpen(true)}
        statusBar={<StatusBar />}
      />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </QueryClientProvider>
  );
}
