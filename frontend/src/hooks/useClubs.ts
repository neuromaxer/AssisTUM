import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type Club = {
  id: string;
  name: string;
  url: string;
  created_at: string;
};

export function useClubs() {
  return useQuery<Club[]>({
    queryKey: ["clubs"],
    queryFn: async () => {
      const res = await fetch("/api/clubs");
      return res.json();
    },
  });
}

export function useAddClub() {
  const qc = useQueryClient();
  return useMutation<Club, Error, { name: string; url: string }>({
    mutationFn: async (body) => {
      const res = await fetch("/api/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to add club");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clubs"] }),
  });
}

export function useDeleteClub() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/clubs/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete club");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clubs"] }),
  });
}
