import { useState } from "react";
import { useSkills } from "../hooks/useSkills";

interface SkillBarProps {
  sessionId: string | null;
  ensureSession: () => Promise<string>;
}

export function SkillBar({ sessionId, ensureSession }: SkillBarProps) {
  const { data: skills = [] } = useSkills();
  const [invoking, setInvoking] = useState<string | null>(null);

  if (skills.length === 0) return null;

  const handleInvoke = async (skillName: string) => {
    setInvoking(skillName);
    try {
      const sid = await ensureSession();
      await fetch(`/api/skills/${encodeURIComponent(skillName)}/invoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      });
    } catch (err) {
      console.error("Failed to invoke skill:", err);
    } finally {
      setInvoking(null);
    }
  };

  const displayName = (name: string) =>
    name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  return (
    <div className="flex gap-1.5 overflow-x-auto py-1.5 px-(--spacing-panel) border-t border-border-subtle">
      {skills.map((skill) => (
        <button
          key={skill.name}
          className="bg-surface border border-border rounded-(--radius-sm) px-2 py-1 text-(--text-xs) text-ink-secondary hover:bg-surface-hover whitespace-nowrap cursor-pointer transition-colors disabled:opacity-50"
          onClick={() => handleInvoke(skill.name)}
          disabled={invoking !== null}
          title={skill.description}
        >
          {invoking === skill.name ? "..." : displayName(skill.name)}
        </button>
      ))}
    </div>
  );
}
