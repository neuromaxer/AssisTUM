import { Router } from "express";
import { getDb } from "../db/client.js";
import { v4 as uuid } from "uuid";

export const todosRouter = Router();

/* GET / — list todos with optional filters */
todosRouter.get("/", (req, res) => {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (req.query.course_id) {
    conditions.push(`course_id = ?`);
    params.push(req.query.course_id);
  }
  if (req.query.type) {
    conditions.push(`type = ?`);
    params.push(req.query.type);
  }
  if (req.query.completed !== undefined) {
    conditions.push(`completed = ?`);
    params.push(req.query.completed === "true" ? 1 : 0);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT * FROM todos ${where} ORDER BY COALESCE(deadline, '9999-12-31') ASC, created_at ASC`
    )
    .all(...params);
  res.json(rows);
});

/* GET /:id — single todo */
todosRouter.get("/:id", (req, res) => {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM todos WHERE id = ?`).get(req.params.id);
  if (!row) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }
  res.json(row);
});

/* POST / — create todo */
todosRouter.post("/", (req, res) => {
  const { title, type, description, deadline, priority, course_id, source, session_id } = req.body;

  if (!title || !type) {
    res.status(400).json({ error: "Missing required fields: title, type" });
    return;
  }

  const db = getDb();
  const id = uuid();
  db.prepare(
    `INSERT INTO todos (id, title, description, type, deadline, priority, course_id, source, session_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, title, description ?? null, type, deadline ?? null, priority ?? null, course_id ?? null, source ?? "user", session_id ?? null);

  const row = db.prepare(`SELECT * FROM todos WHERE id = ?`).get(id);
  res.status(201).json(row);
});

/* PATCH /:id — update todo */
todosRouter.patch("/:id", (req, res) => {
  const db = getDb();
  const existing = db.prepare(`SELECT * FROM todos WHERE id = ?`).get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }

  const allowedFields = ["title", "description", "type", "deadline", "priority", "completed", "course_id"];
  const updates: string[] = [];
  const params: unknown[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  }

  if (updates.length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  params.push(req.params.id);
  db.prepare(`UPDATE todos SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  const row = db.prepare(`SELECT * FROM todos WHERE id = ?`).get(req.params.id);
  res.json(row);
});

/* DELETE /:id — delete todo */
todosRouter.delete("/:id", (req, res) => {
  const db = getDb();
  const existing = db.prepare(`SELECT * FROM todos WHERE id = ?`).get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }

  db.prepare(`DELETE FROM todos WHERE id = ?`).run(req.params.id);
  res.json({ deleted: true, id: req.params.id });
});
