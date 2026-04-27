import express from "express";
import cors from "cors";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { getDb } from "./db/client.js";
import { eventsRouter } from "./api/events.js";
import { todosRouter } from "./api/todos.js";
import { coursesRouter } from "./api/courses.js";
import { getSetting, settingsRouter } from "./api/settings.js";
import { clubsRouter } from "./api/clubs.js";
import { sseHandler } from "./api/sse.js";
import { agentRouter } from "./api/agent.js";
import { authRouter } from "./api/auth.js";
import { skillsRouter } from "./api/skills.js";
import { emailsRouter } from "./api/emails.js";
import { mensaRouter } from "./api/mensa.js";
import { gradesRouter } from "./api/grades.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/stream", sseHandler);
app.use("/api/events", eventsRouter);
app.use("/api/todos", todosRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/clubs", clubsRouter);
app.use("/api/agent", agentRouter);
app.use("/api/auth", authRouter);
app.use("/api/skills", skillsRouter);
app.use("/api/emails", emailsRouter);
app.use("/api/mensa", mensaRouter);
app.use("/api/grades", gradesRouter);

const __frontendDist = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../frontend/dist"
);

if (existsSync(__frontendDist)) {
  app.use(express.static(__frontendDist));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(resolve(__frontendDist, "index.html"));
  });
}

getDb();
console.log("Database initialized");

app.listen(config.port, () => {
  console.log(`AssisTUM backend listening on port ${config.port}`);
  injectApiKey();
});

async function injectApiKey() {
  const key = getSetting("anthropic_api_key");
  if (!key) {
    console.warn("[startup] no anthropic_api_key in settings — agent will not work until one is set");
    return;
  }
  const ocUrl = config.openCodeUrl || "http://127.0.0.1:4096";
  const maxRetries = 15;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${ocUrl}/auth/anthropic`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "api", key }),
      });
      if (res.ok) {
        console.log("[startup] injected Anthropic API key into OpenCode");
        return;
      }
      console.warn(`[startup] OpenCode auth injection returned ${res.status}, retrying...`);
    } catch {
      if (i === 0) console.log("[startup] waiting for OpenCode to be ready...");
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.error("[startup] failed to inject API key after retries — agent will not work");
}
