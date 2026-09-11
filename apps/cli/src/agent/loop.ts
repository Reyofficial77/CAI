import chalk from "chalk";
import { GeminiClient } from "../gemini/client.js";
import { getTool } from "./registry.js";
import type { ExecutionContext } from "../types/index.js";

export const BASE_SYSTEM_INSTRUCTION = `You are CAI, an AI coworker operating inside a user's terminal and project directory.
You have real tools to read/write files, run commands, manage git, manage background processes, and remember durable project notes.
Rules:
- Always inspect before assuming. Use inspect_project / list_directory / read_file before editing blindly.
- Prefer targeted edits (edit_file) over full rewrites (write_file) for existing files.
- Never claim an action succeeded unless the tool result confirms it.
- When a command fails, read the error, investigate, and attempt a fix. Do not retry the same failing command more than 3 times without changing your approach.
- Keep your natural-language responses concise. Let tool results speak for themselves.
- Ask the user before anything destructive if the tool doesn't already require confirmation.
- For complex multi-step requests (3+ distinct actions), call set_task_plan first with the ordered steps, then call update_task_step as you progress through them.
- Use remember_note for durable project facts worth keeping across sessions (architecture decisions, conventions). Never store secrets.
- Learning mode: if the user asks to be taught, or says "don't write the solution, guide me" (or similar), act as a tutor — explain concepts progressively and let the user write the code themselves, rather than solving it for them. Otherwise, complete the work directly.`;

const MAX_ITERATIONS = 25;

export interface AgentLoopDeps {
  client: GeminiClient;
  ctx: ExecutionContext;
  onAssistantText?: (text: string) => void;
  onToolCall?: (name: string, args: any) => void;
  onToolResult?: (name: string, success: boolean, output: string, error?: string) => void;
}

/**
 * Runs the full agent loop for a single user turn:
 * user message -> Gemini -> (tool calls -> execute -> feed back)* -> final text.
 */
export async function runAgentTurn(userMessage: string, deps: AgentLoopDeps): Promise<string> {
  const { client, ctx, onAssistantText, onToolCall, onToolResult } = deps;
  client.pushUserText(userMessage);

  let finalText = "";

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.send();
    const functionCalls = response.functionCalls;

    if (response.text) {
      finalText = response.text;
      onAssistantText?.(response.text);
    }

    if (!functionCalls || functionCalls.length === 0) {
      // No more tool calls requested — the turn is complete.
      return finalText;
    }

    const functionResponses: { name: string; response: Record<string, unknown> }[] = [];

    for (const call of functionCalls) {
      const name = call.name ?? "";
      const args = call.args ?? {};
      onToolCall?.(name, args);

      const tool = getTool(name);
      if (!tool) {
        const errMsg = `Unknown tool requested: ${name}`;
        onToolResult?.(name, false, "", errMsg);
        functionResponses.push({ name, response: { success: false, error: errMsg } });
        continue;
      }

      try {
        const result = await tool.execute(args, ctx);
        onToolResult?.(name, result.success, result.output, result.error);
        functionResponses.push({
          name,
          response: {
            success: result.success,
            output: result.output,
            error: result.error ?? null,
          },
        });
      } catch (err: any) {
        onToolResult?.(name, false, "", err.message);
        functionResponses.push({ name, response: { success: false, error: err.message } });
      }
    }

    client.pushFunctionResponses(functionResponses);
    // Loop again so Gemini can react to the tool results.
  }

  return finalText || chalk.yellow("Reached max tool-call iterations without a final response.");
}
