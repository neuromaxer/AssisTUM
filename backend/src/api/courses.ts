import { Router } from "express";
import { getDb } from "../db/client.js";
import { v4 as uuid } from "uuid";

export const coursesRouter = Router();

/* GET / — list courses with event_count and todo_count */
coursesRouter.get("/", (_req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM events e WHERE e.course_id = c.id) AS event_count,
              (SELECT COUNT(*) FROM todos  t WHERE t.course_id = c.id) AS todo_count
       FROM courses c
       ORDER BY c.name ASC`
    )
    .all();
  res.json(rows);
});

/* GET /:id — single course */
coursesRouter.get("/:id", (req, res) => {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM events e WHERE e.course_id = c.id) AS event_count,
              (SELECT COUNT(*) FROM todos  t WHERE t.course_id = c.id) AS todo_count
       FROM courses c
       WHERE c.id = ?`
    )
    .get(req.params.id);
  if (!row) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  res.json(row);
});

/* POST / — create course */
coursesRouter.post("/", (req, res) => {
  const { name, description, moodle_course_id, tum_course_id, exam_date, source } = req.body;

  if (!name) {
    res.status(400).json({ error: "Missing required field: name" });
    return;
  }

  const db = getDb();
  const id = uuid();
  db.prepare(
    `INSERT INTO courses (id, name, description, moodle_course_id, tum_course_id, exam_date, source)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, description ?? null, moodle_course_id ?? null, tum_course_id ?? null, exam_date ?? null, source ?? "agent");

  const row = db.prepare(`SELECT * FROM courses WHERE id = ?`).get(id);
  res.status(201).json(row);
});

/* DELETE /:id — delete course */
coursesRouter.delete("/:id", (req, res) => {
  const db = getDb();
  const existing = db.prepare(`SELECT * FROM courses WHERE id = ?`).get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  db.prepare(`DELETE FROM courses WHERE id = ?`).run(req.params.id);
  res.json({ deleted: true, id: req.params.id });
});

/* POST /sync — fetch lectures from TUM Online, group by module code, upsert courses */
coursesRouter.post("/sync", async (_req, res) => {
  const db = getDb();

  const tokenRow = db.prepare(`SELECT value FROM settings WHERE key = 'tum_online_token'`).get() as { value: string } | undefined;
  if (!tokenRow) {
    res.status(400).json({ error: "TUM Online token not configured" });
    return;
  }

  const url = `https://campus.tum.de/tumonline/wbservicesbasic.veranstaltungenEigene?pToken=${tokenRow.value}`;
  const response = await fetch(url);
  const xml = await response.text();

  // Parse XML rows
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
    res.json({ synced: 0, courses: [] });
    return;
  }

  // Group by module code
  const codeRegex = /\(([A-Z]{2,}\d{4,}(?:,\s*[A-Z]{2,}\d{4,})*)\)/;
  const groups = new Map<string, typeof rows>();

  for (const row of rows) {
    const title = row.stp_sp_titel ?? "";
    const match = codeRegex.exec(title);
    const key = match ? match[1].split(",")[0].trim() : `__solo_${row.stp_sp_nr}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  // Upsert courses
  const upsert = db.prepare(`
    INSERT INTO courses (id, name, tum_course_id, module_code, sws, course_type, semester_id, semester_name, department, lecturers, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'tum_online')
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      tum_course_id = excluded.tum_course_id,
      module_code = excluded.module_code,
      sws = excluded.sws,
      course_type = excluded.course_type,
      semester_id = excluded.semester_id,
      semester_name = excluded.semester_name,
      department = excluded.department,
      lecturers = excluded.lecturers
  `);

  const upsertMany = db.transaction(() => {
    for (const [key, entries] of groups) {
      const isGrouped = !key.startsWith("__solo_");
      const moduleCode = isGrouped ? key : null;

      const rawTitle = entries[0].stp_sp_titel ?? "Unknown";
      const name = isGrouped
        ? rawTitle.replace(codeRegex, "").replace(/\s*;\s*.*$/, "").trim()
        : rawTitle;

      const tumCourseId = entries.map((e) => e.stp_sp_nr).join(",");
      const courseTypes = [...new Set(entries.map((e) => e.stp_lv_art_kurz))].join(", ");

      const totalSws = entries.reduce((sum, e) => {
        const val = parseFloat((e.stp_sp_sst ?? "0").replace(",", "."));
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
      const sws = String(totalSws);

      const semesterId = entries[0].semester_id ?? null;
      const semesterName = entries[0].semester_name ?? null;
      const department = entries[0].org_name_betreut ?? null;
      const allLecturers = [...new Set(entries.flatMap((e) =>
        (e.vortragende_mitwirkende ?? "").split(",").map((l: string) => l.trim()).filter(Boolean)
      ))].join(", ");

      const existingByTum = db.prepare(
        `SELECT id FROM courses WHERE tum_course_id = ?`
      ).get(tumCourseId) as { id: string } | undefined;

      const id = existingByTum?.id ?? uuid();

      upsert.run(id, name, tumCourseId, moduleCode, sws, courseTypes, semesterId, semesterName, department, allLecturers);
    }
  });

  upsertMany();

  // Second pass: link unlinked events to courses by title/module code match
  const allCourses = db.prepare(`SELECT id, name, module_code FROM courses WHERE module_code IS NOT NULL`).all() as { id: string; name: string; module_code: string }[];
  for (const course of allCourses) {
    db.prepare(
      `UPDATE events SET course_id = ? WHERE course_id IS NULL AND (title LIKE ? OR title LIKE ?)`
    ).run(course.id, `%${course.name}%`, `%${course.module_code}%`);
  }

  const courses = db.prepare(
    `SELECT c.*,
            (SELECT COUNT(*) FROM events e WHERE e.course_id = c.id) AS event_count,
            (SELECT COUNT(*) FROM todos  t WHERE t.course_id = c.id) AS todo_count
     FROM courses c ORDER BY c.name ASC`
  ).all();

  res.json({ synced: groups.size, courses });
});
