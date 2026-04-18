import { Request, Response } from "express";

type SseClient = {
  id: string;
  res: Response;
};

const clients: SseClient[] = [];
let clientIdCounter = 0;

export function sseHandler(req: Request, res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const clientId = String(++clientIdCounter);
  clients.push({ id: clientId, res });

  req.on("close", () => {
    const idx = clients.findIndex((c) => c.id === clientId);
    if (idx !== -1) clients.splice(idx, 1);
  });
}

export function broadcast(eventType: string, data: unknown) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.res.write(payload);
  }
}
