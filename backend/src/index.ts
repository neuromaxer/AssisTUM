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
import { settingsRouter } from "./api/settings.js";
import { clubsRouter } from "./api/clubs.js";
import { sseHandler } from "./api/sse.js";
import { agentRouter } from "./api/agent.js";
import { authRouter } from "./api/auth.js";
import { skillsRouter } from "./api/skills.js";

const app = express();
app.use(cors());
app.use(express.json());

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
});
