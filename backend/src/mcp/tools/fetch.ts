import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../../db/client.js";
import { parseStringPromise } from "xml2js";
import * as ical from "node-ical";
import { ImapFlow } from "imapflow";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

function err(message: string) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }] };
}

function getSetting(key: string): string | undefined {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerFetchTools(server: McpServer) {
  // =========================================================================
  // tum_lectures
  // =========================================================================
  server.tool(
    "tum_lectures",
    "Fetch the user's TUM Online lecture list",
    {},
    async () => {
      const token = getSetting("tum_online_token");
      if (!token) {
        return err("Missing setting: tum_online_token. Please configure it in Settings.");
      }

      try {
        const url = `https://campus.tum.de/tumonline/wbservicesbasic.veranstaltungenEigene?pToken=${encodeURIComponent(token)}`;
        const res = await fetch(url);
        if (!res.ok) {
          return err(`TUM Online returned HTTP ${res.status}`);
        }
        const xml = await res.text();
        const parsed = await parseStringPromise(xml);
        return ok(parsed);
      } catch (e: unknown) {
        return err(`Failed to fetch lectures: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  // =========================================================================
  // tum_calendar
  // =========================================================================
  server.tool(
    "tum_calendar",
    "Fetch the user's TUM calendar events from iCal URL",
    {},
    async () => {
      const icalUrl = getSetting("tum_ical_url");
      if (!icalUrl) {
        return err("Missing setting: tum_ical_url. Please configure it in Settings.");
      }

      try {
        const data = await ical.async.fromURL(icalUrl);
        const events = Object.values(data)
          .filter((component): component is ical.VEvent => component.type === "VEVENT")
          .map((ev) => ({
            title: ev.summary ?? "",
            description: ev.description ?? "",
            start: ev.start?.toISOString?.() ?? String(ev.start),
            end: ev.end?.toISOString?.() ?? String(ev.end),
            location: ev.location ?? "",
          }));
        return ok(events);
      } catch (e: unknown) {
        return err(`Failed to fetch calendar: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  // =========================================================================
  // tum_grades
  // =========================================================================
  server.tool(
    "tum_grades",
    "Fetch the user's TUM Online grades",
    {},
    async () => {
      const token = getSetting("tum_online_token");
      if (!token) {
        return err("Missing setting: tum_online_token. Please configure it in Settings.");
      }

      try {
        const url = `https://campus.tum.de/tumonline/wbservicesbasic.noten?pToken=${encodeURIComponent(token)}`;
        const res = await fetch(url);
        if (!res.ok) {
          return err(`TUM Online returned HTTP ${res.status}`);
        }
        const xml = await res.text();
        const parsed = await parseStringPromise(xml);
        return ok(parsed);
      } catch (e: unknown) {
        return err(`Failed to fetch grades: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  // =========================================================================
  // moodle_courses
  // =========================================================================
  server.tool(
    "moodle_courses",
    "Fetch the user's enrolled Moodle courses",
    {},
    async () => {
      const token = getSetting("moodle_token");
      if (!token) {
        return err("Missing setting: moodle_token. Please configure it in Settings.");
      }

      try {
        const url =
          `https://www.moodle.tum.de/webservice/rest/server.php` +
          `?wstoken=${encodeURIComponent(token)}` +
          `&wsfunction=core_enrol_get_users_courses` +
          `&moodlewsrestformat=json` +
          `&userid=0`;
        const res = await fetch(url);
        if (!res.ok) {
          return err(`Moodle returned HTTP ${res.status}`);
        }
        const data = await res.json();
        return ok(data);
      } catch (e: unknown) {
        return err(`Failed to fetch Moodle courses: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  // =========================================================================
  // moodle_assignments
  // =========================================================================
  server.tool(
    "moodle_assignments",
    "Fetch Moodle assignments, optionally filtered by course IDs",
    {
      course_ids: z.array(z.number()).optional().describe("Array of Moodle course IDs to filter by"),
    },
    async (args) => {
      const token = getSetting("moodle_token");
      if (!token) {
        return err("Missing setting: moodle_token. Please configure it in Settings.");
      }

      try {
        let url =
          `https://www.moodle.tum.de/webservice/rest/server.php` +
          `?wstoken=${encodeURIComponent(token)}` +
          `&wsfunction=mod_assign_get_assignments` +
          `&moodlewsrestformat=json`;

        if (args.course_ids && args.course_ids.length > 0) {
          const courseParams = args.course_ids
            .map((id, i) => `courseids[${i}]=${encodeURIComponent(id)}`)
            .join("&");
          url += `&${courseParams}`;
        }

        const res = await fetch(url);
        if (!res.ok) {
          return err(`Moodle returned HTTP ${res.status}`);
        }
        const data = await res.json();
        return ok(data);
      } catch (e: unknown) {
        return err(`Failed to fetch Moodle assignments: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  // =========================================================================
  // moodle_course_content
  // =========================================================================
  server.tool(
    "moodle_course_content",
    "Fetch the content/sections of a specific Moodle course",
    {
      course_id: z.number().describe("The Moodle course ID"),
    },
    async (args) => {
      const token = getSetting("moodle_token");
      if (!token) {
        return err("Missing setting: moodle_token. Please configure it in Settings.");
      }

      try {
        const url =
          `https://www.moodle.tum.de/webservice/rest/server.php` +
          `?wstoken=${encodeURIComponent(token)}` +
          `&wsfunction=core_course_get_contents` +
          `&moodlewsrestformat=json` +
          `&courseid=${encodeURIComponent(args.course_id)}`;

        const res = await fetch(url);
        if (!res.ok) {
          return err(`Moodle returned HTTP ${res.status}`);
        }
        const data = await res.json();
        return ok(data);
      } catch (e: unknown) {
        return err(`Failed to fetch Moodle course content: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  // =========================================================================
  // canteen_menu
  // =========================================================================
  server.tool(
    "canteen_menu",
    "Fetch the canteen/mensa menu for a given location and week",
    {
      location: z.string().describe("Canteen identifier, e.g. 'mensa-garching'"),
      year: z.number().optional().describe("Year (defaults to current year)"),
      week: z.number().optional().describe("ISO week number (defaults to current week)"),
    },
    async (args) => {
      const now = new Date();
      const year = args.year ?? now.getFullYear();
      const week = args.week ?? getWeekNumber(now);
      const weekPadded = String(week).padStart(2, "0");

      try {
        const url = `https://tum-dev.github.io/eat-api/${encodeURIComponent(args.location)}/${year}/${weekPadded}.json`;
        const res = await fetch(url);
        if (!res.ok) {
          return err(`Eat API returned HTTP ${res.status} for ${url}`);
        }
        const data = await res.json();
        return ok(data);
      } catch (e: unknown) {
        return err(`Failed to fetch canteen menu: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  // =========================================================================
  // tum_email_read
  // =========================================================================
  server.tool(
    "tum_email_read",
    "Read recent emails from the user's TUM IMAP inbox",
    {
      limit: z.number().optional().describe("Maximum number of emails to return (default 20)"),
      since_days: z.number().optional().describe("Fetch emails from the last N days (default 7)"),
    },
    async (args) => {
      const user = getSetting("tum_email_user");
      const pass = getSetting("tum_email_password");
      if (!user || !pass) {
        return err("Missing settings: tum_email_user and/or tum_email_password. Please configure them in Settings.");
      }

      const limit = args.limit ?? 20;
      const sinceDays = args.since_days ?? 7;
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - sinceDays);

      const client = new ImapFlow({
        host: "mail.tum.de",
        port: 993,
        secure: true,
        auth: { user, pass },
        logger: false,
      });

      try {
        await client.connect();
        const lock = await client.getMailboxLock("INBOX");

        try {
          const messages: Array<{
            message_id: string;
            subject: string;
            sender: string;
            date: string;
            body_snippet: string;
          }> = [];

          const fetchQuery = {
            envelope: true,
            source: { start: 0, maxLength: 4096 } as { start: number; maxLength: number },
          };

          let count = 0;
          for await (const msg of client.fetch({ since: sinceDate }, fetchQuery)) {
            if (count >= limit) break;

            const envelope = msg.envelope;
            const senderAddr = envelope?.from?.[0];
            const sender = senderAddr
              ? senderAddr.name
                ? `${senderAddr.name} <${senderAddr.address}>`
                : senderAddr.address ?? "unknown"
              : "unknown";

            let bodySnippet = "";
            if (msg.source) {
              const raw = msg.source.toString("utf-8");
              // Extract body after headers (double newline)
              const bodyStart = raw.indexOf("\r\n\r\n");
              if (bodyStart !== -1) {
                bodySnippet = raw.slice(bodyStart + 4, bodyStart + 504).trim();
              }
            }

            messages.push({
              message_id: envelope?.messageId ?? "",
              subject: envelope?.subject ?? "",
              sender,
              date: envelope?.date?.toISOString?.() ?? "",
              body_snippet: bodySnippet,
            });

            count++;
          }

          return ok(messages);
        } finally {
          lock.release();
        }
      } catch (e: unknown) {
        return err(`Failed to read emails: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        try {
          await client.logout();
        } catch {
          // ignore logout errors
        }
      }
    },
  );

  // =========================================================================
  // club_events
  // =========================================================================
  server.tool(
    "club_events",
    "Fetch event pages for all configured student clubs",
    {},
    async () => {
      const db = getDb();
      const clubs = db.prepare("SELECT id, name, url FROM clubs").all() as Array<{
        id: string;
        name: string;
        url: string;
      }>;

      if (clubs.length === 0) {
        return err("No clubs configured. Add clubs in Settings first.");
      }

      const results = await Promise.all(
        clubs.map(async (club) => {
          try {
            const res = await fetch(club.url);
            if (!res.ok) {
              return { club: club.name, url: club.url, error: `HTTP ${res.status}` };
            }
            const html = await res.text();
            return { club: club.name, url: club.url, html_snippet: html.slice(0, 3000) };
          } catch (e: unknown) {
            return {
              club: club.name,
              url: club.url,
              error: e instanceof Error ? e.message : String(e),
            };
          }
        }),
      );

      return ok(results);
    },
  );
}
