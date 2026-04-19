import { Router } from "express";
import { getOpenCodeClient } from "../agent/opencode.js";

export const mensaRouter = Router();

type Canteen = {
  enum_name: string;
  name: string;
  canteen_id: string;
  location: { address: string; latitude: number; longitude: number };
};

type Dish = {
  name: string;
  dish_type: string;
  labels: string[];
  prices: {
    students?: { base_price: number; price_per_unit: number; unit: string };
    staff?: { base_price: number; price_per_unit: number; unit: string };
    guests?: { base_price: number; price_per_unit: number; unit: string };
  };
};

type Day = { date: string; dishes: Dish[] };
type Week = { number: number; year: number; days: Day[] };

let canteensCache: { at: number; data: Canteen[] } | null = null;

mensaRouter.get("/locations", async (_req, res) => {
  try {
    if (canteensCache && Date.now() - canteensCache.at < 24 * 60 * 60 * 1000) {
      res.json(canteensCache.data);
      return;
    }
    const r = await fetch("https://tum-dev.github.io/eat-api/enums/canteens.json");
    const data = (await r.json()) as Canteen[];
    canteensCache = { at: Date.now(), data };
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

async function fetchWeek(location: string, year: number, week: number): Promise<Week | null> {
  const weekStr = String(week).padStart(2, "0");
  const r = await fetch(
    `https://tum-dev.github.io/eat-api/${encodeURIComponent(location)}/${year}/${weekStr}.json`,
  );
  if (!r.ok) return null;
  return (await r.json()) as Week;
}

const emojiCache = new Map<string, string>();

mensaRouter.post("/annotate", async (req, res) => {
  const body = req.body as { dishes?: { name: string; labels?: string[] }[]; preference?: string };
  const dishes = Array.isArray(body?.dishes) ? body.dishes : [];
  const preference = typeof body?.preference === "string" ? body.preference.trim() : "";

  if (dishes.length === 0) {
    res.json({ annotations: [] });
    return;
  }

  const missingEmojis = dishes.filter((d) => !emojiCache.has(d.name));
  const needsHighlights = preference.length > 0;

  try {
    if (missingEmojis.length > 0 || needsHighlights) {
      const client = await getOpenCodeClient();
      const session = await client.session.create();
      if (session.error || !session.data?.id) throw new Error("Failed to create OpenCode session");

      const dishBlock = dishes
        .map((d, i) => `${i + 1}. ${d.name}${d.labels?.length ? ` [labels: ${d.labels.join(", ")}]` : ""}`)
        .join("\n");
      const prompt = `You are annotating dishes from a TUM canteen menu.

For EACH dish below, return:
- "emoji": a single emoji that visually represents the dish (e.g. pasta → 🍝, soup → 🍲, ravioli → 🥟, pizza → 🍕, salad → 🥗, rice bowl → 🍚, chicken → 🍗, beef/steak → 🥩, fish → 🐟, burger → 🍔, dessert → 🍰, fries → 🍟). Pick the single most representative emoji based on the dish NAME, not just the dietary labels.
- "highlight": ${needsHighlights ? `boolean — true if the dish matches this user preference: "${preference}". Use the name AND labels to decide. Be reasonably inclusive but honest.` : "always false"}.

Dishes:
${dishBlock}

Return ONLY JSON of the form:
{"annotations":[{"name":"...","emoji":"...","highlight":false}, ...]}
Order must match the input order. No prose, no markdown.`;

      const result = await client.session.prompt({
        path: { id: session.data.id },
        body: { parts: [{ type: "text", text: prompt }] },
      });

      let text = "";
      if (!result.error && result.data) {
        const parts = (result.data as { parts?: { type: string; text?: string }[] }).parts;
        if (parts) {
          text = parts.filter((p) => p.type === "text" && p.text).map((p) => p.text).join("\n");
        }
      }
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          annotations: { name: string; emoji: string; highlight: boolean }[];
        };
        for (const a of parsed.annotations) {
          if (a.emoji) emojiCache.set(a.name, a.emoji);
        }
        res.json({ annotations: parsed.annotations });
        return;
      }
    }
  } catch (err) {
    // fall through to cached-only response
    console.error("mensa annotate error", err);
  }

  res.json({
    annotations: dishes.map((d) => ({
      name: d.name,
      emoji: emojiCache.get(d.name) ?? "🍴",
      highlight: false,
    })),
  });
});

mensaRouter.get("/menu", async (req, res) => {
  const location = typeof req.query.location === "string" ? req.query.location : "mensa-garching";
  const date = new Date();
  const todayStr = date.toISOString().slice(0, 10);
  const { year, week } = isoWeek(date);
  try {
    const thisWeek = await fetchWeek(location, year, week);
    let pick: Day | null = null;
    if (thisWeek) {
      pick = thisWeek.days.find((d) => d.date >= todayStr) ?? null;
    }
    if (!pick) {
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 7);
      const { year: ny, week: nw } = isoWeek(nextDate);
      const nextWeek = await fetchWeek(location, ny, nw);
      if (nextWeek) {
        pick = nextWeek.days.find((d) => d.date >= todayStr) ?? nextWeek.days[0] ?? null;
      }
    }
    if (!pick) {
      res.json({ location, date: todayStr, isToday: false, dishes: [], error: "No menu available" });
      return;
    }
    res.json({
      location,
      date: pick.date,
      isToday: pick.date === todayStr,
      dishes: pick.dishes,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
