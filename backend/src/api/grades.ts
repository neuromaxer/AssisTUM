import { Router } from "express";
import { getDb } from "../db/client.js";

function semesterToName(id: string): string {
  const match = id.match(/^(\d{2})([WS])$/);
  if (!match) return id;
  const year = parseInt("20" + match[1]);
  if (match[2] === "W") return `Winter ${year}/${(year + 1).toString().slice(-2)}`;
  return `Summer ${year}`;
}

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

    const rows: Record<string, string>[] = [];
    const rowRegex = /<row>([\s\S]*?)<\/row>/g;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(xml)) !== null) {
      const fields: Record<string, string> = {};
      const fieldRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;
      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(rowMatch[1])) !== null) {
        fields[fieldMatch[1]] = fieldMatch[2].trim();
      }
      rows.push(fields);
    }

    if (rows.length === 0) {
      res.json({ synced: 0, grades: [], debug: { xmlLength: xml.length, firstChars: xml.slice(0, 500) } });
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

    const fieldNames = rows.length > 0 ? Object.keys(rows[0]) : [];
    console.log("[grades/sync] field names:", fieldNames);
    console.log("[grades/sync] sample row:", JSON.stringify(rows[0], null, 2));
    if (rows.length > 1) console.log("[grades/sync] second row:", JSON.stringify(rows[1], null, 2));

    const upsertMany = db.transaction(() => {
      for (const row of rows) {
        const examName = (row.lv_titel ?? "Unknown").trim();

        const gradeStr = row.uninotenamekurz ?? null;
        const grade = gradeStr ? parseFloat(gradeStr.replace(",", ".")) : null;
        const gradeText = gradeStr;

        const ectsStr = row.lv_credits ?? null;
        const ects = ectsStr ? parseFloat(ectsStr.replace(",", ".")) : null;

        const semesterId = row.lv_semester ?? null;
        const semesterName = semesterId ? semesterToName(semesterId) : null;
        const examDate = row.datum ?? null;
        const examiner = row.pruefer_nachname ?? null;
        const moduleCode = row.lv_nummer ?? null;

        const status =
          gradeText === "BE" || grade === 0
            ? "passed"
            : grade !== null && !isNaN(grade) && grade <= 4.0
              ? "passed"
              : grade !== null && !isNaN(grade) && grade > 4.0
                ? "failed"
                : "pending";

        const matchedCourse = moduleCode
          ? courses.find((c) => c.module_code === moduleCode)
          : null;

        const stableId = `grade-${semesterId ?? "nosem"}-${moduleCode ?? examName}`;

        upsert.run(
          stableId,
          examName,
          grade !== null && !isNaN(grade) ? grade : null,
          gradeText,
          ects !== null && !isNaN(ects) ? ects : null,
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
    res.json({ synced: rows.length, grades, debug: { fieldNames, sampleRow: rows[0] } });
  } catch (e: unknown) {
    res.status(500).json({
      error: `Failed to sync grades: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
});
