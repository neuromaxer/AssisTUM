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
