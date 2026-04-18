import { createOpencodeClient } from "@opencode-ai/sdk/client";
import { createOpencodeServer } from "@opencode-ai/sdk/server";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "../config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(__dirname, "../../..");

type OpencodeClientType = ReturnType<typeof createOpencodeClient>;

let clientInstance: OpencodeClientType | null = null;

export async function getOpenCodeClient(): Promise<OpencodeClientType> {
  if (clientInstance) return clientInstance;

  if (config.openCodeUrl) {
    clientInstance = createOpencodeClient({
      baseUrl: config.openCodeUrl,
      directory: projectDir,
    });
  } else {
    const server = await createOpencodeServer({ port: 4096, timeout: 15000 });
    clientInstance = createOpencodeClient({
      baseUrl: server.url,
      directory: projectDir,
    });
  }
  return clientInstance;
}

export { projectDir };
