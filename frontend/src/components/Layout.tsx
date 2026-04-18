import { ReactNode } from "react";

export function Layout({
  sidebar,
  main,
  chat,
  statusBar,
  onSettingsClick,
}: {
  sidebar: ReactNode;
  main: ReactNode;
  chat: ReactNode;
  statusBar?: ReactNode;
  onSettingsClick?: () => void;
}) {
  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans">
      <header className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-tum-blue" />
          <h1 className="text-base font-semibold tracking-tight">AssisTUM</h1>
          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">beta</span>
        </div>
        <button
          onClick={onSettingsClick}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors duration-150"
        >
          Settings
        </button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-70 border-r border-zinc-800/80 overflow-y-auto p-4">
          {sidebar}
        </aside>
        <main className="flex-1 overflow-hidden p-4">{main}</main>
        <aside className="w-96 border-l border-zinc-800/80 flex flex-col">{chat}</aside>
      </div>
      {statusBar && (
        <footer className="px-5 py-1.5 border-t border-zinc-800/80 text-[11px] text-zinc-500">
          {statusBar}
        </footer>
      )}
    </div>
  );
}
