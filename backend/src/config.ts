import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

export const config = {
  port: parseInt(process.env.PORT || "3001"),
  openCodeUrl: process.env.OPENCODE_URL || "",
  dbPath: process.env.DB_PATH || "./assistum.db",
};
