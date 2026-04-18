import { useQuery } from "@tanstack/react-query";

export interface Skill {
  name: string;
  description: string;
}

export function useSkills() {
  return useQuery<Skill[]>({
    queryKey: ["skills"],
    queryFn: async () => {
      const res = await fetch("/api/skills");
      if (!res.ok) return [];
      return res.json();
    },
  });
}
