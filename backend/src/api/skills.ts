import { Router, Request, Response } from "express";
import { readdir, readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getOpenCodeClient } from "../agent/opencode.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = resolve(__dirname, "../skills");

export const skillsRouter = Router();

interface Skill {
  name: string;
  description: string;
}

function parseFrontmatter(content: string): { name: string; description: string; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { name: "", description: "", body: content };

  const frontmatter = match[1];
  const body = match[2];

  let name = "";
  let description = "";
  for (const line of frontmatter.split("\n")) {
    const nameMatch = line.match(/^name:\s*(.+)$/);
    if (nameMatch) name = nameMatch[1].trim();
    const descMatch = line.match(/^description:\s*(.+)$/);
    if (descMatch) description = descMatch[1].trim();
  }

  return { name, description, body };
}

/* GET / — list available skills */
skillsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const files = await readdir(skillsDir);
    const skills: Skill[] = [];

    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const content = await readFile(resolve(skillsDir, file), "utf-8");
      const { name, description } = parseFrontmatter(content);
      if (name) skills.push({ name, description });
    }

    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* POST /:name/invoke — invoke a skill on a session */
skillsRouter.post("/:name/invoke", async (req: Request, res: Response) => {
  try {
    const skillName = req.params.name as string;
    const { sessionId, userMessage } = req.body as {
      sessionId: string;
      userMessage?: string;
    };

    if (!sessionId) {
      res.status(400).json({ error: "Missing required field: sessionId" });
      return;
    }

    const files = await readdir(skillsDir);
    let skillContent: string | null = null;

    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const content = await readFile(resolve(skillsDir, file), "utf-8");
      const { name } = parseFrontmatter(content);
      if (name === skillName) {
        skillContent = content;
        break;
      }
    }

    if (!skillContent) {
      res.status(404).json({ error: `Skill "${skillName}" not found` });
      return;
    }

    const prompt = `[Skill: ${skillName}]\n\n${skillContent}\n\n${userMessage || "Please execute this skill."}`;

    const client = await getOpenCodeClient();
    const result = await client.session.promptAsync({
      path: { id: sessionId },
      body: { parts: [{ type: "text", text: prompt }] },
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
