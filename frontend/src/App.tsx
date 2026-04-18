import "./index.css";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./components/Layout";
import { Calendar } from "./components/Calendar";
import { TodoPanel } from "./components/TodoPanel";
import { TodoDetail } from "./components/TodoDetail";
import { ChatPanel } from "./components/ChatPanel";
import { SettingsDialog } from "./components/SettingsDialog";
import { StatusBar } from "./components/StatusBar";

const queryClient = new QueryClient();

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);

  return (
    <QueryClientProvider client={queryClient}>
      <Layout
        sidebar={<TodoPanel onOpenTodo={setSelectedTodoId} />}
        main={
          selectedTodoId ? (
            <TodoDetail
              todoId={selectedTodoId}
              onBack={() => setSelectedTodoId(null)}
            />
          ) : (
            <Calendar />
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
