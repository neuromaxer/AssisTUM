import type Database from "better-sqlite3";

export function runMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      description       TEXT,
      moodle_course_id  TEXT,
      tum_course_id     TEXT,
      exam_date         TEXT,
      source            TEXT NOT NULL DEFAULT 'agent',
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT,
      start       TEXT NOT NULL,
      end         TEXT NOT NULL,
      type        TEXT NOT NULL,
      color       TEXT,
      course_id   TEXT REFERENCES courses(id),
      source      TEXT NOT NULL DEFAULT 'agent',
      session_id  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS todos (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT,
      type        TEXT NOT NULL,
      deadline    TEXT,
      priority    TEXT,
      completed   INTEGER NOT NULL DEFAULT 0,
      course_id   TEXT REFERENCES courses(id),
      source      TEXT NOT NULL DEFAULT 'agent',
      session_id  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS course_content (
      id            TEXT PRIMARY KEY,
      course_id     TEXT NOT NULL REFERENCES courses(id),
      title         TEXT NOT NULL,
      content_type  TEXT NOT NULL,
      url           TEXT,
      summary       TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS emails (
      id            TEXT PRIMARY KEY,
      message_id    TEXT UNIQUE,
      subject       TEXT NOT NULL,
      sender        TEXT NOT NULL,
      recipients    TEXT,
      body_snippet  TEXT,
      date          TEXT NOT NULL,
      course_id     TEXT REFERENCES courses(id),
      summary       TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clubs (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      url         TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id                  TEXT PRIMARY KEY,
      opencode_session_id TEXT NOT NULL,
      summary             TEXT,
      created_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
