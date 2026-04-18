import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./components/Layout";
import { Calendar } from "./components/Calendar";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout
        sidebar={
          <div className="text-zinc-500 text-sm">
            <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">Todos</h2>
            <p className="text-zinc-600">No todos yet</p>
          </div>
        }
        main={<Calendar />}
        chat={
          <div className="p-4 text-zinc-500 text-sm font-mono">
            <p className="text-zinc-600">Type a message to start planning...</p>
          </div>
        }
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
