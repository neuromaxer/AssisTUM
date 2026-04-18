import { useMemo, useRef, useEffect } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface MarkdownProps {
  text: string;
}

export function Markdown({ text }: MarkdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const html = useMemo(() => {
    if (!text) return "";
    const raw = marked.parse(text, { async: false }) as string;
    return DOMPurify.sanitize(raw);
  }, [text]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const pres = container.querySelectorAll("pre");
    pres.forEach((pre) => {
      if (pre.querySelector("[data-copy-btn]")) return;
      const btn = document.createElement("button");
      btn.setAttribute("data-copy-btn", "");
      btn.textContent = "Copy";
      Object.assign(btn.style, {
        position: "absolute",
        top: "6px",
        right: "6px",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        color: "var(--color-ink-muted)",
        borderRadius: "3px",
        padding: "2px 8px",
        fontSize: "10px",
        cursor: "pointer",
        fontFamily: "var(--font-mono)",
      } satisfies Partial<Record<keyof CSSStyleDeclaration, string>>);
      btn.addEventListener("click", () => {
        const code = pre.querySelector("code");
        const t = code?.textContent ?? pre.textContent ?? "";
        navigator.clipboard.writeText(t).then(() => {
          btn.textContent = "Copied!";
          setTimeout(() => {
            btn.textContent = "Copy";
          }, 2000);
        });
      });
      pre.style.position = "relative";
      pre.appendChild(btn);
    });
  }, [html]);

  return (
    <div
      ref={containerRef}
      className="assistum-markdown"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const styleId = "assistum-markdown-styles";
if (typeof document !== "undefined" && !document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .assistum-markdown {
      font-size: var(--text-sm);
      line-height: 1.6;
      color: var(--color-ink);
      font-family: var(--font-sans);
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .assistum-markdown p { margin: 0 0 8px 0; }
    .assistum-markdown p:last-child { margin-bottom: 0; }
    .assistum-markdown pre {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 12px;
      overflow-x: auto;
      margin: 8px 0;
      position: relative;
    }
    .assistum-markdown code {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
    }
    .assistum-markdown :not(pre) > code {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 3px;
      padding: 1px 5px;
      font-size: var(--text-xs);
    }
    .assistum-markdown ul, .assistum-markdown ol { margin: 4px 0; padding-left: 20px; }
    .assistum-markdown li { margin: 2px 0; }
    .assistum-markdown a { color: var(--color-accent); text-decoration: none; }
    .assistum-markdown a:hover { text-decoration: underline; }
    .assistum-markdown h1, .assistum-markdown h2, .assistum-markdown h3 {
      margin: 12px 0 6px 0;
      color: var(--color-ink);
    }
    .assistum-markdown h1 { font-size: var(--text-lg); }
    .assistum-markdown h2 { font-size: var(--text-base); }
    .assistum-markdown h3 { font-size: var(--text-sm); font-weight: 600; }
    .assistum-markdown blockquote {
      border-left: 3px solid var(--color-border);
      margin: 8px 0;
      padding: 4px 12px;
      color: var(--color-ink-muted);
    }
    .assistum-markdown table { border-collapse: collapse; margin: 8px 0; }
    .assistum-markdown th, .assistum-markdown td {
      border: 1px solid var(--color-border);
      padding: 6px 10px;
      font-size: var(--text-xs);
    }
    .assistum-markdown th { background: var(--color-surface); }
    .assistum-markdown strong { font-weight: 600; }
  `;
  document.head.appendChild(style);
}
