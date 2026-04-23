import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type Grade = {
  id: string;
  exam_name: string;
  grade: number | null;
  grade_text: string | null;
  ects: number | null;
  semester_id: string | null;
  semester_name: string | null;
  exam_date: string | null;
  examiner: string | null;
  module_code: string | null;
  course_id: string | null;
  status: "passed" | "failed" | "pending";
  created_at: string;
};

export function useGrades() {
  return useQuery<Grade[]>({
    queryKey: ["grades"],
    queryFn: async () => {
      const res = await fetch("/api/grades");
      return res.json();
    },
    refetchInterval: 10000,
  });
}

export function useSyncGrades() {
  const qc = useQueryClient();
  return useMutation<{ synced: number; grades: Grade[] }>({
    mutationFn: async () => {
      const res = await fetch("/api/grades/sync", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Sync failed");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grades"] });
    },
  });
}
