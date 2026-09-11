import type { ToolDefinition } from "../types/index.js";
import { filesystemTools } from "../tools/filesystem/index.js";
import { terminalTools } from "../tools/terminal/index.js";
import { projectTools } from "../tools/project/index.js";
import { gitTools } from "../tools/git/index.js";
import { processTools } from "../tools/process/index.js";
import { memoryTools } from "../tools/memory/index.js";
import { taskPlanTools } from "../tools/taskplan/index.js";

const allTools: ToolDefinition[] = [
  ...filesystemTools,
  ...terminalTools,
  ...projectTools,
  ...gitTools,
  ...processTools,
  ...memoryTools,
  ...taskPlanTools,
];

export function getAllTools(): ToolDefinition[] {
  return allTools;
}

export function getTool(name: string): ToolDefinition | undefined {
  return allTools.find((t) => t.name === name);
}

/** Converts our internal tool defs into Gemini function-calling declarations. */
export function toGeminiFunctionDeclarations() {
  return allTools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}
