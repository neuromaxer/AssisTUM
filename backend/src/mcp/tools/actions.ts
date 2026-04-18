import { z } from "zod";
import { v4 as uuid } from "uuid";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../../db/client.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

function err(message: string) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }] };
}

function courseExists(courseId: string): boolean {
  const row = getDb().prepare("SELECT id FROM courses WHERE id = ?").get(courseId);
  return !!row;
}

// ---------------------------------------------------------------------------
// Enum values
// ---------------------------------------------------------------------------

const eventTypes = ["lecture", "study", "club", "recreation", "meal", "custom"] as const;
const todoTypes = ["assignment", "email_action", "personal", "revision"] as const;
const priorities = ["high", "medium", "low"] as const;

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerActionTools(server: McpServer) {
  // =========================================================================
  // create_event
  // =========================================================================
  server.tool(
    "create_event",
    "Create a new calendar event",
    {
      title: z.string(),
      description: z.string().optional(),
      start: z.string().describe("ISO 8601 datetime"),
      end: z.string().describe("ISO 8601 datetime"),
      type: z.enum(eventTypes),
      color: z.string().optional(),
      course_id: z.string().optional(),
    },
    (args) => {
      const db = getDb();

      if (args.course_id && !courseExists(args.course_id)) {
        return err(`Course not found: ${args.course_id}`);
      }

      const id = uuid();
      db.prepare(
        `INSERT INTO events (id, title, description, start, end, type, color, course_id, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'agent')`
      ).run(
        id,
        args.title,
        args.description ?? null,
        args.start,
        args.end,
        args.type,
        args.color ?? null,
        args.course_id ?? null,
      );

      const row = db.prepare("SELECT * FROM events WHERE id = ?").get(id);
      return ok(row);
    },
  );

  // =========================================================================
  // update_event
  // =========================================================================
  server.tool(
    "update_event",
    "Update an existing calendar event",
    {
      event_id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      start: z.string().optional().describe("ISO 8601 datetime"),
      end: z.string().optional().describe("ISO 8601 datetime"),
      type: z.enum(eventTypes).optional(),
      color: z.string().optional(),
      course_id: z.string().nullable().optional(),
    },
    (args) => {
      const db = getDb();

      const existing = db.prepare("SELECT * FROM events WHERE id = ?").get(args.event_id);
      if (!existing) {
        return err(`Event not found: ${args.event_id}`);
      }

      if (args.course_id !== undefined && args.course_id !== null && !courseExists(args.course_id)) {
        return err(`Course not found: ${args.course_id}`);
      }

      const allowedFields = ["title", "description", "start", "end", "type", "color", "course_id"] as const;
      const updates: string[] = [];
      const params: unknown[] = [];

      for (const field of allowedFields) {
        if (args[field] !== undefined) {
          updates.push(`"${field}" = ?`);
          params.push(args[field]);
        }
      }

      if (updates.length === 0) {
        return err("No fields to update");
      }

      params.push(args.event_id);
      db.prepare(`UPDATE events SET ${updates.join(", ")} WHERE id = ?`).run(...params);

      const row = db.prepare("SELECT * FROM events WHERE id = ?").get(args.event_id);
      return ok(row);
    },
  );

  // =========================================================================
  // delete_event
  // =========================================================================
  server.tool(
    "delete_event",
    "Delete a calendar event",
    {
      event_id: z.string(),
    },
    (args) => {
      const db = getDb();

      const existing = db.prepare("SELECT * FROM events WHERE id = ?").get(args.event_id);
      if (!existing) {
        return err(`Event not found: ${args.event_id}`);
      }

      db.prepare("DELETE FROM events WHERE id = ?").run(args.event_id);
      return ok({ deleted: true, id: args.event_id });
    },
  );

  // =========================================================================
  // create_todo
  // =========================================================================
  server.tool(
    "create_todo",
    "Create a new todo item",
    {
      title: z.string(),
      description: z.string().optional(),
      type: z.enum(todoTypes),
      deadline: z.string().optional().describe("ISO 8601 datetime"),
      priority: z.enum(priorities),
      course_id: z.string().optional(),
      source_link: z.string().optional().describe("URL to the origin (Moodle page, email reference)"),
      resources: z.string().optional().describe("JSON array of {title, url, summary?} for related files/links"),
    },
    (args) => {
      const db = getDb();

      if (args.course_id && !courseExists(args.course_id)) {
        return err(`Course not found: ${args.course_id}`);
      }

      const id = uuid();
      db.prepare(
        `INSERT INTO todos (id, title, description, type, deadline, priority, course_id, source, source_link, resources)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'agent', ?, ?)`
      ).run(
        id,
        args.title,
        args.description ?? null,
        args.type,
        args.deadline ?? null,
        args.priority,
        args.course_id ?? null,
        args.source_link ?? null,
        args.resources ?? null,
      );

      const row = db.prepare("SELECT * FROM todos WHERE id = ?").get(id);
      return ok(row);
    },
  );

  // =========================================================================
  // update_todo
  // =========================================================================
  server.tool(
    "update_todo",
    "Update an existing todo item",
    {
      todo_id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      type: z.enum(todoTypes).optional(),
      deadline: z.string().optional().describe("ISO 8601 datetime"),
      priority: z.enum(priorities).optional(),
      completed: z.boolean().optional().describe("Completion status"),
      course_id: z.string().nullable().optional(),
      source_link: z.string().optional().describe("URL to the origin (Moodle page, email reference)"),
      resources: z.string().optional().describe("JSON array of {title, url, summary?} for related files/links"),
    },
    (args) => {
      const db = getDb();

      const existing = db.prepare("SELECT * FROM todos WHERE id = ?").get(args.todo_id);
      if (!existing) {
        return err(`Todo not found: ${args.todo_id}`);
      }

      if (args.course_id !== undefined && args.course_id !== null && !courseExists(args.course_id)) {
        return err(`Course not found: ${args.course_id}`);
      }

      const allowedFields = ["title", "description", "type", "deadline", "priority", "completed", "course_id", "source_link", "resources"] as const;
      const updates: string[] = [];
      const params: unknown[] = [];

      for (const field of allowedFields) {
        if (args[field] !== undefined) {
          // Convert boolean completed to integer for SQLite
          const value = field === "completed" ? (args[field] ? 1 : 0) : args[field];
          updates.push(`${field} = ?`);
          params.push(value);
        }
      }

      if (updates.length === 0) {
        return err("No fields to update");
      }

      params.push(args.todo_id);
      db.prepare(`UPDATE todos SET ${updates.join(", ")} WHERE id = ?`).run(...params);

      const row = db.prepare("SELECT * FROM todos WHERE id = ?").get(args.todo_id);
      return ok(row);
    },
  );

  // =========================================================================
  // delete_todo
  // =========================================================================
  server.tool(
    "delete_todo",
    "Delete a todo item",
    {
      todo_id: z.string(),
    },
    (args) => {
      const db = getDb();

      const existing = db.prepare("SELECT * FROM todos WHERE id = ?").get(args.todo_id);
      if (!existing) {
        return err(`Todo not found: ${args.todo_id}`);
      }

      db.prepare("DELETE FROM todos WHERE id = ?").run(args.todo_id);
      return ok({ deleted: true, id: args.todo_id });
    },
  );

  // =========================================================================
  // create_course
  // =========================================================================
  server.tool(
    "create_course",
    "Create a new course",
    {
      name: z.string(),
      description: z.string().optional(),
      moodle_course_id: z.string().optional(),
      tum_course_id: z.string().optional(),
      exam_date: z.string().optional().describe("ISO 8601 date"),
    },
    (args) => {
      const db = getDb();

      const id = uuid();
      db.prepare(
        `INSERT INTO courses (id, name, description, moodle_course_id, tum_course_id, exam_date, source)
         VALUES (?, ?, ?, ?, ?, ?, 'agent')`
      ).run(
        id,
        args.name,
        args.description ?? null,
        args.moodle_course_id ?? null,
        args.tum_course_id ?? null,
        args.exam_date ?? null,
      );

      const row = db.prepare("SELECT * FROM courses WHERE id = ?").get(id);
      return ok(row);
    },
  );

  // =========================================================================
  // query_events
  // =========================================================================
  server.tool(
    "query_events",
    "Query calendar events with optional filters",
    {
      start: z.string().optional().describe("Filter events ending at or after this ISO 8601 datetime"),
      end: z.string().optional().describe("Filter events starting at or before this ISO 8601 datetime"),
      course_id: z.string().optional(),
      type: z.enum(eventTypes).optional(),
    },
    (args) => {
      const db = getDb();
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (args.start) {
        conditions.push(`"end" >= ?`);
        params.push(args.start);
      }
      if (args.end) {
        conditions.push(`"start" <= ?`);
        params.push(args.end);
      }
      if (args.course_id) {
        conditions.push(`course_id = ?`);
        params.push(args.course_id);
      }
      if (args.type) {
        conditions.push(`type = ?`);
        params.push(args.type);
      }

      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      const rows = db.prepare(`SELECT * FROM events ${where} ORDER BY "start" ASC`).all(...params);
      return ok(rows);
    },
  );

  // =========================================================================
  // query_todos
  // =========================================================================
  server.tool(
    "query_todos",
    "Query todo items with optional filters",
    {
      course_id: z.string().optional(),
      type: z.enum(todoTypes).optional(),
      completed: z.boolean().optional(),
    },
    (args) => {
      const db = getDb();
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (args.course_id) {
        conditions.push(`course_id = ?`);
        params.push(args.course_id);
      }
      if (args.type) {
        conditions.push(`type = ?`);
        params.push(args.type);
      }
      if (args.completed !== undefined) {
        conditions.push(`completed = ?`);
        params.push(args.completed ? 1 : 0);
      }

      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      const rows = db
        .prepare(`SELECT * FROM todos ${where} ORDER BY COALESCE(deadline, '9999-12-31') ASC, created_at ASC`)
        .all(...params);
      return ok(rows);
    },
  );

  // =========================================================================
  // query_courses
  // =========================================================================
  server.tool(
    "query_courses",
    "List all courses with event and todo counts",
    {},
    () => {
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
      return ok(rows);
    },
  );
}
