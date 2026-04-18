import { Router } from "express";
import { getDb } from "../db/client.js";
import { v4 as uuid } from "uuid";

export const clubsRouter = Router();

/* GET / — list clubs ordered by name */
clubsRouter.get("/", (_req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM clubs ORDER BY name ASC`).all();
  res.json(rows);
});

/* POST / — create club */
clubsRouter.post("/", (req, res) => {
  const { name, url } = req.body;

  if (!name || !url) {
    res.status(400).json({ error: "Missing required fields: name, url" });
    return;
  }

  const db = getDb();
  const id = uuid();
  db.prepare(`INSERT INTO clubs (id, name, url) VALUES (?, ?, ?)`).run(id, name, url);

  const row = db.prepare(`SELECT * FROM clubs WHERE id = ?`).get(id);
  res.status(201).json(row);
});

/* DELETE /:id — delete club */
clubsRouter.delete("/:id", (req, res) => {
  const db = getDb();
  const existing = db.prepare(`SELECT * FROM clubs WHERE id = ?`).get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Club not found" });
    return;
  }

  db.prepare(`DELETE FROM clubs WHERE id = ?`).run(req.params.id);
  res.json({ deleted: true, id: req.params.id });
});
