import dotenv from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../..");

dotenv.config({ path: resolve(projectRoot, ".env") });

const defaultDbPath = resolve(projectRoot, "assistum.db");

export const config = {
  port: parseInt(process.env.PORT || "3001"),
  openCodeUrl: process.env.OPENCODE_URL || "",
  dbPath: process.env.DB_PATH || defaultDbPath,
};
