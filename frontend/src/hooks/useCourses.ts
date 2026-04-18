import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type Course = {
  id: string;
  name: string;
  description: string | null;
  moodle_course_id: string | null;
  tum_course_id: string | null;
  module_code: string | null;
  sws: string | null;
  course_type: string | null;
  semester_id: string | null;
  semester_name: string | null;
  department: string | null;
  lecturers: string | null;
  exam_date: string | null;
  source: string;
  created_at: string;
  event_count: number;
  todo_count: number;
};

export function useCourses() {
  return useQuery<Course[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses");
      return res.json();
    },
    refetchInterval: 2000,
  });
}

export function useCourse(id: string | null) {
  return useQuery<Course>({
    queryKey: ["course", id],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${id}`);
      return res.json();
    },
    enabled: !!id,
  });
}

export function useSyncCourses() {
  const qc = useQueryClient();
  return useMutation<{ synced: number; courses: Course[] }>({
    mutationFn: async () => {
      const res = await fetch("/api/courses/sync", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Sync failed");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
