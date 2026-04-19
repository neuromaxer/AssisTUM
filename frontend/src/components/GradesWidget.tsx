import { useMemo, useState } from "react";
import { useGrades, useSyncGrades, type Grade } from "../hooks/useGrades";

type SemesterGroup = {
  id: string;
  name: string;
  grades: Grade[];
  avg: number | null;
  ects: number;
};

function gradeColor(grade: number | null): string {
  if (grade === null) return "text-ink-muted";
  if (grade <= 1.3) return "text-success";
  if (grade <= 2.0) return "text-accent";
  if (grade <= 3.0) return "text-warning";
  if (grade <= 4.0) return "text-ink-secondary";
  return "text-danger";
}

function gradeBarWidth(grade: number | null): string {
  if (grade === null) return "0%";
  return `${Math.max(5, 100 - (grade - 1) * 25)}%`;
}

function gradeBarColor(grade: number | null): string {
  if (grade === null) return "bg-ink-faint";
  if (grade <= 1.3) return "bg-success";
  if (grade <= 2.0) return "bg-accent";
  if (grade <= 3.0) return "bg-warning";
  if (grade <= 4.0) return "bg-ink-muted";
  return "bg-danger";
}

function weightedAverage(grades: Grade[]): number | null {
  let totalWeight = 0;
  let totalGrade = 0;
  for (const g of grades) {
    if (g.grade === null || g.grade === 0 || g.ects === null) continue;
    totalWeight += g.ects;
    totalGrade += g.grade * g.ects;
  }
  if (totalWeight === 0) return null;
  return Math.round((totalGrade / totalWeight) * 100) / 100;
}

function cumulativeProgression(semesters: SemesterGroup[]): { semester: string; avg: number }[] {
  const sorted = [...semesters]
    .filter((s) => s.avg !== null)
    .sort((a, b) => (a.id ?? "").localeCompare(b.id ?? ""));

  const points: { semester: string; avg: number }[] = [];
  const allGrades: Grade[] = [];

  for (const sem of sorted) {
    allGrades.push(...sem.grades);
    const avg = weightedAverage(allGrades);
    if (avg !== null) {
      points.push({ semester: sem.name, avg });
    }
  }
  return points;
}

function GradeDistribution({ grades }: { grades: Grade[] }) {
  const buckets = useMemo(() => {
    const b = [0, 0, 0, 0, 0];
    for (const g of grades) {
      if (g.grade === null || g.grade === 0) continue;
      if (g.grade <= 1.3) b[0]++;
      else if (g.grade <= 2.0) b[1]++;
      else if (g.grade <= 3.0) b[2]++;
      else if (g.grade <= 4.0) b[3]++;
      else b[4]++;
    }
    return b;
  }, [grades]);

  const max = Math.max(...buckets, 1);
  const labels = ["1.0–1.3", "1.7–2.0", "2.3–3.0", "3.3–4.0", ">4.0"];
  const colors = ["bg-success", "bg-accent", "bg-warning", "bg-ink-muted", "bg-danger"];

  return (
    <div className="flex items-end gap-1.5 h-16">
      {buckets.map((count, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex justify-center">
            <div
              className={`w-full max-w-[28px] rounded-sm ${colors[i]} transition-all`}
              style={{ height: `${Math.max(4, (count / max) * 48)}px` }}
            />
          </div>
          <span className="text-[9px] font-mono text-ink-muted leading-none">{labels[i]}</span>
          {count > 0 && (
            <span className="text-[9px] font-mono text-ink-secondary leading-none">{count}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ProgressionChart({ points }: { points: { semester: string; avg: number }[] }) {
  if (points.length < 2) return null;

  const minG = Math.min(...points.map((p) => p.avg));
  const maxG = Math.max(...points.map((p) => p.avg));
  const padding = 0.3;
  const low = Math.max(1.0, Math.floor((minG - padding) * 10) / 10);
  const high = Math.min(5.0, Math.ceil((maxG + padding) * 10) / 10);
  const range = high - low || 1;

  const w = 100;
  const h = 48;
  const stepX = w / (points.length - 1);

  const pathPoints = points.map((p, i) => {
    const x = i * stepX;
    const y = ((p.avg - low) / range) * h;
    return `${x},${y}`;
  });

  return (
    <div>
      <svg viewBox={`-4 -4 ${w + 8} ${h + 8}`} className="w-full h-16" preserveAspectRatio="none">
        <polyline
          points={pathPoints.join(" ")}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={i * stepX}
            cy={((p.avg - low) / range) * h}
            r="3"
            fill="var(--color-surface)"
            stroke="var(--color-accent)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        {points.map((p, i) => (
          <span key={i} className="text-[9px] font-mono text-ink-muted">{p.semester.replace("Semester ", "").slice(0, 6)}</span>
        ))}
      </div>
    </div>
  );
}

type ViewMode = "overview" | "semester";

export function GradesWidget() {
  const { data: grades, isLoading } = useGrades();
  const syncGrades = useSyncGrades();
  const [view, setView] = useState<ViewMode>("overview");
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);

  const semesters = useMemo(() => {
    if (!grades) return [];
    const map = new Map<string, Grade[]>();
    for (const g of grades) {
      const key = g.semester_id ?? "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    }
    return [...map.entries()]
      .map(([id, items]): SemesterGroup => ({
        id,
        name: items[0].semester_name ?? id,
        grades: items,
        avg: weightedAverage(items),
        ects: items.reduce((s, g) => s + (g.ects ?? 0), 0),
      }))
      .sort((a, b) => b.id.localeCompare(a.id));
  }, [grades]);

  const allGraded = grades?.filter((g) => g.grade !== null && g.grade > 0) ?? [];
  const overallAvg = weightedAverage(allGraded);
  const totalEcts = grades?.reduce((s, g) => s + (g.ects ?? 0), 0) ?? 0;
  const progression = useMemo(() => cumulativeProgression(semesters), [semesters]);

  const activeSemester = selectedSemester
    ? semesters.find((s) => s.id === selectedSemester)
    : null;

  const displayGrades = activeSemester ? activeSemester.grades : allGraded;

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-(--radius-lg) p-5">
        <p className="text-(--text-xs) font-mono text-ink-faint animate-pulse">Loading grades...</p>
      </div>
    );
  }

  if (!grades || grades.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-(--radius-lg) p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-(--text-xs) font-mono uppercase tracking-widest text-ink-muted">
            <span className="mr-1.5">📊</span>Grades
          </h3>
          <button
            onClick={() => syncGrades.mutate()}
            disabled={syncGrades.isPending}
            className="text-(--text-xs) font-mono text-accent hover:text-accent-hover transition-colors"
          >
            {syncGrades.isPending ? "Syncing..." : "Sync from TUM"}
          </button>
        </div>
        <p className="text-(--text-sm) font-mono text-ink-faint">No grades yet. Sync from TUM Online to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-(--radius-lg) p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-(--text-xs) font-mono uppercase tracking-widest text-ink-muted">
          <span className="mr-1.5">📊</span>Grades
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-surface-hover rounded-(--radius-sm) p-0.5">
            <button
              onClick={() => { setView("overview"); setSelectedSemester(null); }}
              className={`text-(--text-xs) font-medium px-2 py-1 rounded-(--radius-sm) transition-colors ${
                view === "overview" ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink-secondary"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setView("semester")}
              className={`text-(--text-xs) font-medium px-2 py-1 rounded-(--radius-sm) transition-colors ${
                view === "semester" ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink-secondary"
              }`}
            >
              By Semester
            </button>
          </div>
          <button
            onClick={() => syncGrades.mutate()}
            disabled={syncGrades.isPending}
            className="text-(--text-xs) font-mono text-accent hover:text-accent-hover transition-colors"
          >
            {syncGrades.isPending ? "Syncing..." : "Sync"}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-page rounded-(--radius-md) p-3">
          <p className={`text-2xl font-semibold leading-none ${gradeColor(overallAvg)}`}>
            {overallAvg?.toFixed(2) ?? "—"}
          </p>
          <p className="text-(--text-xs) font-mono text-ink-muted mt-1">Overall GPA</p>
        </div>
        <div className="bg-page rounded-(--radius-md) p-3">
          <p className="text-2xl font-semibold text-accent leading-none">{totalEcts}</p>
          <p className="text-(--text-xs) font-mono text-ink-muted mt-1">Total ECTS</p>
        </div>
        <div className="bg-page rounded-(--radius-md) p-3">
          <p className="text-2xl font-semibold text-ink leading-none">{allGraded.length}</p>
          <p className="text-(--text-xs) font-mono text-ink-muted mt-1">Exams passed</p>
        </div>
        <div className="bg-page rounded-(--radius-md) p-3">
          <p className="text-2xl font-semibold text-ink leading-none">{semesters.length}</p>
          <p className="text-(--text-xs) font-mono text-ink-muted mt-1">Semesters</p>
        </div>
      </div>

      {view === "overview" ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Distribution */}
          <div className="bg-page rounded-(--radius-md) p-3">
            <p className="text-(--text-xs) font-mono text-ink-muted uppercase tracking-wider mb-3">Distribution</p>
            <GradeDistribution grades={allGraded} />
          </div>

          {/* Progression */}
          <div className="bg-page rounded-(--radius-md) p-3">
            <p className="text-(--text-xs) font-mono text-ink-muted uppercase tracking-wider mb-3">GPA Progression</p>
            {progression.length >= 2 ? (
              <ProgressionChart points={progression} />
            ) : (
              <p className="text-(--text-xs) font-mono text-ink-faint">Need at least 2 semesters</p>
            )}
          </div>

          {/* Recent grades */}
          <div className="col-span-2">
            <p className="text-(--text-xs) font-mono text-ink-muted uppercase tracking-wider mb-2">All Exams</p>
            <div className="space-y-1">
              {displayGrades.map((g) => (
                <div key={g.id} className="flex items-center gap-3 py-1.5">
                  <span className={`text-(--text-sm) font-semibold w-10 text-right ${gradeColor(g.grade)}`}>
                    {g.grade?.toFixed(1) ?? "—"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-(--text-sm) text-ink truncate">{g.exam_name}</span>
                      {g.ects && (
                        <span className="text-[10px] font-mono text-ink-muted flex-shrink-0">{g.ects} ECTS</span>
                      )}
                    </div>
                    <div className="h-1 bg-surface-active rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${gradeBarColor(g.grade)} transition-all`}
                        style={{ width: gradeBarWidth(g.grade) }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Semester tabs */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {semesters.map((sem) => (
              <button
                key={sem.id}
                onClick={() => setSelectedSemester(selectedSemester === sem.id ? null : sem.id)}
                className={`text-(--text-xs) font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  selectedSemester === sem.id
                    ? "bg-accent/10 border-accent/40 text-accent"
                    : "bg-surface border-border-subtle text-ink-muted hover:bg-surface-hover"
                }`}
              >
                {sem.name} · {sem.avg?.toFixed(2) ?? "—"} · {sem.ects} ECTS
              </button>
            ))}
          </div>

          {/* Semester detail or all semesters */}
          {activeSemester ? (
            <div>
              <div className="flex items-baseline gap-3 mb-3">
                <p className="text-(--text-sm) font-semibold text-ink">{activeSemester.name}</p>
                <span className={`text-(--text-sm) font-semibold ${gradeColor(activeSemester.avg)}`}>
                  {activeSemester.avg?.toFixed(2) ?? "—"}
                </span>
                <span className="text-(--text-xs) font-mono text-ink-muted">{activeSemester.ects} ECTS</span>
              </div>
              <div className="space-y-1">
                {activeSemester.grades.map((g) => (
                  <div key={g.id} className="flex items-center gap-3 py-1.5">
                    <span className={`text-(--text-sm) font-semibold w-10 text-right ${gradeColor(g.grade)}`}>
                      {g.grade?.toFixed(1) ?? "—"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-(--text-sm) text-ink truncate">{g.exam_name}</span>
                        {g.ects && (
                          <span className="text-[10px] font-mono text-ink-muted flex-shrink-0">{g.ects} ECTS</span>
                        )}
                      </div>
                      <div className="h-1 bg-surface-active rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${gradeBarColor(g.grade)} transition-all`}
                          style={{ width: gradeBarWidth(g.grade) }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {semesters.map((sem) => (
                <div key={sem.id}>
                  <div className="flex items-baseline justify-between mb-2">
                    <p className="text-(--text-xs) font-mono text-ink-muted uppercase tracking-wider">{sem.name}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-(--text-xs) font-semibold ${gradeColor(sem.avg)}`}>
                        {sem.avg?.toFixed(2) ?? "—"}
                      </span>
                      <span className="text-[10px] font-mono text-ink-faint">{sem.ects} ECTS</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    {sem.grades.map((g) => (
                      <div key={g.id} className="flex items-center gap-3 py-1">
                        <span className={`text-(--text-xs) font-semibold w-8 text-right ${gradeColor(g.grade)}`}>
                          {g.grade?.toFixed(1) ?? "—"}
                        </span>
                        <span className="text-(--text-xs) text-ink truncate flex-1">{g.exam_name}</span>
                        {g.ects && (
                          <span className="text-[10px] font-mono text-ink-faint flex-shrink-0">{g.ects}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
