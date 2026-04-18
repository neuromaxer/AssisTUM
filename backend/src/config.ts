import dotenv from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: "../.env" });

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultDbPath = resolve(__dirname, "../../assistum.db");

export const config = {
  port: parseInt(process.env.PORT || "3001"),
  openCodeUrl: process.env.OPENCODE_URL || "",
  dbPath: process.env.DB_PATH || defaultDbPath,
};
