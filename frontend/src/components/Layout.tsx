import { ReactNode, useRef, useCallback, useState } from "react";

function useResizable(initialWidth: number, min: number, max: number, side: "left" | "right") {
  const [width, setWidth] = useState(initialWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = side === "right"
        ? ev.clientX - startX.current
        : startX.current - ev.clientX;
      setWidth(Math.min(max, Math.max(min, startW.current + delta)));
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [width, min, max, side]);

  return { width, onMouseDown };
}

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
  const sidebarResize = useResizable(280, 200, 400, "right");
  const chatResize = useResizable(384, 280, 560, "left");

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
        <aside
          className="border-r border-border overflow-y-auto p-(--spacing-panel) shrink-0"
          style={{ width: sidebarResize.width }}
        >
          {sidebar}
        </aside>
        <div
          className="w-1 cursor-col-resize hover:bg-accent/20 active:bg-accent/30 transition-colors shrink-0"
          onMouseDown={sidebarResize.onMouseDown}
        />
        <main className="flex-1 overflow-hidden p-(--spacing-panel)">{main}</main>
        <div
          className="w-1 cursor-col-resize hover:bg-accent/20 active:bg-accent/30 transition-colors shrink-0"
          onMouseDown={chatResize.onMouseDown}
        />
        <aside
          className="border-l border-border flex flex-col shrink-0"
          style={{ width: chatResize.width }}
        >
          {chat}
        </aside>
      </div>
      {statusBar && (
        <footer className="px-(--spacing-panel) py-1.5 border-t border-border">
          {statusBar}
        </footer>
      )}
    </div>
  );
}
