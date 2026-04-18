import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./components/Layout";
import { Calendar } from "./components/Calendar";
import { TodoPanel } from "./components/TodoPanel";
import { ChatPanel } from "./components/ChatPanel";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout
        sidebar={<TodoPanel />}
        main={<Calendar />}
        chat={<ChatPanel />}
        statusBar={
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              Not connected
            </span>
          </div>
        }
      />
    </QueryClientProvider>
  );
}
