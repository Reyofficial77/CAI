import fs from "node:fs/promises";
import path from "node:path";

export interface ProjectMemory {
  notes: string[];
  updatedAt?: string;
}

async function readIfExists(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, "utf-8");
  } catch {
    return null;
  }
}

/** Reads .cai/rules.md from the project root, if present. */
export async function loadProjectRules(projectRoot: string): Promise<string | null> {
  const rulesPath = path.join(projectRoot, ".cai", "rules.md");
  const content = await readIfExists(rulesPath);
  return content?.trim() || null;
}

/** Reads .cai/memory.json (lightweight project memory) from the project root, if present. */
export async function loadProjectMemory(projectRoot: string): Promise<ProjectMemory | null> {
  const memPath = path.join(projectRoot, ".cai", "memory.json");
  const content = await readIfExists(memPath);
  if (!content) return null;
  try {
    return JSON.parse(content) as ProjectMemory;
  } catch {
    return null;
  }
}

/** Appends a note to .cai/memory.json, creating it if needed. Never stores secrets. */
export async function appendProjectMemory(projectRoot: string, note: string): Promise<void> {
  const dir = path.join(projectRoot, ".cai");
  const memPath = path.join(dir, "memory.json");
  await fs.mkdir(dir, { recursive: true });

  const existing = (await loadProjectMemory(projectRoot)) ?? { notes: [] };
  existing.notes.push(note);
  existing.updatedAt = new Date().toISOString();

  // Keep memory lightweight — cap at 100 notes.
  if (existing.notes.length > 100) {
    existing.notes = existing.notes.slice(-100);
  }

  await fs.writeFile(memPath, JSON.stringify(existing, null, 2), "utf-8");
}
