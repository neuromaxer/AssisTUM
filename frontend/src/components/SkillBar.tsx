import { useEffect, useRef } from "react";
import type { Skill } from "../hooks/useSkills";

interface SlashCommandPaletteProps {
  skills: Skill[];
  selectedIndex: number;
  onSelect: (skill: Skill) => void;
  onClose: () => void;
}

export function SlashCommandPalette({
  skills,
  selectedIndex,
  onSelect,
  onClose,
}: SlashCommandPaletteProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  if (skills.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 right-0 mb-1 bg-surface border border-border rounded-(--radius-md) shadow-sm z-20 max-h-[200px] overflow-y-auto"
    >
      {skills.map((skill, i) => (
        <button
          key={skill.name}
          className={`flex flex-col w-full px-3 py-2 text-left border-none cursor-pointer transition-colors ${
            i === selectedIndex
              ? "bg-accent-subtle"
              : "bg-transparent hover:bg-surface-hover"
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(skill);
          }}
        >
          <span className="text-(--text-xs) font-medium text-ink">
            /{skill.name}
          </span>
          <span className="text-[10px] text-ink-muted truncate">
            {skill.description}
          </span>
        </button>
      ))}
    </div>
  );
}
