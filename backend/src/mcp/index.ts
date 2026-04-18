import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerActionTools } from "./tools/actions.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "assistum-tools",
    version: "1.0.0",
  });
  registerActionTools(server);
  return server;
}
