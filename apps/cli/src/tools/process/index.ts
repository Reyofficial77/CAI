import type { ToolDefinition } from "../../types/index.js";
import { processManager } from "./manager.js";

export const runScriptTool: ToolDefinition<{ name: string; command: string }> = {
  name: "run_script",
  description:
    "Start a long-running background process (e.g. a dev server). Returns a process ID you can check on later.",
  permission: "WARNING",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "A short label, e.g. 'frontend'." },
      command: { type: "string", description: "The command to run, e.g. 'npm run dev'." },
    },
    required: ["name", "command"],
  },
  async execute({ name, command }, ctx) {
    const allowed = await ctx.confirm(`Start background process "${name}": ${command}`, "WARNING");
    if (!allowed) return { success: false, output: "", error: "User denied permission." };

    const proc = processManager.start(name, command, ctx.projectRoot);
    return {
      success: true,
      output: `Started process #${proc.id} (${name}), pid=${proc.pid}.`,
      meta: { id: proc.id, pid: proc.pid },
    };
  },
};

export const checkProcessTool: ToolDefinition<{ id?: number }> = {
  name: "check_process",
  description: "Check status and recent logs of a background process, or list all processes if no id given.",
  permission: "SAFE",
  parameters: { type: "object", properties: { id: { type: "number" } } },
  async execute({ id }) {
    if (id === undefined) {
      const all = processManager.list();
      if (all.length === 0) return { success: true, output: "No background processes." };
      const lines = all.map((p) => `#${p.id} ${p.name} [${p.status}] pid=${p.pid}`);
      return { success: true, output: lines.join("\n") };
    }
    const proc = processManager.get(id);
    if (!proc) return { success: false, output: "", error: `No process with id ${id}` };
    const recentLogs = proc.logs.slice(-40).join("\n");
    return {
      success: true,
      output: `#${proc.id} ${proc.name} [${proc.status}] pid=${proc.pid}\n--- recent logs ---\n${recentLogs || "(no output yet)"}`,
    };
  },
};

export const stopProcessTool: ToolDefinition<{ id: number }> = {
  name: "stop_process",
  description: "Stop a running background process by ID.",
  permission: "WARNING",
  parameters: {
    type: "object",
    properties: { id: { type: "number" } },
    required: ["id"],
  },
  async execute({ id }, ctx) {
    const proc = processManager.get(id);
    if (!proc) return { success: false, output: "", error: `No process with id ${id}` };

    const allowed = await ctx.confirm(`Stop process #${id} (${proc.name})`, "WARNING");
    if (!allowed) return { success: false, output: "", error: "User denied permission." };

    const ok = processManager.stop(id);
    return ok
      ? { success: true, output: `Stopped process #${id}.` }
      : { success: false, output: "", error: `Failed to stop process #${id}.` };
  },
};

export const processTools = [runScriptTool, checkProcessTool, stopProcessTool];
