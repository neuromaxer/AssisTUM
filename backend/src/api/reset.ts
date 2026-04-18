import express from "express";
import type Database from "better-sqlite3";
import { getDb } from "../db/client.js";

/**
 * Clears demo data from the database (events, todos, courses, course_content, emails)
 * while preserving configuration tables (clubs, sessions, settings)
 */
export function resetDemoData(db: Database.Database): void {
  // Delete in correct order due to foreign key constraints
  // First delete child tables that reference courses
  db.prepare("DELETE FROM events").run();
  db.prepare("DELETE FROM todos").run();
  db.prepare("DELETE FROM course_content").run();
  db.prepare("DELETE FROM emails").run();

  // Then delete the parent table
  db.prepare("DELETE FROM courses").run();
}

export const resetRouter = express.Router();

resetRouter.delete("/", (_req, res) => {
  try {
    const db = getDb();
    resetDemoData(db);
    res.json({ success: true, message: "Demo data cleared successfully" });
  } catch (error) {
    console.error("Error resetting demo data:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
