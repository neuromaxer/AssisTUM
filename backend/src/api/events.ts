import { Router } from "express";
import { getDb } from "../db/client.js";
import { v4 as uuid } from "uuid";

export const eventsRouter = Router();

/* GET / — list events with optional filters */
eventsRouter.get("/", (req, res) => {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (req.query.start) {
    conditions.push(`"end" >= ?`);
    params.push(req.query.start);
  }
  if (req.query.end) {
    conditions.push(`"start" <= ?`);
    params.push(req.query.end);
  }
  if (req.query.course_id) {
    conditions.push(`course_id = ?`);
    params.push(req.query.course_id);
  }
  if (req.query.type) {
    conditions.push(`type = ?`);
    params.push(req.query.type);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT * FROM events ${where} ORDER BY "start" ASC`).all(...params);
  res.json(rows);
});

/* GET /:id — single event */
eventsRouter.get("/:id", (req, res) => {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM events WHERE id = ?`).get(req.params.id);
  if (!row) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json(row);
});

/* POST / — create event */
eventsRouter.post("/", (req, res) => {
  const { title, start, end, type, description, color, course_id, source, session_id } = req.body;

  if (!title || !start || !end || !type) {
    res.status(400).json({ error: "Missing required fields: title, start, end, type" });
    return;
  }

  const db = getDb();
  const id = uuid();
  db.prepare(
    `INSERT INTO events (id, title, description, start, end, type, color, course_id, source, session_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, title, description ?? null, start, end, type, color ?? null, course_id ?? null, source ?? "user", session_id ?? null);

  const row = db.prepare(`SELECT * FROM events WHERE id = ?`).get(id);
  res.status(201).json(row);
});

/* PATCH /:id — update event */
eventsRouter.patch("/:id", (req, res) => {
  const db = getDb();
  const existing = db.prepare(`SELECT * FROM events WHERE id = ?`).get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const allowedFields = ["title", "description", "start", "end", "type", "color", "course_id"];
  const updates: string[] = [];
  const params: unknown[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`"${field}" = ?`);
      params.push(req.body[field]);
    }
  }

  if (updates.length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  params.push(req.params.id);
  db.prepare(`UPDATE events SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  const row = db.prepare(`SELECT * FROM events WHERE id = ?`).get(req.params.id);
  res.json(row);
});

/* DELETE /:id — delete event */
eventsRouter.delete("/:id", (req, res) => {
  const db = getDb();
  const existing = db.prepare(`SELECT * FROM events WHERE id = ?`).get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  db.prepare(`DELETE FROM events WHERE id = ?`).run(req.params.id);
  res.json({ deleted: true, id: req.params.id });
});
