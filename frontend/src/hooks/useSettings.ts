import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type AuthStatus = {
  tum_online: "connected" | "pending" | "disconnected";
  tum_calendar: boolean;
  moodle: boolean;
  email: boolean;
  cognee: boolean;
};

export function useAuthStatus() {
  return useQuery<AuthStatus>({
    queryKey: ["authStatus"],
    queryFn: async () => {
      const res = await fetch("/api/auth/status");
      return res.json();
    },
    refetchInterval: 5000,
  });
}

export function useSettings() {
  return useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      const rows = await res.json();
      const map: Record<string, string> = {};
      for (const r of rows) map[r.key] = r.value;
      return map;
    },
  });
}

export function useSaveSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await fetch(`/api/settings/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}
