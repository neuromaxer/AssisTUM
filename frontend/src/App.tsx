import "./index.css";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./components/Layout";
import { Calendar } from "./components/Calendar";
import { Dashboard } from "./components/Dashboard";
import { TodoPanel } from "./components/TodoPanel";
import { TodoDetail } from "./components/TodoDetail";
import { ChatPanel } from "./components/ChatPanel";
import { SettingsDialog } from "./components/SettingsDialog";
import { StatusBar } from "./components/StatusBar";

const queryClient = new QueryClient();

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  const mainContent = selectedTodoId ? (
    <TodoDetail todoId={selectedTodoId} onBack={() => setSelectedTodoId(null)} />
  ) : (
    <div className="h-full flex flex-col">
      {/* Toggle button */}
      <div className="flex justify-end mb-2 flex-shrink-0">
        <button
          onClick={() => setShowDashboard((v) => !v)}
          className="flex items-center gap-1.5 text-(--text-xs) font-mono px-3 py-1.5 rounded-(--radius-md) border border-border bg-surface hover:bg-surface-hover transition-colors duration-150 text-ink-secondary hover:text-ink"
        >
          <span
            className="inline-block transition-transform duration-300"
            style={{ transform: showDashboard ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            ⊞
          </span>
          {showDashboard ? "Calendar" : "Dashboard"}
        </button>
      </div>

      {/* Wheel animation container */}
      <div className="flex-1 relative wheel-container overflow-hidden">
        <div
          className={`absolute inset-0 wheel-panel ${showDashboard ? "wheel-panel-exit" : "wheel-panel-visible"}`}
        >
          <Calendar />
        </div>
        <div
          className={`absolute inset-0 wheel-panel ${showDashboard ? "wheel-panel-visible" : "wheel-panel-enter"}`}
        >
          <Dashboard />
        </div>
      </div>
    </div>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Layout
        sidebar={<TodoPanel onOpenTodo={setSelectedTodoId} />}
        main={mainContent}
        chat={<ChatPanel />}
        onSettingsClick={() => setSettingsOpen(true)}
        statusBar={<StatusBar />}
      />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </QueryClientProvider>
  );
}
