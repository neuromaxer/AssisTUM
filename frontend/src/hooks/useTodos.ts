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
  session_id: string | null;
  created_at: string;
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

export function useTodo(id: string | null) {
  return useQuery<Todo>({
    queryKey: ["todo", id],
    queryFn: async () => {
      const res = await fetch(`/api/todos/${id}`);
      return res.json();
    },
    enabled: !!id,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["todos"] });
      qc.invalidateQueries({ queryKey: ["todo"] });
    },
  });
}

export function useDeleteTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["todos"] });
      qc.invalidateQueries({ queryKey: ["todo"] });
    },
  });
}
