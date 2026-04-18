import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type Event = {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  type: string;
  color: string | null;
  course_id: string | null;
  source: string;
};

export function useEvents() {
  return useQuery<Event[]>({
    queryKey: ["events"],
    queryFn: async () => {
      const res = await fetch("/api/events");
      return res.json();
    },
    refetchInterval: 2000,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (event: Partial<Event>) => {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...event, source: "user" }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<Event> & { id: string }) => {
      const res = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}
