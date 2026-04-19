import { Router } from "express";
import { getDb } from "../db/client.js";
import { v4 as uuid } from "uuid";
import { parseStringPromise } from "xml2js";

export const gradesRouter = Router();

gradesRouter.get("/", (_req, res) => {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM grades ORDER BY semester_id DESC, exam_name ASC`)
    .all();
  res.json(rows);
});

gradesRouter.post("/sync", async (_req, res) => {
  const db = getDb();

  const tokenRow = db
    .prepare(`SELECT value FROM settings WHERE key = 'tum_online_token'`)
    .get() as { value: string } | undefined;
  if (!tokenRow) {
    res.status(400).json({ error: "TUM Online token not configured" });
    return;
  }

  try {
    const url = `https://campus.tum.de/tumonline/wbservicesbasic.noten?pToken=${encodeURIComponent(tokenRow.value)}`;
    const response = await fetch(url);
    if (!response.ok) {
      res.status(502).json({ error: `TUM Online returned HTTP ${response.status}` });
      return;
    }
    const xml = await response.text();
    const parsed = await parseStringPromise(xml);

    const rows = parsed?.rowset?.row ?? [];
    if (rows.length === 0) {
      res.json({ synced: 0, grades: [] });
      return;
    }

    const upsert = db.prepare(`
      INSERT INTO grades (id, exam_name, grade, grade_text, ects, semester_id, semester_name, exam_date, examiner, module_code, course_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        grade = excluded.grade,
        grade_text = excluded.grade_text,
        ects = excluded.ects,
        semester_name = excluded.semester_name,
        exam_date = excluded.exam_date,
        examiner = excluded.examiner,
        status = excluded.status
    `);

    const courses = db
      .prepare(`SELECT id, module_code FROM courses WHERE module_code IS NOT NULL`)
      .all() as { id: string; module_code: string }[];

    const upsertMany = db.transaction(() => {
      for (const row of rows) {
        const val = (field: string) => {
          const v = row[field];
          if (!v) return null;
          return Array.isArray(v) ? v[0] : String(v);
        };

        const examName = val("pv_konto_nr")
          ? `${val("titel") ?? "Unknown"}`
          : val("titel") ?? "Unknown";

        const gradeStr = val("uninote");
        const grade = gradeStr ? parseFloat(gradeStr.replace(",", ".")) : null;
        const gradeText = val("uninotenamekurz") ?? null;
        const ectsStr = val("ects");
        const ects = ectsStr ? parseFloat(ectsStr.replace(",", ".")) : null;

        const semesterId = val("pv_semester") ?? null;
        const semesterName = val("semester") ?? null;
        const examDate = val("datum") ?? null;
        const examiner = val("pruefer1") ?? null;
        const moduleCode = val("pv_konto_nr") ?? null;

        const status =
          gradeText === "BE" || grade === 0
            ? "passed"
            : grade !== null && grade <= 4.0
              ? "passed"
              : grade !== null && grade > 4.0
                ? "failed"
                : "pending";

        const matchedCourse = moduleCode
          ? courses.find((c) => c.module_code === moduleCode)
          : null;

        const stableId = `grade-${semesterId ?? "nosem"}-${moduleCode ?? examName}`;

        upsert.run(
          stableId,
          examName,
          grade,
          gradeText,
          ects,
          semesterId,
          semesterName,
          examDate,
          examiner,
          moduleCode,
          matchedCourse?.id ?? null,
          status,
        );
      }
    });

    upsertMany();

    const grades = db
      .prepare(`SELECT * FROM grades ORDER BY semester_id DESC, exam_name ASC`)
      .all();
    res.json({ synced: rows.length, grades });
  } catch (e: unknown) {
    res.status(500).json({
      error: `Failed to sync grades: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
});
