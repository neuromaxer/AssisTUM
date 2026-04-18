import { createOpencodeClient } from "@opencode-ai/sdk/client";
import { createOpencodeServer } from "@opencode-ai/sdk/server";
import { config } from "../config.js";

type OpencodeClientType = ReturnType<typeof createOpencodeClient>;

let clientInstance: OpencodeClientType | null = null;

export async function getOpenCodeClient(): Promise<OpencodeClientType> {
  if (clientInstance) return clientInstance;

  if (config.openCodeUrl) {
    clientInstance = createOpencodeClient({ baseUrl: config.openCodeUrl });
  } else {
    const server = await createOpencodeServer({ port: 4096, timeout: 15000 });
    clientInstance = createOpencodeClient({ baseUrl: server.url });
  }
  return clientInstance;
}
