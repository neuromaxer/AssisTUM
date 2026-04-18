import "./index.css";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./components/Layout";
import { Calendar } from "./components/Calendar";
import { Dashboard } from "./components/Dashboard";
import { TodoPanel } from "./components/TodoPanel";
import { TodoDetail } from "./components/TodoDetail";
import { CourseDetail } from "./components/CourseDetail";
import { ChatPanel } from "./components/ChatPanel";
import { SettingsDialog } from "./components/SettingsDialog";
import { StatusBar } from "./components/StatusBar";

const queryClient = new QueryClient();

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  const calendarView = (
    <div className="h-full flex flex-col">
      {/* Toggle */}
      <div className="flex justify-end mb-2 flex-shrink-0">
        <button
          onClick={() => setShowDashboard((v) => !v)}
          className="flex items-center gap-2 text-(--text-xs) font-mono px-3 py-1.5 rounded-(--radius-md) border border-border bg-surface hover:bg-surface-hover text-ink-secondary hover:text-ink transition-colors duration-150"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-60" aria-hidden>
            <rect x="1" y="1" width="4" height="4" rx="1" fill="currentColor"/>
            <rect x="7" y="1" width="4" height="4" rx="1" fill="currentColor"/>
            <rect x="1" y="7" width="4" height="4" rx="1" fill="currentColor"/>
            <rect x="7" y="7" width="4" height="4" rx="1" fill="currentColor"/>
          </svg>
          {showDashboard ? "Calendar" : "Dashboard"}
        </button>
      </div>

      {/* 3D card flip: calendar = back face, dashboard = front face */}
      <div className="flex-1 relative flip-scene overflow-hidden">
        <div className={`flip-card ${showDashboard ? "flip-card-dashboard" : "flip-card-calendar"}`}>
          {/* Calendar — back of card */}
          <div className="flip-face">
            <Calendar
              onOpenTodo={setSelectedTodoId}
              onOpenCourse={setSelectedCourseId}
              initialDate={calendarDate}
              onDateChange={setCalendarDate}
            />
          </div>
          {/* Dashboard — front of card */}
          <div className="flip-face flip-face-dashboard">
            <Dashboard />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Layout
        sidebar={<TodoPanel onOpenTodo={setSelectedTodoId} />}
        main={
          selectedTodoId ? (
            <TodoDetail todoId={selectedTodoId} onBack={() => setSelectedTodoId(null)} />
          ) : selectedCourseId ? (
            <CourseDetail courseId={selectedCourseId} onBack={() => setSelectedCourseId(null)} />
          ) : (
            calendarView
          )
        }
        chat={<ChatPanel />}
        onSettingsClick={() => setSettingsOpen(true)}
        statusBar={<StatusBar />}
      />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </QueryClientProvider>
  );
}
