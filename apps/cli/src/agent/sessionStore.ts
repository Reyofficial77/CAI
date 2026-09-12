import fs from "node:fs/promises";
import path from "node:path";
import type { Content } from "@google/genai";

export interface SavedSession {
  id: string;
  title: string;
  projectRoot: string;
  createdAt: string;
  updatedAt: string;
  history: Content[];
}

function sessionsDir(projectRoot: string) { return path.join(projectRoot, ".cai", "sessions"); }
function safeId() { return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

export async function listSessions(projectRoot: string): Promise<SavedSession[]> {
  const dir = sessionsDir(projectRoot);
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const sessions: SavedSession[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const raw = await fs.readFile(path.join(dir, entry.name, "session.json"), "utf8");
      const session = JSON.parse(raw) as SavedSession;
      if (session.id && Array.isArray(session.history)) sessions.push(session);
    } catch {}
  }
  return sessions.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export async function createSession(projectRoot: string, title = "New session"): Promise<SavedSession> {
  const now = new Date().toISOString();
  const session: SavedSession = { id: safeId(), title, projectRoot, createdAt: now, updatedAt: now, history: [] };
  await saveSession(session);
  return session;
}

export async function saveSession(session: SavedSession): Promise<void> {
  const dir = path.join(sessionsDir(session.projectRoot), session.id);
  await fs.mkdir(dir, { recursive: true });
  session.updatedAt = new Date().toISOString();
  await fs.writeFile(path.join(dir, "session.json"), JSON.stringify(session), "utf8");
}

export async function loadSession(projectRoot: string, id: string): Promise<SavedSession | null> {
  try {
    const raw = await fs.readFile(path.join(sessionsDir(projectRoot), id, "session.json"), "utf8");
    return JSON.parse(raw) as SavedSession;
  } catch { return null; }
}

export async function updateSessionTitle(session: SavedSession, title: string): Promise<void> {
  session.title = title.trim().slice(0, 100) || session.title;
  await saveSession(session);
}
