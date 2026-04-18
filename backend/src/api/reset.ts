import { Router } from "express";
import type Database from "better-sqlite3";
import { getDb } from "../db/client.js";

export function resetDemoData(db: Database.Database): void {
  db.prepare("DELETE FROM events").run();
  db.prepare("DELETE FROM todos").run();
  db.prepare("DELETE FROM course_content").run();
  db.prepare("DELETE FROM emails").run();
  db.prepare("DELETE FROM courses").run();
}

export const resetRouter = Router();

resetRouter.delete("/", (_req, res) => {
  const db = getDb();
  resetDemoData(db);
  res.json({ reset: true });
});
