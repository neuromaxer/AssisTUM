import express from "express";
import cors from "cors";
import { config } from "./config.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(config.port, () => {
  console.log(`AssisTUM backend listening on port ${config.port}`);
});
