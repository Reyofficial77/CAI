import { spawn } from "node:child_process";
import type { ToolDefinition } from "../../types/index.js";

function runGit(args: string[], cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("git", args, { cwd });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => resolve({ code: code ?? 1, stdout: stdout.trim(), stderr: stderr.trim() }));
    child.on("error", (err) => resolve({ code: 1, stdout: "", stderr: err.message }));
  });
}

export const gitStatusTool: ToolDefinition<{}> = {
  name: "git_status",
  description: "Show the current git status of the project.",
  permission: "SAFE",
  parameters: { type: "object", properties: {} },
  async execute(_input, ctx) {
    const res = await runGit(["status", "--short", "--branch"], ctx.projectRoot);
    return res.code === 0
      ? { success: true, output: res.stdout || "Clean working tree." }
      : { success: false, output: "", error: res.stderr };
  },
};

export const gitDiffTool: ToolDefinition<{ path?: string }> = {
  name: "git_diff",
  description: "Show the current unstaged diff, optionally scoped to a path.",
  permission: "SAFE",
  parameters: { type: "object", properties: { path: { type: "string" } } },
  async execute({ path: p }, ctx) {
    const args = p ? ["diff", "--", p] : ["diff"];
    const res = await runGit(args, ctx.projectRoot);
    return res.code === 0
      ? { success: true, output: res.stdout || "No changes." }
      : { success: false, output: "", error: res.stderr };
  },
};

export const gitLogTool: ToolDefinition<{ limit?: number }> = {
  name: "git_log",
  description: "Show recent commit history.",
  permission: "SAFE",
  parameters: { type: "object", properties: { limit: { type: "number" } } },
  async execute({ limit }, ctx) {
    const n = limit ?? 10;
    const res = await runGit(["log", `-${n}`, "--oneline"], ctx.projectRoot);
    return res.code === 0
      ? { success: true, output: res.stdout || "No commits yet." }
      : { success: false, output: "", error: res.stderr };
  },
};

export const gitBranchTool: ToolDefinition<{ create?: string }> = {
  name: "git_branch",
  description: "List branches, or create a new branch if 'create' is provided.",
  permission: "WARNING",
  parameters: {
    type: "object",
    properties: { create: { type: "string", description: "Name of a new branch to create." } },
  },
  async execute({ create }, ctx) {
    if (create) {
      const allowed = await ctx.confirm(`Create git branch: ${create}`, "WARNING");
      if (!allowed) return { success: false, output: "", error: "User denied permission." };
      const res = await runGit(["checkout", "-b", create], ctx.projectRoot);
      return res.code === 0
        ? { success: true, output: `Created and switched to branch ${create}.` }
        : { success: false, output: "", error: res.stderr };
    }
    const res = await runGit(["branch"], ctx.projectRoot);
    return res.code === 0
      ? { success: true, output: res.stdout }
      : { success: false, output: "", error: res.stderr };
  },
};

export const gitTools = [gitStatusTool, gitDiffTool, gitLogTool, gitBranchTool];
