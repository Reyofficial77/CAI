import type { ToolDefinition } from "../../types/index.js";
import { activeTaskPlan } from "../../agent/taskPlanState.js";

export const setTaskPlanTool: ToolDefinition<{ steps: string[] }> = {
  name: "set_task_plan",
  description:
    "Declare the ordered list of steps for a complex multi-step request, so the user can see progress. Call this once at the start of multi-step work (3+ distinct actions). Skip for simple one-shot requests.",
  permission: "SAFE",
  parameters: {
    type: "object",
    properties: {
      steps: {
        type: "array",
        items: { type: "string" },
        description: "Short titles for each step, in execution order.",
      },
    },
    required: ["steps"],
  },
  async execute({ steps }) {
    activeTaskPlan.set(steps);
    return { success: true, output: activeTaskPlan.render() };
  },
};

export const updateTaskStepTool: ToolDefinition<{ index: number; status: "in_progress" | "done" | "failed" }> = {
  name: "update_task_step",
  description: "Update the status of a step in the current task plan (0-indexed).",
  permission: "SAFE",
  parameters: {
    type: "object",
    properties: {
      index: { type: "number" },
      status: { type: "string", description: "One of: in_progress, done, failed" },
    },
    required: ["index", "status"],
  },
  async execute({ index, status }) {
    if (status === "in_progress") activeTaskPlan.start(index);
    else if (status === "done") activeTaskPlan.complete(index);
    else if (status === "failed") activeTaskPlan.fail(index);
    return { success: true, output: activeTaskPlan.render() };
  },
};

export const taskPlanTools = [setTaskPlanTool, updateTaskStepTool];
