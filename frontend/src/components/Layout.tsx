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
    <div className="h-screen flex flex-col bg-page text-ink font-sans">
      <header className="flex items-center justify-between px-(--spacing-panel) py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <h1 className="text-(--text-lg) font-semibold tracking-tight">AssisTUM</h1>
          <span className="text-(--text-xs) font-mono text-ink-muted bg-surface-hover px-1.5 py-0.5 rounded-(--radius-sm)">
            beta
          </span>
        </div>
        <button
          onClick={onSettingsClick}
          className="text-(--text-sm) text-ink-muted hover:text-ink-secondary transition-colors duration-150"
        >
          Settings
        </button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-70 border-r border-border overflow-y-auto p-(--spacing-panel)">
          {sidebar}
        </aside>
        <main className="flex-1 overflow-hidden p-(--spacing-panel)">{main}</main>
        <aside className="w-96 border-l border-border flex flex-col">{chat}</aside>
      </div>
      {statusBar && (
        <footer className="px-(--spacing-panel) py-1.5 border-t border-border">
          {statusBar}
        </footer>
      )}
    </div>
  );
}
