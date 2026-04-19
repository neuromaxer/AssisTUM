import { useQuery } from "@tanstack/react-query";

export type EmailDigest = {
  configured: boolean;
  count: number;
  summary: string | null;
  error?: string;
};

export function useRecentEmails() {
  return useQuery<EmailDigest>({
    queryKey: ["emails", "recent"],
    queryFn: async () => {
      const res = await fetch("/api/emails/recent");
      return res.json();
    },
    refetchInterval: 10 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
