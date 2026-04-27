import { Router } from "express";
import { getDb } from "../db/client.js";
import { config } from "../config.js";

export const settingsRouter = Router();

/** Helper: get a setting value by key (for use by other modules) */
export function getSetting(key: string): string | undefined {
  const db = getDb();
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}

async function injectApiKeyIntoOpenCode(key: string) {
  const ocUrl = config.openCodeUrl || "http://127.0.0.1:4096";
  try {
    const res = await fetch(`${ocUrl}/auth/anthropic`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "api", key }),
    });
    if (res.ok) {
      console.log("[settings] injected Anthropic API key into OpenCode");
    } else {
      console.error(`[settings] OpenCode auth injection returned ${res.status}`);
    }
  } catch (err) {
    console.error("[settings] failed to inject API key into OpenCode:", (err as Error).message);
  }
}

/* GET / — list all settings, masking sensitive values */
settingsRouter.get("/", (_req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM settings ORDER BY key ASC`).all() as {
    key: string;
    value: string;
  }[];

  const masked = rows.map((row) => {
    const lower = row.key.toLowerCase();
    if (lower.includes("password") || lower.includes("token") || lower.includes("api_key")) {
      return { key: row.key, value: "***" };
    }
    return row;
  });

  res.json(masked);
});

/* PUT /:key — upsert a setting */
settingsRouter.put("/:key", async (req, res) => {
  const { value } = req.body;
  if (value === undefined || value === null) {
    res.status(400).json({ error: "Missing required field: value" });
    return;
  }

  const db = getDb();
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(req.params.key, String(value));

  if (req.params.key === "anthropic_api_key") {
    await injectApiKeyIntoOpenCode(String(value));
  }

  res.json({ key: req.params.key, value: String(value) });
});

/* DELETE /:key — delete a setting */
settingsRouter.delete("/:key", (req, res) => {
  const db = getDb();
  const existing = db.prepare(`SELECT * FROM settings WHERE key = ?`).get(req.params.key);
  if (!existing) {
    res.status(404).json({ error: "Setting not found" });
    return;
  }

  db.prepare(`DELETE FROM settings WHERE key = ?`).run(req.params.key);
  res.json({ deleted: true, key: req.params.key });
});
