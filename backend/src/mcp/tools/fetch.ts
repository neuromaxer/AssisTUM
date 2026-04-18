import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../../db/client.js";
import { parseStringPromise } from "xml2js";
import ical from "node-ical";
import { ImapFlow } from "imapflow";
import { getMoodleSession, moodleAjax, moodleLogin, decodeHtmlEntities } from "../../moodle-session.js";
import * as cheerio from "cheerio";

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

function saveSetting(key: string, value: string) {
  const db = getDb();
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, value);
}

async function ensureMoodleSession(): Promise<{ session: string; sessKey: string; userId: number }> {
  const existing = getMoodleSession();
  if (existing) {
    console.log(`[moodle] Testing existing session...`);
    const testRes = await fetch(`https://www.moodle.tum.de/my/`, {
      headers: { Cookie: `MoodleSession=${existing.session}` },
      redirect: "manual",
    });
    console.log(`[moodle] Session test: HTTP ${testRes.status}`);
    if (testRes.status === 200) return existing;
    console.log(`[moodle] Session expired, re-authenticating...`);
  }
  const username = getSetting("moodle_username");
  const password = getSetting("moodle_password");
  if (!username || !password) {
    throw new Error("Missing setting: moodle credentials. Please configure Moodle in Settings.");
  }
  const fresh = await moodleLogin(username, password);
  saveSetting("moodle_session", fresh.session);
  saveSetting("moodle_sesskey", fresh.sessKey);
  saveSetting("moodle_userid", String(fresh.userId));
  console.log(`[moodle] Fresh session stored for userId=${fresh.userId}`);
  return fresh;
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
      try {
        const { session, sessKey } = await ensureMoodleSession();
        const data = await moodleAjax(
          session, sessKey,
          "core_course_get_enrolled_courses_by_timeline_classification",
          { classification: "all", limit: 0, offset: 0, sort: "fullname" },
        );
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
    "Fetch Moodle assignments and deadlines",
    {},
    async () => {
      try {
        const { session, sessKey } = await ensureMoodleSession();
        const data = await moodleAjax(
          session, sessKey,
          "core_calendar_get_action_events_by_timesort",
          { timesortfrom: Math.floor(Date.now() / 1000) - 86400, limitnum: 50 },
        );
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
    "Fetch the content/sections of a specific Moodle course by scraping the course page",
    {
      course_id: z.number().describe("The Moodle course ID"),
    },
    async (args) => {
      try {
        const { session } = await ensureMoodleSession();
        const url = `https://www.moodle.tum.de/course/view.php?id=${args.course_id}`;
        const res = await fetch(url, {
          headers: { Cookie: `MoodleSession=${session}` },
          redirect: "follow",
        });
        if (!res.ok) return err(`Moodle returned HTTP ${res.status}`);
        const html = await res.text();
        const sections: Array<{ name: string; activities: Array<{ name: string; type: string; url: string }> }> = [];
        const sectionRe = /<li[^>]*id="section-(\d+)"[^>]*>([\s\S]*?)(?=<li[^>]*id="section-|<\/ul>\s*<\/div>\s*<\/div>)/gi;
        let sm;
        while ((sm = sectionRe.exec(html)) !== null) {
          const sectionHtml = sm[2];
          const nameMatch = sectionHtml.match(/aria-label="([^"]+)"/);
          const activities: Array<{ name: string; type: string; url: string }> = [];
          const actRe = /<a[^>]*href="(https:\/\/www\.moodle\.tum\.de\/mod\/([^/]+)\/view\.php\?id=\d+)"[^>]*>[\s\S]*?<span[^>]*class="instancename"[^>]*>([^<]+)/gi;
          let am;
          while ((am = actRe.exec(sectionHtml)) !== null) {
            activities.push({ name: am[3].trim(), type: am[2], url: am[1] });
          }
          if (activities.length > 0 || nameMatch) {
            sections.push({ name: nameMatch?.[1] ?? `Section ${sm[1]}`, activities });
          }
        }
        if (sections.length === 0) {
          const titleMatch = html.match(/<title>([^<]+)<\/title>/);
          return ok({ title: titleMatch?.[1] ?? "Unknown", note: "Could not parse sections — page structure may differ", htmlSnippet: html.slice(0, 3000) });
        }
        return ok(sections);
      } catch (e: unknown) {
        return err(`Failed to fetch Moodle course content: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  // =========================================================================
  // moodle_fetch
  // =========================================================================

  async function fetchPdfText(buf: Buffer): Promise<string | null> {
    const { extractText } = await import("unpdf");
    const { text, totalPages } = await extractText(new Uint8Array(buf));
    const joined = Array.isArray(text) ? text.join("\n") : String(text);
    console.log(`[moodle_fetch] PDF: ${totalPages} pages, ${joined.length} chars extracted`);
    return joined || null;
  }

  async function fetchMoodleResource(session: string, url: string): Promise<{ type: string; [k: string]: unknown }> {
    const res = await fetch(url, {
      headers: { Cookie: `MoodleSession=${session}` },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`Moodle returned HTTP ${res.status}`);
    const contentType = res.headers.get("content-type") ?? "";

    if (contentType.includes("application/pdf")) {
      const buf = Buffer.from(await res.arrayBuffer());
      const text = await fetchPdfText(buf);
      if (text) return { type: "pdf", text };
      return { type: "pdf_binary", size: buf.length, note: "PDF could not be text-extracted (likely scanned/image-based)." };
    }

    const html = await res.text();

    if (contentType.includes("text/html")) {
      // Moodle resource pages often wrap the actual file in a redirect link
      const redirectMatch = html.match(/class="resourceworkaround"[^>]*>.*?<a href="([^"]+)"/s)
        || html.match(/class="resourcemain"[^>]*>.*?<a href="([^"]+)"/s);
      if (redirectMatch) {
        const fileUrl = decodeHtmlEntities(redirectMatch[1]);
        console.log(`[moodle_fetch] Following resource redirect to: ${fileUrl}`);
        return fetchMoodleResource(session, fileUrl);
      }
      // Embedded object/iframe (e.g. inline PDF viewer)
      const embedMatch = html.match(/<object[^>]*data="([^"]+\.pdf[^"]*)"/i)
        || html.match(/<iframe[^>]*src="([^"]+\.pdf[^"]*)"/i)
        || html.match(/<embed[^>]*src="([^"]+\.pdf[^"]*)"/i);
      if (embedMatch) {
        const fileUrl = decodeHtmlEntities(embedMatch[1]);
        console.log(`[moodle_fetch] Following embedded PDF: ${fileUrl}`);
        return fetchMoodleResource(session, fileUrl);
      }

      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      const cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
      const bodyMatch = cleaned.match(/<div[^>]*id="region-main"[^>]*>([\s\S]*?)<\/div>\s*<\/section>/i);
      return { type: "html", title: titleMatch?.[1], content: bodyMatch?.[1]?.slice(0, 8000) ?? cleaned.slice(0, 8000) };
    }

    return { type: "text", contentType, text: html.slice(0, 8000) };
  }

  server.tool(
    "moodle_fetch",
    "Fetch any Moodle page or resource using the authenticated session. Returns extracted text for PDFs and cleaned HTML for pages. Use this to read exercise sheets, lecture notes, or any resource behind Moodle login.",
    {
      url: z.string().describe("Full Moodle URL to fetch, e.g. https://www.moodle.tum.de/mod/resource/view.php?id=123"),
    },
    async (args) => {
      try {
        const { session } = await ensureMoodleSession();
        const data = await fetchMoodleResource(session, args.url);
        return ok(data);
      } catch (e: unknown) {
        return err(`Failed to fetch Moodle resource: ${e instanceof Error ? e.message : String(e)}`);
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
            const $ = cheerio.load(html);
            $("head, script, style, nav, footer, header, noscript, svg, img").remove();
            const text = $("body").text().replace(/\s+/g, " ").trim();
            return { club: club.name, url: club.url, text: text.slice(0, 6000) };
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
