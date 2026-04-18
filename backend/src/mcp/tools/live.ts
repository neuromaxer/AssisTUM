import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../../db/client.js";
import { config } from "../../config.js";
import nodemailer from "nodemailer";

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

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerLiveTools(server: McpServer) {
  // =========================================================================
  // mvv_departures
  // =========================================================================
  server.tool(
    "mvv_departures",
    "Fetch real-time MVV public transport departures for a given station",
    {
      station: z.string().describe("Station name, e.g. 'Garching-Forschungszentrum'"),
    },
    async (args) => {
      try {
        const params = new URLSearchParams({
          outputFormat: "JSON",
          language: "en",
          stateless: "1",
          coordOutputFormat: "WGS84",
          type_dm: "stop",
          name_dm: args.station,
          useRealtime: "1",
          itOptionsActive: "1",
          ptOptionsActive: "1",
          limit: "10",
          mergeDep: "1",
          useAllStops: "1",
          mode: "direct",
        });

        const url = `https://efa.mvv-muenchen.de/ng/XML_DM_REQUEST?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) {
          return err(`MVV API returned HTTP ${res.status}`);
        }
        const data = await res.json();
        return ok(data);
      } catch (e: unknown) {
        return err(`Failed to fetch departures: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  // =========================================================================
  // study_rooms
  // =========================================================================
  server.tool(
    "study_rooms",
    "Fetch current study room availability from the ASTA API",
    {},
    async () => {
      try {
        const res = await fetch("https://iris.asta.tum.de/api");
        if (!res.ok) {
          return err(`ASTA API returned HTTP ${res.status}`);
        }
        const data = await res.json();
        return ok(data);
      } catch (e: unknown) {
        return err(`Failed to fetch study rooms: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  // =========================================================================
  // navigatum_search
  // =========================================================================
  server.tool(
    "navigatum_search",
    "Search for TUM rooms, buildings, and locations via NavigaTUM",
    {
      query: z.string().describe("Search query for rooms/buildings"),
    },
    async (args) => {
      try {
        const url = `https://nav.tum.de/api/search?q=${encodeURIComponent(args.query)}`;
        const res = await fetch(url);
        if (!res.ok) {
          return err(`NavigaTUM API returned HTTP ${res.status}`);
        }
        const data = await res.json();
        return ok(data);
      } catch (e: unknown) {
        return err(`Failed to search NavigaTUM: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  // =========================================================================
  // tum_email_send
  // =========================================================================
  server.tool(
    "tum_email_send",
    "Send an email via the user's TUM email account",
    {
      to: z.string().describe("Recipient email address"),
      subject: z.string().describe("Email subject line"),
      body: z.string().describe("Email body text"),
      in_reply_to: z.string().optional().describe("Message-ID of the email being replied to"),
    },
    async (args) => {
      const user = getSetting("tum_email_user");
      const pass = getSetting("tum_email_password");
      if (!user || !pass) {
        return err("Missing settings: tum_email_user and/or tum_email_password. Please configure them in Settings.");
      }

      try {
        const transporter = nodemailer.createTransport({
          host: "mail.tum.de",
          port: 587,
          secure: false,
          auth: { user, pass },
        });

        const mailOptions: nodemailer.SendMailOptions = {
          from: user,
          to: args.to,
          subject: args.subject,
          text: args.body,
        };

        if (args.in_reply_to) {
          mailOptions.inReplyTo = args.in_reply_to;
          mailOptions.references = args.in_reply_to;
        }

        const info = await transporter.sendMail(mailOptions);
        return ok({ messageId: info.messageId, accepted: info.accepted });
      } catch (e: unknown) {
        return err(`Failed to send email: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  // =========================================================================
  // canteen_occupancy
  // =========================================================================
  server.tool(
    "canteen_occupancy",
    "Fetch the current head count / occupancy for a TUM canteen",
    {
      canteen_id: z.string().describe("Canteen identifier, e.g. 'mensa-garching'"),
    },
    async (args) => {
      try {
        const url = `https://api.tum.app/v1/canteen/headCount/${encodeURIComponent(args.canteen_id)}`;
        const res = await fetch(url);
        if (!res.ok) {
          return err(`Canteen occupancy API returned HTTP ${res.status}`);
        }
        const data = await res.json();
        return ok(data);
      } catch (e: unknown) {
        return err(`Failed to fetch canteen occupancy: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  // =========================================================================
  // memory_store
  // =========================================================================
  server.tool(
    "memory_store",
    "Store a fact in the student's long-term memory. Use this to remember user preferences, plans, struggles, and important conversation context across sessions.",
    {
      text: z.string().describe("The fact to remember, as a clear standalone statement"),
      type: z.enum(["preference", "context"]).describe("'preference' for stable traits/likes/dislikes, 'context' for conversation facts/plans/struggles"),
      topic: z.string().optional().describe("Optional grouping tag: a course name, 'scheduling', 'food', 'study', etc."),
    },
    async (args) => {
      const baseUrl = config.cogneeUrl;
      const apiKey = config.cogneeApiKey;
      if (!baseUrl || !apiKey) {
        return err("Cognee not configured. Please set COGNEE_URL and COGNEE_API_KEY in .env.");
      }

      try {
        const taggedText = `[${args.type}]${args.topic ? `[${args.topic}]` : ""} ${args.text}`;
        const form = new FormData();
        form.append("data", new Blob([taggedText], { type: "text/plain" }), "data.txt");
        form.append("datasetName", "assistum-memory");

        const res = await fetch(`${baseUrl}/api/v1/remember`, {
          method: "POST",
          headers: { "X-Api-Key": apiKey },
          body: form,
        });

        if (!res.ok) {
          const body = await res.text();
          return err(`Cognee API returned HTTP ${res.status}: ${body}`);
        }

        const data = await res.json();
        return ok({ stored: true, text: args.text, type: args.type, topic: args.topic ?? null, status: data.status });
      } catch (e: unknown) {
        return err(`Failed to store memory: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  // =========================================================================
  // memory_recall
  // =========================================================================
  server.tool(
    "memory_recall",
    "Recall relevant facts from the student's long-term memory. Use this before making personalized recommendations, when the student references past conversations, or when planning.",
    {
      query: z.string().describe("Natural language query describing what to recall"),
      type: z.enum(["preference", "context"]).optional().describe("Filter to only preferences or only context"),
      topic: z.string().optional().describe("Filter to a specific topic"),
    },
    async (args) => {
      const baseUrl = config.cogneeUrl;
      const apiKey = config.cogneeApiKey;
      if (!baseUrl || !apiKey) {
        return err("Cognee not configured. Please set COGNEE_URL and COGNEE_API_KEY in .env.");
      }

      try {
        const filters: string[] = [];
        if (args.type) filters.push(`[${args.type}]`);
        if (args.topic) filters.push(`[${args.topic}]`);
        const enrichedQuery = filters.length > 0
          ? `${filters.join("")} ${args.query}`
          : args.query;

        const res = await fetch(`${baseUrl}/api/v1/recall`, {
          method: "POST",
          headers: {
            "X-Api-Key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: enrichedQuery,
            datasets: ["assistum-memory"],
            searchType: "GRAPH_COMPLETION",
            topK: 10,
            onlyContext: true,
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          return err(`Cognee API returned HTTP ${res.status}: ${body}`);
        }

        const results = await res.json();
        return ok({ query: args.query, memories: results });
      } catch (e: unknown) {
        return err(`Failed to recall memories: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );
}
