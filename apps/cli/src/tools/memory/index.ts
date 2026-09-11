import type { ToolDefinition } from "../../types/index.js";
import { appendProjectMemory, loadProjectMemory } from "../../agent/rules.js";

export const rememberNoteTool: ToolDefinition<{ note: string }> = {
  name: "remember_note",
  description:
    "Persist a short, useful note about this project to long-term project memory (.cai/memory.json). Use for durable facts (architecture decisions, conventions chosen), never secrets or API keys.",
  permission: "SAFE",
  parameters: {
    type: "object",
    properties: { note: { type: "string", description: "A concise, durable fact worth remembering." } },
    required: ["note"],
  },
  async execute({ note }, ctx) {
    if (/api[\s_-]?key|secret|password|token/i.test(note)) {
      return { success: false, output: "", error: "Refused: notes must not contain secrets or credentials." };
    }
    await appendProjectMemory(ctx.projectRoot, note);
    return { success: true, output: "Saved to project memory." };
  },
};

export const recallMemoryTool: ToolDefinition<{}> = {
  name: "recall_memory",
  description: "Read back all notes previously saved to project memory.",
  permission: "SAFE",
  parameters: { type: "object", properties: {} },
  async execute(_input, ctx) {
    const mem = await loadProjectMemory(ctx.projectRoot);
    if (!mem || mem.notes.length === 0) return { success: true, output: "No project memory yet." };
    return { success: true, output: mem.notes.map((n, i) => `${i + 1}. ${n}`).join("\n") };
  },
};

export const memoryTools = [rememberNoteTool, recallMemoryTool];
