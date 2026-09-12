import readline from "node:readline";
import chalk from "chalk";
import { GeminiClient } from "../gemini/client.js";
import { runAgentTurn, BASE_SYSTEM_INSTRUCTION } from "./loop.js";
import { getConfig } from "../config/index.js";
import { loadProjectRules } from "./rules.js";
import { activeTaskPlan } from "./taskPlanState.js";
import {
  printGreeting,
  printSessionLine,
  printAssistant,
  printToolCall,
  printToolResult,
  printError,
  makeConfirmer,
  readBoxedInput,
  Spinner,
  RegionRenderer,
} from "../ui/render.js";
import { createSession, listSessions, loadSession, saveSession, updateSessionTitle, type SavedSession } from "./sessionStore.js";
import type { ExecutionContext } from "../types/index.js";

async function pickSession(projectRoot: string, recovery = false): Promise<SavedSession | null> {
  const sessions = await listSessions(projectRoot);
  if (!sessions.length) {
    console.log(chalk.dim("No saved sessions for this project."));
    return null;
  }
  let index = 0;
  const region = new RegionRenderer();

  const draw = (): number => {
    let rows = 0;
    const line = (s: string) => { console.log(s); rows++; };
    line(chalk.cyan(`╭─ ${recovery ? "Recover Session" : "Previous Sessions"} ─────────────────────╮`));
    line(chalk.cyan("│") + " ".repeat(41) + chalk.cyan("│"));
    sessions.slice(0, 15).forEach((s, i) => {
      const mark = i === index ? chalk.cyan("❯") : " ";
      const title = s.title.length > 30 ? `${s.title.slice(0, 27)}...` : s.title;
      const date = new Date(s.updatedAt).toLocaleString();
      line(`${chalk.cyan("│")} ${mark} ${title.padEnd(31)} ${chalk.dim(date)} ${chalk.cyan("│")}`);
    });
    line(chalk.cyan("│") + " ".repeat(41) + chalk.cyan("│"));
    line(chalk.cyan("╰──────────────────────────────────────────╯"));
    line(chalk.dim("↑ ↓ select • Enter open • Esc cancel"));
    return rows;
  };

  readline.emitKeypressEvents(process.stdin);
  process.stdin.resume();
  region.render(draw);

  return new Promise<SavedSession | null>((resolve) => {
    const cleanup = () => {
      process.stdin.off("keypress", onKey);
      if (process.stdin.isRaw) process.stdin.setRawMode?.(false);
      region.clear();
    };
    const onKey = (_str: string, key: readline.Key) => {
      if (key.name === "up") { index = (index - 1 + sessions.length) % sessions.length; region.render(draw); return; }
      if (key.name === "down") { index = (index + 1) % sessions.length; region.render(draw); return; }
      if (key.name === "escape" || (key.ctrl && key.name === "c")) { cleanup(); resolve(null); return; }
      if (key.name === "return" || key.name === "enter") { const selected = sessions[index]; cleanup(); resolve(selected); }
    };
    process.stdin.setRawMode?.(true);
    process.stdin.on("keypress", onKey);
  });
}

function makeSessionTitle(input: string) {
  const clean = input.replace(/@[^\s]+/g, "").trim().replace(/\s+/g, " ");
  return clean.length > 60 ? `${clean.slice(0, 57)}...` : clean || "CAI session";
}

export async function startInteractiveSession() {
  const config = getConfig();
  if (!config.geminiApiKey) {
    printGreeting(config, config.workingDirectory ?? process.cwd());
    printError("GEMINI_API_KEY is not set. Export it in your shell or run `cai config set geminiApiKey <key>`.");
    return;
  }
  const projectRoot = config.workingDirectory ?? process.cwd();
  const ctx: ExecutionContext = { projectRoot, cwd: projectRoot, permissionMode: config.permissionMode, confirm: makeConfirmer(config.permissionMode), log: (line) => console.log(chalk.dim(line)) };
  const rules = await loadProjectRules(projectRoot);
  const systemInstruction = rules ? `${BASE_SYSTEM_INSTRUCTION}\n\nProject-specific rules (from .cai/rules.md — follow these):\n${rules}` : BASE_SYSTEM_INSTRUCTION;
  let client: GeminiClient;
  try { client = new GeminiClient({ apiKey: config.geminiApiKey, model: config.geminiModel }, systemInstruction); } catch (err: any) { printError(err.message); return; }
  let session = await createSession(projectRoot);

  printGreeting(config, projectRoot);
  printSessionLine(session.title, session.id);
  console.log();

  const spinner = new Spinner("Thinking");

  while (true) {
    const input = (await readBoxedInput()).trim();
    if (!input) continue;
    if (input === "exit" || input === "quit") break;
    if (input === "/session" || input === "/sessionRecovery") {
      const selected = await pickSession(projectRoot, input === "/sessionRecovery");
      if (!selected) { console.log(chalk.dim("Session selection cancelled.")); continue; }
      if (input === "/sessionRecovery") {
        session = await createSession(projectRoot, `Recovery: ${selected.title}`);
        client.loadHistory(selected.history);
        session.history = client.getHistory();
        await saveSession(session);
        console.log(chalk.green(`Recovered session: ${selected.title}`));
      } else {
        session = (await loadSession(projectRoot, selected.id)) ?? selected;
        client.loadHistory(session.history);
        console.log(chalk.green(`Loaded session: ${session.title}`));
      }
      console.log();
      continue;
    }
    try {
      if (session.title === "New session") await updateSessionTitle(session, makeSessionTitle(input));
      let lastPlanRender = "";
      await runAgentTurn(input, {
        client,
        ctx,
        onThinkingStart: () => spinner.start(),
        onThinkingStop: () => spinner.stop(),
        onAssistantText: printAssistant,
        onToolCall: (name, args) => printToolCall(name, args),
        onToolResult: (name, success, output, error) => {
          printToolResult(name, success, output, error);
          if (name === "set_task_plan" || name === "update_task_step") {
            const rendered = activeTaskPlan.render();
            if (rendered && rendered !== lastPlanRender) { lastPlanRender = rendered; console.log(chalk.magenta(rendered)); }
          }
        },
      });
      session.history = client.getHistory();
      await saveSession(session);
    } catch (err: any) {
      spinner.stop();
      printError(err.message ?? String(err));
    }
    console.log();
  }
  session.history = client.getHistory();
  await saveSession(session);
}
