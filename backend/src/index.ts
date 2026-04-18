import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { getDb } from "./db/client.js";
import { eventsRouter } from "./api/events.js";
import { todosRouter } from "./api/todos.js";
import { coursesRouter } from "./api/courses.js";
import { settingsRouter } from "./api/settings.js";
import { clubsRouter } from "./api/clubs.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/events", eventsRouter);
app.use("/api/todos", todosRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/clubs", clubsRouter);

getDb();
console.log("Database initialized");

app.listen(config.port, () => {
  console.log(`AssisTUM backend listening on port ${config.port}`);
});
