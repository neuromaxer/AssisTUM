import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type Todo = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  deadline: string | null;
  priority: string | null;
  completed: number;
  course_id: string | null;
  source: string;
};

export function useTodos() {
  return useQuery<Todo[]>({
    queryKey: ["todos"],
    queryFn: async () => {
      const res = await fetch("/api/todos");
      return res.json();
    },
    refetchInterval: 2000,
  });
}

export function useToggleTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todos"] }),
  });
}
