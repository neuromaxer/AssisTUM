import { Router, Request, Response } from "express";
import { getOpenCodeClient } from "../agent/opencode.js";
import { readFile } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = resolve(__dirname, "../skills");

let cachedMemoryGuidelines: string | null = null;
async function getMemoryGuidelines(): Promise<string> {
  if (cachedMemoryGuidelines !== null) return cachedMemoryGuidelines;
  try {
    cachedMemoryGuidelines = await readFile(resolve(skillsDir, "memory-guidelines.md"), "utf-8");
  } catch {
    cachedMemoryGuidelines = "";
  }
  return cachedMemoryGuidelines;
}

export const agentRouter = Router();

/* POST /session — create a new OpenCode session */
agentRouter.post("/session", async (_req: Request, res: Response) => {
  try {
    const client = await getOpenCodeClient();
    const result = await client.session.create();
    if (result.error) {
      res.status(500).json({ error: JSON.stringify(result.error) });
      return;
    }
    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* GET /session — list all sessions */
agentRouter.get("/session", async (_req: Request, res: Response) => {
  try {
    const client = await getOpenCodeClient();
    const result = await client.session.list();
    if (result.error) {
      res.status(500).json({ error: JSON.stringify(result.error) });
      return;
    }
    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* POST /session/:id/message — send a message (sync, waits for response) */
agentRouter.post("/session/:id/message", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { message } = req.body as { message: string };
    if (!message) {
      res.status(400).json({ error: "Missing required field: message" });
      return;
    }

    const memoryGuidelines = await getMemoryGuidelines();
    const client = await getOpenCodeClient();
    const result = await client.session.prompt({
      path: { id },
      body: {
        parts: [{ type: "text", text: `${memoryGuidelines}\n\n${message}` }],
      },
    });
    if (result.error) {
      res.status(500).json({ error: JSON.stringify(result.error) });
      return;
    }
    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* POST /session/:id/message/async — send a message (fire-and-forget) */
agentRouter.post("/session/:id/message/async", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { message } = req.body as { message: string };
    if (!message) {
      res.status(400).json({ error: "Missing required field: message" });
      return;
    }

    const memoryGuidelines = await getMemoryGuidelines();
    const client = await getOpenCodeClient();
    const result = await client.session.promptAsync({
      path: { id },
      body: {
        parts: [{ type: "text", text: `${memoryGuidelines}\n\n${message}` }],
      },
    });
    if (result.error) {
      res.status(500).json({ error: JSON.stringify(result.error) });
      return;
    }
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* GET /session/:id/messages — list messages for a session */
agentRouter.get("/session/:id/messages", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const client = await getOpenCodeClient();
    const result = await client.session.messages({
      path: { id },
    });
    if (result.error) {
      res.status(500).json({ error: JSON.stringify(result.error) });
      return;
    }
    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* GET /session/:id/status — get session status */
agentRouter.get("/session/:id/status", async (_req: Request, res: Response) => {
  try {
    const client = await getOpenCodeClient();
    const result = await client.session.status();
    if (result.error) {
      res.status(500).json({ error: JSON.stringify(result.error) });
      return;
    }
    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* GET /events — SSE proxy for OpenCode global event stream */
agentRouter.get("/events", async (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  let closed = false;
  req.on("close", () => {
    closed = true;
  });

  try {
    const client = await getOpenCodeClient();
    const sse = await client.global.event();

    for await (const event of sse.stream) {
      if (closed) break;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  } catch (err) {
    if (!closed) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: (err as Error).message })}\n\n`);
    }
  } finally {
    if (!closed) {
      res.end();
    }
  }
});

/* POST /session/:id/abort — abort a running session */
agentRouter.post("/session/:id/abort", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const client = await getOpenCodeClient();
    const result = await client.session.abort({ path: { id } });
    if (result.error) {
      res.status(500).json({ error: JSON.stringify(result.error) });
      return;
    }
    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* DELETE /session/:id — delete a session */
agentRouter.delete("/session/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const client = await getOpenCodeClient();
    const result = await client.session.delete({ path: { id } });
    if (result.error) {
      res.status(500).json({ error: JSON.stringify(result.error) });
      return;
    }
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
