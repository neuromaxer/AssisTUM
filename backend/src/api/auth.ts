import { Router } from "express";
import { getDb } from "../db/client.js";
import { moodleLogin } from "../moodle-session.js";

export const authRouter = Router();

function saveSetting(key: string, value: string) {
  const db = getDb();
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}

/* POST /tum-online — request a TUM Online API token */
authRouter.post("/tum-online", async (req, res) => {
  const { tum_id } = req.body;
  if (!tum_id) {
    res.status(400).json({ error: "Missing tum_id" });
    return;
  }
  try {
    const url = `https://campus.tum.de/tumonline/wbservicesbasic.requestToken?pUsername=${encodeURIComponent(tum_id)}&pTokenName=AssisTUM`;
    const resp = await fetch(url);
    const text = await resp.text();
    if (text.includes("<error>")) {
      const match = text.match(/<message>(.*?)<\/message>/);
      res.status(400).json({ error: match?.[1] || "TUM Online error", raw: text });
      return;
    }
    const tokenMatch = text.match(/<token>(.*?)<\/token>/);
    if (!tokenMatch) {
      res.status(500).json({ error: "Could not parse token from response", raw: text });
      return;
    }
    const token = tokenMatch[1];
    saveSetting("tum_online_token", token);
    saveSetting("tum_id", tum_id);
    res.json({ status: "token_requested", message: "Check your TUM email to confirm the token" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* POST /tum-online/confirm — poll token confirmation */
authRouter.post("/tum-online/confirm", async (_req, res) => {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("tum_online_token") as { value: string } | undefined;
  if (!row) {
    res.status(400).json({ error: "No token to confirm. Request one first." });
    return;
  }
  try {
    const url = `https://campus.tum.de/tumonline/wbservicesbasic.isTokenConfirmed?pToken=${encodeURIComponent(row.value)}`;
    const resp = await fetch(url);
    const text = await resp.text();
    const confirmed = text.toLowerCase().includes("true");
    if (confirmed) {
      saveSetting("tum_online_confirmed", "true");
    }
    res.json({ confirmed });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* POST /moodle — authenticate via Shibboleth SAML and store Moodle session */
authRouter.post("/moodle", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Missing username or password" });
    return;
  }
  try {
    const { session, sessKey, userId } = await moodleLogin(username, password);
    saveSetting("moodle_session", session);
    saveSetting("moodle_sesskey", sessKey);
    saveSetting("moodle_userid", String(userId));
    saveSetting("moodle_username", username);
    saveSetting("moodle_password", password);
    res.json({ status: "connected" });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

/* POST /email — verify TUM email IMAP credentials */
authRouter.post("/email", async (req, res) => {
  const { user, password } = req.body;
  if (!user || !password) {
    res.status(400).json({ error: "Missing user or password" });
    return;
  }
  try {
    const { ImapFlow } = await import("imapflow");
    const client = new ImapFlow({
      host: "mail.tum.de",
      port: 993,
      secure: true,
      auth: { user, pass: password },
      logger: false,
    });
    await client.connect();
    await client.logout();
    saveSetting("tum_email_user", user);
    saveSetting("tum_email_password", password);
    res.json({ status: "connected" });
  } catch (err: any) {
    res.status(401).json({ error: `IMAP login failed: ${err.message}` });
  }
});

/* POST /ical — verify and save iCal URL */
authRouter.post("/ical", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: "Missing url" });
    return;
  }
  try {
    const resp = await fetch(url);
    const text = await resp.text();
    if (!text.includes("BEGIN:VCALENDAR")) {
      res.status(400).json({ error: "URL does not return valid iCal data" });
      return;
    }
    saveSetting("tum_ical_url", url);
    res.json({ status: "connected" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* POST /connect-all — connect all services with shared credentials */
authRouter.post("/connect-all", async (req, res) => {
  const { tum_id, password, ical_url } = req.body;
  if (!tum_id || !password) {
    res.status(400).json({ error: "TUM ID and password are required" });
    return;
  }

  const results: Record<string, { ok: boolean; message: string }> = {};

  // TUM Online API token
  try {
    const url = `https://campus.tum.de/tumonline/wbservicesbasic.requestToken?pUsername=${encodeURIComponent(tum_id)}&pTokenName=AssisTUM`;
    const resp = await fetch(url);
    const text = await resp.text();
    if (text.includes("<error>")) {
      const match = text.match(/<message>(.*?)<\/message>/);
      results.tum_online = { ok: false, message: match?.[1] || "TUM Online error" };
    } else {
      const tokenMatch = text.match(/<token>(.*?)<\/token>/);
      if (tokenMatch) {
        saveSetting("tum_online_token", tokenMatch[1]);
        saveSetting("tum_id", tum_id);
        results.tum_online = { ok: true, message: "Token requested — check your TUM email to confirm" };
      } else {
        results.tum_online = { ok: false, message: "Could not parse token" };
      }
    }
  } catch (err: any) {
    results.tum_online = { ok: false, message: err.message };
  }

  // Moodle
  try {
    const { session, sessKey, userId } = await moodleLogin(tum_id, password);
    saveSetting("moodle_session", session);
    saveSetting("moodle_sesskey", sessKey);
    saveSetting("moodle_userid", String(userId));
    saveSetting("moodle_username", tum_id);
    saveSetting("moodle_password", password);
    results.moodle = { ok: true, message: "Connected" };
  } catch (err: any) {
    results.moodle = { ok: false, message: err.message };
  }

  // Email (IMAP)
  try {
    const { ImapFlow } = await import("imapflow");
    const client = new ImapFlow({
      host: "mail.tum.de",
      port: 993,
      secure: true,
      auth: { user: tum_id, pass: password },
      logger: false,
    });
    await client.connect();
    await client.logout();
    saveSetting("tum_email_user", tum_id);
    saveSetting("tum_email_password", password);
    results.email = { ok: true, message: "Connected" };
  } catch (err: any) {
    results.email = { ok: false, message: err.message };
  }

  // iCal (optional)
  if (ical_url) {
    try {
      const resp = await fetch(ical_url);
      const text = await resp.text();
      if (!text.includes("BEGIN:VCALENDAR")) {
        results.calendar = { ok: false, message: "URL does not return valid iCal data" };
      } else {
        saveSetting("tum_ical_url", ical_url);
        results.calendar = { ok: true, message: "Connected" };
      }
    } catch (err: any) {
      results.calendar = { ok: false, message: err.message };
    }
  }

  res.json({ results });
});

/* GET /status — connection status for all services */
authRouter.get("/status", (_req, res) => {
  const db = getDb();
  function has(key: string): boolean {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
    return !!row?.value;
  }
  const hasToken = has("tum_online_token");
  const confirmed = has("tum_online_confirmed");
  res.json({
    tum_online: hasToken ? (confirmed ? "connected" : "pending") : "disconnected",
    tum_calendar: has("tum_ical_url"),
    moodle: has("moodle_session"),
    email: has("tum_email_user") && has("tum_email_password"),
  });
});
