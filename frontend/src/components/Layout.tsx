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
  chat: (props: { chatWide: boolean; onToggleChatWide: () => void }) => ReactNode;
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
          {chat({ chatWide, onToggleChatWide: () => setChatWide((w) => !w) })}
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
