import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { runMigrations } from "../../db/schema.js";
import { resetDemoData } from "../reset.js";

describe("resetDemoData", () => {
  let db: Database.Database;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(":memory:");
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    runMigrations(db);
  });

  it("should clear demo data tables (events, todos, courses, course_content, emails) but preserve configuration tables (clubs, settings)", () => {
    // Seed the database with test data

    // Insert a course
    db.prepare(
      "INSERT INTO courses (id, name, description, source) VALUES (?, ?, ?, ?)"
    ).run("course-1", "Test Course", "A test course", "agent");

    // Insert an event linked to the course
    db.prepare(
      "INSERT INTO events (id, title, start, end, type, course_id, source) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run("event-1", "Test Event", "2026-04-18T10:00:00", "2026-04-18T11:00:00", "lecture", "course-1", "agent");

    // Insert a todo linked to the course
    db.prepare(
      "INSERT INTO todos (id, title, type, course_id, source) VALUES (?, ?, ?, ?, ?)"
    ).run("todo-1", "Test Todo", "assignment", "course-1", "agent");

    // Insert course content
    db.prepare(
      "INSERT INTO course_content (id, course_id, title, content_type) VALUES (?, ?, ?, ?)"
    ).run("content-1", "course-1", "Test Content", "slides");

    // Insert an email
    db.prepare(
      "INSERT INTO emails (id, subject, sender, date) VALUES (?, ?, ?, ?)"
    ).run("email-1", "Test Email", "test@example.com", "2026-04-18T10:00:00");

    // Insert a club (should be preserved)
    db.prepare(
      "INSERT INTO clubs (id, name, url) VALUES (?, ?, ?)"
    ).run("club-1", "Test Club", "https://example.com");

    // Insert a settings row (should be preserved)
    db.prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?)"
    ).run("test_setting", "test_value");

    // Verify data exists before reset
    expect(db.prepare("SELECT COUNT(*) as count FROM courses").get()).toEqual({ count: 1 });
    expect(db.prepare("SELECT COUNT(*) as count FROM events").get()).toEqual({ count: 1 });
    expect(db.prepare("SELECT COUNT(*) as count FROM todos").get()).toEqual({ count: 1 });
    expect(db.prepare("SELECT COUNT(*) as count FROM course_content").get()).toEqual({ count: 1 });
    expect(db.prepare("SELECT COUNT(*) as count FROM emails").get()).toEqual({ count: 1 });
    expect(db.prepare("SELECT COUNT(*) as count FROM clubs").get()).toEqual({ count: 1 });
    expect(db.prepare("SELECT COUNT(*) as count FROM settings").get()).toEqual({ count: 1 });

    // Call resetDemoData
    resetDemoData(db);

    // Assert: demo data tables are empty
    expect(db.prepare("SELECT COUNT(*) as count FROM events").get()).toEqual({ count: 0 });
    expect(db.prepare("SELECT COUNT(*) as count FROM todos").get()).toEqual({ count: 0 });
    expect(db.prepare("SELECT COUNT(*) as count FROM course_content").get()).toEqual({ count: 0 });
    expect(db.prepare("SELECT COUNT(*) as count FROM emails").get()).toEqual({ count: 0 });
    expect(db.prepare("SELECT COUNT(*) as count FROM courses").get()).toEqual({ count: 0 });

    // Assert: configuration tables still have their rows
    expect(db.prepare("SELECT COUNT(*) as count FROM clubs").get()).toEqual({ count: 1 });
    expect(db.prepare("SELECT COUNT(*) as count FROM settings").get()).toEqual({ count: 1 });
  });
});
