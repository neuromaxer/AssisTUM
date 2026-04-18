import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { runMigrations } from "../../db/schema.js";
import { resetDemoData } from "../reset.js";

describe("resetDemoData", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    runMigrations(db);
  });

  it("clears demo data but preserves configuration tables", () => {
    db.prepare(
      "INSERT INTO courses (id, name, source) VALUES (?, ?, ?)"
    ).run("course-1", "Test Course", "agent");

    db.prepare(
      "INSERT INTO events (id, title, start, end, type, course_id, source) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run("event-1", "Lecture", "2026-04-20T09:00", "2026-04-20T11:00", "lecture", "course-1", "agent");

    db.prepare(
      "INSERT INTO todos (id, title, type, course_id, source) VALUES (?, ?, ?, ?, ?)"
    ).run("todo-1", "Homework", "assignment", "course-1", "agent");

    db.prepare(
      "INSERT INTO course_content (id, course_id, title, content_type) VALUES (?, ?, ?, ?)"
    ).run("content-1", "course-1", "Slides", "pdf");

    db.prepare(
      "INSERT INTO emails (id, subject, sender, date) VALUES (?, ?, ?, ?)"
    ).run("email-1", "Hello", "prof@tum.de", "2026-04-18T10:00");

    db.prepare(
      "INSERT INTO clubs (id, name, url) VALUES (?, ?, ?)"
    ).run("club-1", "TUM.ai", "https://tum-ai.com");

    db.prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?)"
    ).run("moodle_token", "abc123");

    const count = (table: string) =>
      (db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number }).c;

    expect(count("events")).toBe(1);
    expect(count("todos")).toBe(1);
    expect(count("courses")).toBe(1);
    expect(count("course_content")).toBe(1);
    expect(count("emails")).toBe(1);
    expect(count("clubs")).toBe(1);
    expect(count("settings")).toBe(1);

    resetDemoData(db);

    expect(count("events")).toBe(0);
    expect(count("todos")).toBe(0);
    expect(count("courses")).toBe(0);
    expect(count("course_content")).toBe(0);
    expect(count("emails")).toBe(0);

    expect(count("clubs")).toBe(1);
    expect(count("settings")).toBe(1);
  });
});
