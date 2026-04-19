import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { getSetting } from "./settings.js";

export const emailsRouter = Router();

export type EmailDigest = {
  configured: boolean;
  count: number;
  summary: string | null;
  error?: string;
};

/* GET /recent — fetch TUM emails from the last 48h and return an AI digest */
emailsRouter.get("/recent", async (_req, res) => {
  const user = getSetting("tum_email_user");
  const pass = getSetting("tum_email_password");

  if (!user || !pass) {
    res.json({ configured: false, count: 0, summary: null });
    return;
  }

  try {
    const { ImapFlow } = await import("imapflow");
    const client = new ImapFlow({
      host: "mail.tum.de",
      port: 993,
      secure: true,
      auth: { user, pass },
      logger: false,
    });

    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    const emails: { subject: string; sender: string; date: string; snippet: string }[] = [];

    try {
      const since = new Date();
      since.setHours(since.getHours() - 48);

      for await (const msg of client.fetch(
        { since },
        { envelope: true, source: { start: 0, maxLength: 1024 } },
      )) {
        const envelope = msg.envelope;
        const senderAddr = envelope?.from?.[0];
        const sender = senderAddr?.name ?? senderAddr?.address ?? "unknown";

        let snippet = "";
        if (msg.source) {
          const raw = msg.source.toString("utf-8");
          const bodyStart = raw.indexOf("\r\n\r\n");
          if (bodyStart !== -1) {
            snippet = raw
              .slice(bodyStart + 4, bodyStart + 300)
              .replace(/[^\x20-\x7E\n]/g, " ")
              .replace(/\s+/g, " ")
              .trim();
          }
        }

        emails.push({
          subject: envelope?.subject ?? "(no subject)",
          sender,
          date: envelope?.date?.toISOString?.() ?? "",
          snippet,
        });
      }
    } finally {
      lock.release();
    }

    await client.logout();
    emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (emails.length === 0) {
      res.json({ configured: true, count: 0, summary: "No emails in the last 48 hours." });
      return;
    }

    const emailBlock = emails
      .map(
        (e, i) =>
          `[${i + 1}] From: ${e.sender}\nSubject: ${e.subject}\n${e.snippet}`,
      )
      .join("\n\n---\n\n");

    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are summarizing a student's TUM inbox. Below are ${emails.length} emails from the last 48 hours. Write a concise 2-4 sentence digest covering what's important — deadlines, announcements, replies needed, etc. Be specific, not generic. Do not list every email; focus on what actually matters. Do not use markdown formatting — plain text only.

${emailBlock}`,
        },
      ],
    });

    const summary =
      message.content[0].type === "text" ? message.content[0].text : null;

    res.json({ configured: true, count: emails.length, summary });
  } catch (err: unknown) {
    res.status(500).json({
      configured: true,
      count: 0,
      summary: null,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
