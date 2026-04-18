import "./index.css";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./components/Layout";
import { Calendar } from "./components/Calendar";
import { TodoPanel } from "./components/TodoPanel";
import { ChatPanel } from "./components/ChatPanel";
import { SettingsDialog } from "./components/SettingsDialog";
import { StatusBar } from "./components/StatusBar";

const queryClient = new QueryClient();

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <Layout
        sidebar={<TodoPanel />}
        main={<Calendar />}
        chat={<ChatPanel />}
        onSettingsClick={() => setSettingsOpen(true)}
        statusBar={<StatusBar />}
      />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </QueryClientProvider>
  );
}
