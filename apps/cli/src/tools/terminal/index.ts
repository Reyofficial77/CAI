import { spawn } from "node:child_process";
import os from "node:os";
import type { ToolDefinition } from "../../types/index.js";
import { classifyCommand } from "./security.js";

function getShell(): { cmd: string; args: string[] } {
  if (process.platform === "win32") {
    // Prefer PowerShell if present; fall back to cmd.exe
    return { cmd: "powershell.exe", args: ["-NoProfile", "-Command"] };
  }
  return { cmd: process.env.SHELL || "/bin/bash", args: ["-c"] };
}

export const runCommandTool: ToolDefinition<{ command: string; timeoutMs?: number }> = {
  name: "run_command",
  description:
    "Execute a shell command inside the project directory. Platform-aware (PowerShell/CMD on Windows, bash elsewhere). Captures stdout, stderr, exit code, and duration.",
  permission: "WARNING", // actual level is re-classified dynamically below
  parameters: {
    type: "object",
    properties: {
      command: { type: "string", description: "The full shell command to run." },
      timeoutMs: { type: "number", description: "Optional timeout override in milliseconds." },
    },
    required: ["command"],
  },
  async execute({ command, timeoutMs }, ctx) {
    const level = classifyCommand(command);

    if (level === "RESTRICTED") {
      return {
        success: false,
        output: "",
        error: `Command blocked (RESTRICTED): "${command}". This category of command is never permitted.`,
      };
    }

    if (level === "DANGEROUS" || level === "WARNING") {
      const allowed = await ctx.confirm(`Run command (${level}): ${command}`, level);
      if (!allowed) {
        return { success: false, output: "", error: "User denied permission." };
      }
    }

    if (ctx.permissionMode === "read-only") {
      return { success: false, output: "", error: "Blocked: CAI is in read-only mode." };
    }

    const { cmd, args } = getShell();
    const timeout = timeoutMs ?? 120_000;
    const start = Date.now();

    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      let settled = false;

      const child = spawn(cmd, [...args, command], {
        cwd: ctx.projectRoot,
        env: process.env,
      });

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          child.kill();
          resolve({
            success: false,
            output: stdout,
            error: `Command timed out after ${timeout}ms: ${command}`,
            meta: { pid: child.pid, durationMs: Date.now() - start },
          });
        }
      }, timeout);

      child.stdout?.on("data", (d) => (stdout += d.toString()));
      child.stderr?.on("data", (d) => (stderr += d.toString()));

      child.on("close", (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const durationMs = Date.now() - start;
        resolve({
          success: code === 0,
          output: stdout.trim(),
          error: code === 0 ? undefined : stderr.trim() || `Exited with code ${code}`,
          meta: { exitCode: code, durationMs, pid: child.pid, platform: os.platform() },
        });
      });

      child.on("error", (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ success: false, output: stdout, error: err.message });
      });
    });
  },
};

export const terminalTools = [runCommandTool];
