import { ReactNode, useState } from "react";

const CHAT_NARROW = 384;
const CHAT_WIDE = 600;

export function Layout({
  sidebar,
  main,
  chat,
  statusBar,
  onSettingsClick,
  showDashboard,
  onToggleDashboard,
}: {
  sidebar: ReactNode;
  main: ReactNode;
  chat: ReactNode;
  statusBar?: ReactNode;
  onSettingsClick?: () => void;
  showDashboard?: boolean;
  onToggleDashboard?: () => void;
}) {
  const [chatWide, setChatWide] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-page text-ink font-sans">
      <div className="flex flex-1 overflow-hidden">
        <aside
          className="border-r border-border overflow-y-auto p-(--spacing-panel) shrink-0 w-[280px]"
        >
          {sidebar}
        </aside>
        <main className="flex-1 min-w-0 overflow-hidden p-(--spacing-panel)">{main}</main>
        <aside
          className="border-l border-border flex flex-col shrink-0 transition-[width] duration-200"
          style={{ width: chatWide ? CHAT_WIDE : CHAT_NARROW }}
        >
          <div className="flex items-center justify-end px-2 pt-1.5">
            <button
              onClick={() => setChatWide((w) => !w)}
              className="text-ink-muted hover:text-ink-secondary transition-colors duration-150 p-1 rounded-(--radius-sm) hover:bg-surface-hover"
              title={chatWide ? "Narrow chat" : "Wide chat"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                {chatWide ? (
                  <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.44 7.5H1.75a.75.75 0 0 0 0 1.5h4.69L4.22 11.22a.75.75 0 1 0 1.06 1.06l3.25-3.25a.75.75 0 0 0 0-1.06L5.28 4.22Zm5.44 0a.75.75 0 0 1 1.06 1.06L9.56 7.5h4.69a.75.75 0 0 1 0 1.5H9.56l2.22 2.22a.75.75 0 1 1-1.06 1.06L7.47 9.03a.75.75 0 0 1 0-1.06l3.25-3.75Z" />
                ) : (
                  <path d="M10.72 4.22a.75.75 0 0 1 1.06 1.06L9.56 7.5h4.69a.75.75 0 0 1 0 1.5H9.56l2.22 2.22a.75.75 0 1 1-1.06 1.06L7.47 9.03a.75.75 0 0 1 0-1.06l3.25-3.75Zm-5.44 0a.75.75 0 0 0-1.06 1.06L6.44 7.5H1.75a.75.75 0 0 0 0 1.5h4.69L4.22 11.22a.75.75 0 1 0 1.06 1.06l3.25-3.25a.75.75 0 0 0 0-1.06L5.28 4.22Z" />
                )}
              </svg>
            </button>
          </div>
          {chat}
        </aside>
      </div>
      <footer className="flex items-center justify-between px-(--spacing-panel) py-1.5 border-t border-border">
        <div>{statusBar}</div>
        <div className="flex items-center gap-4">
          {onToggleDashboard && (
            <button
              onClick={onToggleDashboard}
              className="text-(--text-xs) text-ink-muted hover:text-ink-secondary transition-colors duration-150"
            >
              {showDashboard ? "Calendar" : "Dashboard"}
            </button>
          )}
          <button
            onClick={onSettingsClick}
            className="text-(--text-xs) text-ink-muted hover:text-ink-secondary transition-colors duration-150"
          >
            Settings
          </button>
        </div>
      </footer>
    </div>
  );
}
