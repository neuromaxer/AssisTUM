import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { getDb } from "./db/client.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

getDb();
console.log("Database initialized");

app.listen(config.port, () => {
  console.log(`AssisTUM backend listening on port ${config.port}`);
});
