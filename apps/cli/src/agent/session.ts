import readline from "node:readline";
import chalk from "chalk";
import { GeminiClient } from "../gemini/client.js";
import { runAgentTurn, BASE_SYSTEM_INSTRUCTION } from "./loop.js";
import { getConfig } from "../config/index.js";
import { loadProjectRules } from "./rules.js";
import { activeTaskPlan } from "./taskPlanState.js";
import { banner, printAssistant, printToolCall, printToolResult, printError, makeConfirmer } from "../ui/render.js";
import type { ExecutionContext } from "../types/index.js";

export async function startInteractiveSession() {
  const config = getConfig();
  banner();

  if (!config.geminiApiKey) {
    printError(
      "GEMINI_API_KEY is not set. Export it in your shell or run `cai config set geminiApiKey <key>`."
    );
    console.log(chalk.dim("Example: export GEMINI_API_KEY=your_api_key"));
    return;
  }

  const projectRoot = config.workingDirectory ?? process.cwd();

  const ctx: ExecutionContext = {
    projectRoot,
    cwd: projectRoot,
    permissionMode: config.permissionMode,
    confirm: makeConfirmer(config.permissionMode),
    log: (line) => console.log(chalk.dim(line)),
  };

  const rules = await loadProjectRules(projectRoot);
  const systemInstruction = rules
    ? `${BASE_SYSTEM_INSTRUCTION}\n\nProject-specific rules (from .cai/rules.md — follow these):\n${rules}`
    : BASE_SYSTEM_INSTRUCTION;

  let client: GeminiClient;
  try {
    client = new GeminiClient({ apiKey: config.geminiApiKey, model: config.geminiModel }, systemInstruction);
  } catch (err: any) {
    printError(err.message);
    return;
  }

  console.log(
    chalk.dim(
      `Model: ${config.geminiModel} | Permission mode: ${config.permissionMode} | Root: ${projectRoot}` +
        (rules ? " | Rules: .cai/rules.md loaded" : "")
    )
  );
  console.log();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = () => new Promise<string>((resolve) => rl.question(chalk.bold.cyan("CAI > "), resolve));

  while (true) {
    const input = (await ask()).trim();
    if (!input) continue;
    if (input === "exit" || input === "quit") break;

    let lastPlanRender = "";

    try {
      await runAgentTurn(input, {
        client,
        ctx,
        onAssistantText: printAssistant,
        onToolCall: (name, args) => printToolCall(name, args),
        onToolResult: (name, success, output, error) => {
          printToolResult(name, success, output, error);
          if (name === "set_task_plan" || name === "update_task_step") {
            const rendered = activeTaskPlan.render();
            if (rendered && rendered !== lastPlanRender) {
              lastPlanRender = rendered;
              console.log(chalk.magenta(rendered));
            }
          }
        },
      });
    } catch (err: any) {
      printError(err.message ?? String(err));
    }
    console.log();
  }

  rl.close();
}
