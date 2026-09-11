import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import type { ToolDefinition } from "../../types/index.js";
import { resolveSafePath } from "./paths.js";

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export const readFileTool: ToolDefinition<{ path: string }> = {
  name: "read_file",
  description: "Read the full text content of a file within the project.",
  permission: "SAFE",
  parameters: {
    type: "object",
    properties: { path: { type: "string", description: "Relative path to the file." } },
    required: ["path"],
  },
  async execute({ path: p }, ctx) {
    try {
      const safe = resolveSafePath(ctx.projectRoot, p);
      if (!(await exists(safe))) {
        return { success: false, output: "", error: `File not found: ${p}` };
      }
      const content = await fs.readFile(safe, "utf-8");
      return { success: true, output: content };
    } catch (err: any) {
      return { success: false, output: "", error: err.message };
    }
  },
};

export const createFileTool: ToolDefinition<{ path: string; content: string }> = {
  name: "create_file",
  description: "Create a new file with the given content. Fails if the file already exists.",
  permission: "WARNING",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative path for the new file." },
      content: { type: "string", description: "Full text content of the file." },
    },
    required: ["path", "content"],
  },
  async execute({ path: p, content }, ctx) {
    try {
      const safe = resolveSafePath(ctx.projectRoot, p);
      if (await exists(safe)) {
        return { success: false, output: "", error: `File already exists: ${p}. Use edit_file or write_file instead.` };
      }
      const allowed = await ctx.confirm(`Create file: ${p}`, "WARNING");
      if (!allowed) return { success: false, output: "", error: "User denied permission." };

      await fs.mkdir(path.dirname(safe), { recursive: true });
      await fs.writeFile(safe, content, "utf-8");

      // Verify — never claim success without checking.
      if (!(await exists(safe))) {
        return { success: false, output: "", error: `File creation could not be verified: ${p}` };
      }
      return { success: true, output: `Created ${p} (${content.length} bytes).` };
    } catch (err: any) {
      return { success: false, output: "", error: err.message };
    }
  },
};

export const writeFileTool: ToolDefinition<{ path: string; content: string }> = {
  name: "write_file",
  description: "Overwrite a file's full content (creates it if missing).",
  permission: "WARNING",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string" },
      content: { type: "string" },
    },
    required: ["path", "content"],
  },
  async execute({ path: p, content }, ctx) {
    try {
      const safe = resolveSafePath(ctx.projectRoot, p);
      const allowed = await ctx.confirm(`Overwrite file: ${p}`, "WARNING");
      if (!allowed) return { success: false, output: "", error: "User denied permission." };

      await fs.mkdir(path.dirname(safe), { recursive: true });
      await fs.writeFile(safe, content, "utf-8");

      const written = await fs.readFile(safe, "utf-8");
      if (written !== content) {
        return { success: false, output: "", error: `Write verification failed for ${p}` };
      }
      return { success: true, output: `Wrote ${p} (${content.length} bytes).` };
    } catch (err: any) {
      return { success: false, output: "", error: err.message };
    }
  },
};

export const editFileTool: ToolDefinition<{ path: string; find: string; replace: string }> = {
  name: "edit_file",
  description:
    "Perform a targeted find-and-replace edit inside an existing file. 'find' must match exactly once. Prefer this over write_file for small changes.",
  permission: "WARNING",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string" },
      find: { type: "string", description: "Exact text to locate (must be unique in the file)." },
      replace: { type: "string", description: "Replacement text." },
    },
    required: ["path", "find", "replace"],
  },
  async execute({ path: p, find, replace }, ctx) {
    try {
      const safe = resolveSafePath(ctx.projectRoot, p);
      if (!(await exists(safe))) {
        return { success: false, output: "", error: `File not found: ${p}` };
      }
      const original = await fs.readFile(safe, "utf-8");
      const occurrences = original.split(find).length - 1;

      if (occurrences === 0) {
        return { success: false, output: "", error: `Text not found in ${p}. No changes made.` };
      }
      if (occurrences > 1) {
        return {
          success: false,
          output: "",
          error: `Text is not unique in ${p} (${occurrences} matches). Provide more context to disambiguate.`,
        };
      }

      const allowed = await ctx.confirm(`Edit file: ${p}`, "WARNING");
      if (!allowed) return { success: false, output: "", error: "User denied permission." };

      const updated = original.replace(find, replace);
      await fs.writeFile(safe, updated, "utf-8");

      const verify = await fs.readFile(safe, "utf-8");
      if (verify !== updated) {
        return { success: false, output: "", error: `Edit verification failed for ${p}` };
      }
      return { success: true, output: `Edited ${p}.` };
    } catch (err: any) {
      return { success: false, output: "", error: err.message };
    }
  },
};

export const deleteFileTool: ToolDefinition<{ path: string }> = {
  name: "delete_file",
  description: "Delete a file. Requires explicit confirmation.",
  permission: "DANGEROUS",
  parameters: {
    type: "object",
    properties: { path: { type: "string" } },
    required: ["path"],
  },
  async execute({ path: p }, ctx) {
    try {
      const safe = resolveSafePath(ctx.projectRoot, p);
      if (!(await exists(safe))) {
        return { success: false, output: "", error: `File not found: ${p}` };
      }
      const allowed = await ctx.confirm(`DELETE file: ${p}`, "DANGEROUS");
      if (!allowed) return { success: false, output: "", error: "User denied permission." };

      await fs.unlink(safe);
      if (await exists(safe)) {
        return { success: false, output: "", error: `Deletion could not be verified: ${p}` };
      }
      return { success: true, output: `Deleted ${p}.` };
    } catch (err: any) {
      return { success: false, output: "", error: err.message };
    }
  },
};

export const createDirectoryTool: ToolDefinition<{ path: string }> = {
  name: "create_directory",
  description: "Create a directory (and parents as needed).",
  permission: "SAFE",
  parameters: {
    type: "object",
    properties: { path: { type: "string" } },
    required: ["path"],
  },
  async execute({ path: p }, ctx) {
    try {
      const safe = resolveSafePath(ctx.projectRoot, p);
      await fs.mkdir(safe, { recursive: true });
      if (!(await exists(safe))) {
        return { success: false, output: "", error: `Directory creation could not be verified: ${p}` };
      }
      return { success: true, output: `Created directory ${p}.` };
    } catch (err: any) {
      return { success: false, output: "", error: err.message };
    }
  },
};

export const deleteDirectoryTool: ToolDefinition<{ path: string }> = {
  name: "delete_directory",
  description: "Recursively delete a directory. Requires explicit confirmation.",
  permission: "DANGEROUS",
  parameters: {
    type: "object",
    properties: { path: { type: "string" } },
    required: ["path"],
  },
  async execute({ path: p }, ctx) {
    try {
      const safe = resolveSafePath(ctx.projectRoot, p);
      if (!(await exists(safe))) {
        return { success: false, output: "", error: `Directory not found: ${p}` };
      }
      const allowed = await ctx.confirm(`DELETE directory (recursive): ${p}`, "DANGEROUS");
      if (!allowed) return { success: false, output: "", error: "User denied permission." };

      await fs.rm(safe, { recursive: true, force: true });
      if (await exists(safe)) {
        return { success: false, output: "", error: `Deletion could not be verified: ${p}` };
      }
      return { success: true, output: `Deleted directory ${p}.` };
    } catch (err: any) {
      return { success: false, output: "", error: err.message };
    }
  },
};

export const moveFileTool: ToolDefinition<{ from: string; to: string }> = {
  name: "move_file",
  description: "Move or rename a file or directory within the project.",
  permission: "WARNING",
  parameters: {
    type: "object",
    properties: {
      from: { type: "string" },
      to: { type: "string" },
    },
    required: ["from", "to"],
  },
  async execute({ from, to }, ctx) {
    try {
      const safeFrom = resolveSafePath(ctx.projectRoot, from);
      const safeTo = resolveSafePath(ctx.projectRoot, to);
      if (!(await exists(safeFrom))) {
        return { success: false, output: "", error: `Source not found: ${from}` };
      }
      const allowed = await ctx.confirm(`Move ${from} -> ${to}`, "WARNING");
      if (!allowed) return { success: false, output: "", error: "User denied permission." };

      await fs.mkdir(path.dirname(safeTo), { recursive: true });
      await fs.rename(safeFrom, safeTo);

      if (!(await exists(safeTo))) {
        return { success: false, output: "", error: `Move could not be verified: ${to}` };
      }
      return { success: true, output: `Moved ${from} -> ${to}.` };
    } catch (err: any) {
      return { success: false, output: "", error: err.message };
    }
  },
};

export const listDirectoryTool: ToolDefinition<{ path?: string }> = {
  name: "list_directory",
  description: "List files and directories at a given path (default: project root).",
  permission: "SAFE",
  parameters: {
    type: "object",
    properties: { path: { type: "string", description: "Relative path. Defaults to '.'." } },
  },
  async execute({ path: p }, ctx) {
    try {
      const target = p ?? ".";
      const safe = resolveSafePath(ctx.projectRoot, target);
      if (!(await exists(safe))) {
        return { success: false, output: "", error: `Directory not found: ${target}` };
      }
      const entries = await fs.readdir(safe, { withFileTypes: true });
      const lines = entries
        .filter((e) => e.name !== "node_modules" && e.name !== ".git")
        .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
        .sort();
      return { success: true, output: lines.join("\n") || "(empty directory)" };
    } catch (err: any) {
      return { success: false, output: "", error: err.message };
    }
  },
};

export const searchFilesTool: ToolDefinition<{ pattern: string; path?: string }> = {
  name: "search_files",
  description: "Find files by name pattern (case-insensitive substring match) recursively.",
  permission: "SAFE",
  parameters: {
    type: "object",
    properties: {
      pattern: { type: "string" },
      path: { type: "string", description: "Directory to search from. Defaults to project root." },
    },
    required: ["pattern"],
  },
  async execute({ pattern, path: p }, ctx) {
    try {
      const root = resolveSafePath(ctx.projectRoot, p ?? ".");
      const results: string[] = [];
      const skip = new Set(["node_modules", ".git", "dist", "__pycache__", ".venv"]);

      async function walk(dir: string) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (skip.has(entry.name)) continue;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walk(full);
          } else if (entry.name.toLowerCase().includes(pattern.toLowerCase())) {
            results.push(path.relative(ctx.projectRoot, full));
          }
        }
      }
      await walk(root);
      return { success: true, output: results.length ? results.join("\n") : "No matches found." };
    } catch (err: any) {
      return { success: false, output: "", error: err.message };
    }
  },
};

export const searchTextTool: ToolDefinition<{ query: string; path?: string }> = {
  name: "search_text",
  description: "Search for a text string inside files recursively, returning matching lines with file:line.",
  permission: "SAFE",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string" },
      path: { type: "string" },
    },
    required: ["query"],
  },
  async execute({ query, path: p }, ctx) {
    try {
      const root = resolveSafePath(ctx.projectRoot, p ?? ".");
      const results: string[] = [];
      const skip = new Set(["node_modules", ".git", "dist", "__pycache__", ".venv"]);
      const maxResults = 200;

      async function walk(dir: string) {
        if (results.length >= maxResults) return;
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (results.length >= maxResults) return;
          if (skip.has(entry.name)) continue;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walk(full);
          } else {
            try {
              const stat = await fs.stat(full);
              if (stat.size > 2_000_000) continue; // skip huge/binary-likely files
              const content = await fs.readFile(full, "utf-8");
              const lines = content.split("\n");
              lines.forEach((line, i) => {
                if (results.length < maxResults && line.includes(query)) {
                  results.push(`${path.relative(ctx.projectRoot, full)}:${i + 1}: ${line.trim()}`);
                }
              });
            } catch {
              // binary or unreadable file — skip
            }
          }
        }
      }
      await walk(root);
      return { success: true, output: results.length ? results.join("\n") : "No matches found." };
    } catch (err: any) {
      return { success: false, output: "", error: err.message };
    }
  },
};

export const filesystemTools = [
  readFileTool,
  createFileTool,
  writeFileTool,
  editFileTool,
  deleteFileTool,
  createDirectoryTool,
  deleteDirectoryTool,
  moveFileTool,
  listDirectoryTool,
  searchFilesTool,
  searchTextTool,
];
