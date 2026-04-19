import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid,
  RadialBarChart, RadialBar,
} from "recharts";
import { useGrades, useSyncGrades, type Grade } from "../hooks/useGrades";

type SemesterGroup = {
  id: string;
  name: string;
  shortName: string;
  grades: Grade[];
  avg: number | null;
  ects: number;
};

const GRADE_COLORS = {
  excellent: "#16a34a",
  good: "#3070b3",
  satisfactory: "#d97706",
  sufficient: "#9c9c9c",
  fail: "#dc2626",
};

function gradeColorHex(grade: number | null): string {
  if (grade === null) return "#c4c4c4";
  if (grade <= 1.3) return GRADE_COLORS.excellent;
  if (grade <= 2.0) return GRADE_COLORS.good;
  if (grade <= 3.0) return GRADE_COLORS.satisfactory;
  if (grade <= 4.0) return GRADE_COLORS.sufficient;
  return GRADE_COLORS.fail;
}

function gradeColorClass(grade: number | null): string {
  if (grade === null) return "text-ink-muted";
  if (grade <= 1.3) return "text-success";
  if (grade <= 2.0) return "text-accent";
  if (grade <= 3.0) return "text-warning";
  if (grade <= 4.0) return "text-ink-secondary";
  return "text-danger";
}

function weightedAverage(grades: Grade[]): number | null {
  let totalWeight = 0;
  let totalGrade = 0;
  for (const g of grades) {
    if (g.grade === null || g.grade === 0 || g.ects === null || g.grade > 4.0) continue;
    totalWeight += g.ects;
    totalGrade += g.grade * g.ects;
  }
  if (totalWeight === 0) return null;
  return Math.round((totalGrade / totalWeight) * 100) / 100;
}

function shortSemester(name: string): string {
  return name.replace("Winter ", "W").replace("Summer ", "S").replace(/\//g, "/");
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
        shortName: shortSemester(items[0].semester_name ?? id),
        grades: items,
        avg: weightedAverage(items),
        ects: items.filter((g) => g.grade === null || g.grade === 0 || g.grade <= 4.0).reduce((s, g) => s + (g.ects ?? 0), 0),
      }))
      .sort((a, b) => b.id.localeCompare(a.id));
  }, [grades]);

  const allGraded = grades?.filter((g) => g.grade !== null && g.grade > 0) ?? [];
  const passed = allGraded.filter((g) => g.grade !== null && g.grade <= 4.0);
  const overallAvg = weightedAverage(passed);
  const totalEcts = passed.reduce((s, g) => s + (g.ects ?? 0), 0);

  const distributionData = useMemo(() => {
    const b = [0, 0, 0, 0, 0];
    for (const g of allGraded) {
      if (g.grade === null) continue;
      if (g.grade <= 1.3) b[0]++;
      else if (g.grade <= 2.0) b[1]++;
      else if (g.grade <= 3.0) b[2]++;
      else if (g.grade <= 4.0) b[3]++;
      else b[4]++;
    }
    return [
      { range: "1.0–1.3", count: b[0], fill: GRADE_COLORS.excellent },
      { range: "1.7–2.0", count: b[1], fill: GRADE_COLORS.good },
      { range: "2.3–3.0", count: b[2], fill: GRADE_COLORS.satisfactory },
      { range: "3.3–4.0", count: b[3], fill: GRADE_COLORS.sufficient },
      { range: ">4.0", count: b[4], fill: GRADE_COLORS.fail },
    ];
  }, [allGraded]);

  const progressionData = useMemo(() => {
    const sorted = [...semesters]
      .filter((s) => s.avg !== null)
      .sort((a, b) => a.id.localeCompare(b.id));
    const points: { semester: string; semAvg: number; cumAvg: number }[] = [];
    const all: Grade[] = [];
    for (const sem of sorted) {
      all.push(...sem.grades);
      const cum = weightedAverage(all);
      if (cum !== null) {
        points.push({ semester: sem.shortName, semAvg: sem.avg!, cumAvg: cum });
      }
    }
    return points;
  }, [semesters]);

  const gpaRadial = useMemo(() => {
    if (overallAvg === null) return [];
    const pct = Math.max(0, ((5 - overallAvg) / 4) * 100);
    return [{ name: "GPA", value: pct, fill: gradeColorHex(overallAvg) }];
  }, [overallAvg]);

  const activeSemester = selectedSemester
    ? semesters.find((s) => s.id === selectedSemester)
    : null;

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

      {view === "overview" ? (
        <div>
          {/* Top row: GPA gauge + stats + distribution */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* GPA radial gauge */}
            <div className="bg-page rounded-(--radius-md) p-4 flex flex-col items-center justify-center">
              <div className="w-28 h-28 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%" cy="50%"
                    innerRadius="72%" outerRadius="100%"
                    startAngle={210} endAngle={-30}
                    data={gpaRadial}
                    barSize={10}
                  >
                    <RadialBar
                      dataKey="value"
                      cornerRadius={5}
                      animationDuration={1200}
                      animationEasing="ease-out"
                      background={{ fill: "var(--color-surface-active)" }}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-bold leading-none ${gradeColorClass(overallAvg)}`}>
                    {overallAvg?.toFixed(2) ?? "—"}
                  </span>
                  <span className="text-[10px] font-mono text-ink-muted mt-1">GPA</span>
                </div>
              </div>
              <div className="flex gap-4 mt-2 text-center">
                <div>
                  <p className="text-(--text-sm) font-semibold text-accent">{totalEcts}</p>
                  <p className="text-[10px] font-mono text-ink-muted">ECTS</p>
                </div>
                <div>
                  <p className="text-(--text-sm) font-semibold text-ink">{allGraded.length}</p>
                  <p className="text-[10px] font-mono text-ink-muted">Exams</p>
                </div>
                <div>
                  <p className="text-(--text-sm) font-semibold text-ink">{semesters.length}</p>
                  <p className="text-[10px] font-mono text-ink-muted">Semesters</p>
                </div>
              </div>
            </div>

            {/* Distribution bar chart */}
            <div className="bg-page rounded-(--radius-md) p-4">
              <p className="text-(--text-xs) font-mono text-ink-muted uppercase tracking-wider mb-2">Distribution</p>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={distributionData} barCategoryGap="20%">
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 10, fill: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-surface)", border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)",
                    }}
                    cursor={{ fill: "var(--color-surface-hover)" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={800} animationEasing="ease-out">
                    {distributionData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* GPA progression */}
            <div className="bg-page rounded-(--radius-md) p-4">
              <p className="text-(--text-xs) font-mono text-ink-muted uppercase tracking-wider mb-2">GPA Progression</p>
              {progressionData.length >= 2 ? (
                <ResponsiveContainer width="100%" height={130}>
                  <AreaChart data={progressionData}>
                    <defs>
                      <linearGradient id="gpaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                    <XAxis
                      dataKey="semester"
                      tick={{ fontSize: 10, fill: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      domain={[1, 4]}
                      reversed
                      tick={{ fontSize: 10, fill: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}
                      axisLine={false} tickLine={false}
                      width={28}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-surface)", border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)",
                      }}
                      formatter={(v: unknown, name: unknown) => [Number(v).toFixed(2), name === "cumAvg" ? "Cumulative" : "Semester"]}
                    />
                    <Area
                      type="monotone" dataKey="cumAvg"
                      stroke="var(--color-accent)" strokeWidth={2}
                      fill="url(#gpaGrad)"
                      dot={{ r: 4, fill: "var(--color-surface)", stroke: "var(--color-accent)", strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                      animationDuration={1000} animationEasing="ease-out"
                    />
                    <Area
                      type="monotone" dataKey="semAvg"
                      stroke="var(--color-ink-muted)" strokeWidth={1.5} strokeDasharray="4 3"
                      fill="none"
                      dot={{ r: 3, fill: "var(--color-surface)", stroke: "var(--color-ink-muted)", strokeWidth: 1.5 }}
                      animationDuration={1000} animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-(--text-xs) font-mono text-ink-faint mt-8 text-center">Need 2+ semesters</p>
              )}
            </div>
          </div>

          {/* Exam list */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {allGraded.map((g) => (
              <div key={g.id} className="flex items-center gap-2.5 py-1.5 border-b border-border-subtle last:border-0">
                <span
                  className="text-(--text-sm) font-bold w-9 text-right tabular-nums"
                  style={{ color: gradeColorHex(g.grade) }}
                >
                  {g.grade?.toFixed(1)}
                </span>
                <span className="text-(--text-sm) text-ink truncate flex-1">{g.exam_name}</span>
                <span className="text-[10px] font-mono text-ink-faint flex-shrink-0">{g.ects}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
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
                {sem.shortName} · {sem.avg?.toFixed(2) ?? "—"} · {sem.ects} ECTS
              </button>
            ))}
          </div>

          {activeSemester ? (
            <div>
              <div className="flex items-baseline gap-3 mb-3">
                <p className="text-(--text-sm) font-semibold text-ink">{activeSemester.name}</p>
                <span className={`text-(--text-sm) font-semibold ${gradeColorClass(activeSemester.avg)}`}>
                  {activeSemester.avg?.toFixed(2) ?? "—"}
                </span>
                <span className="text-(--text-xs) font-mono text-ink-muted">{activeSemester.ects} ECTS</span>
              </div>

              {/* Mini bar chart for this semester */}
              <div className="mb-4">
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart
                    data={activeSemester.grades.filter((g) => g.grade !== null).map((g) => ({
                      name: g.exam_name.length > 20 ? g.exam_name.slice(0, 20) + "…" : g.exam_name,
                      grade: g.grade,
                      fill: gradeColorHex(g.grade),
                    }))}
                    layout="vertical" barCategoryGap="15%"
                  >
                    <XAxis type="number" domain={[0, 5]} hide />
                    <YAxis
                      type="category" dataKey="name" width={160}
                      tick={{ fontSize: 11, fill: "var(--color-ink-secondary)", fontFamily: "var(--font-sans)" }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-surface)", border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)",
                      }}
                    />
                    <Bar dataKey="grade" radius={[0, 4, 4, 0]} animationDuration={600} animationEasing="ease-out">
                      {activeSemester.grades.filter((g) => g.grade !== null).map((g, i) => (
                        <Cell key={i} fill={gradeColorHex(g.grade)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                {activeSemester.grades.map((g) => (
                  <div key={g.id} className="flex items-center gap-2.5 py-1.5 border-b border-border-subtle last:border-0">
                    <span
                      className="text-(--text-sm) font-bold w-9 text-right tabular-nums"
                      style={{ color: gradeColorHex(g.grade) }}
                    >
                      {g.grade?.toFixed(1) ?? "—"}
                    </span>
                    <span className="text-(--text-sm) text-ink truncate flex-1">{g.exam_name}</span>
                    <span className="text-[10px] font-mono text-ink-faint flex-shrink-0">{g.ects}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {semesters.map((sem) => (
                <div key={sem.id} className="border-b border-border-subtle pb-3 last:border-0">
                  <div className="flex items-baseline justify-between mb-2">
                    <p className="text-(--text-xs) font-mono text-ink-muted uppercase tracking-wider">{sem.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-(--text-xs) font-semibold" style={{ color: gradeColorHex(sem.avg) }}>
                        {sem.avg?.toFixed(2) ?? "—"}
                      </span>
                      <span className="text-[10px] font-mono text-ink-faint">{sem.ects} ECTS</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                    {sem.grades.map((g) => (
                      <div key={g.id} className="flex items-center gap-2.5 py-1">
                        <span
                          className="text-(--text-xs) font-bold w-7 text-right tabular-nums"
                          style={{ color: gradeColorHex(g.grade) }}
                        >
                          {g.grade?.toFixed(1) ?? "—"}
                        </span>
                        <span className="text-(--text-xs) text-ink truncate flex-1">{g.exam_name}</span>
                        <span className="text-[10px] font-mono text-ink-faint flex-shrink-0">{g.ects}</span>
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
