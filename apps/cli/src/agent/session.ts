import fs from "node:fs/promises";
import readline from "node:readline";
import chalk from "chalk";
import { GeminiClient } from "../gemini/client.js";
import { runAgentTurn, BASE_SYSTEM_INSTRUCTION } from "./loop.js";
import { getConfig, setConfigValue, getConfigPath } from "../config/index.js";
import { loadProjectRules } from "./rules.js";
import { activeTaskPlan } from "./taskPlanState.js";
import { resolveSafePath, PathSecurityError } from "../tools/filesystem/paths.js";
import {
  printGreeting,
  printSessionLine,
  printToolCall,
  printToolResult,
  printError,
  printWarning,
  printHelp,
  printGoodbye,
  makeConfirmer,
  readPrompt,
  Spinner,
  RegionRenderer,
} from "../ui/render.js";
import { createSession, listSessions, loadSession, saveSession, updateSessionTitle, type SavedSession } from "./sessionStore.js";
import type { ExecutionContext } from "../types/index.js";

const MAX_FILE_REF_BYTES = 50_000;

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

/**
 * Expands any `@path/to/file` references in the user's message into inline
 * file-content context sent to Gemini, e.g. `@src/App.tsx fix the bug`.
 * Returns the augmented message to send, plus any warnings to show the user.
 */
async function expandFileReferences(input: string, projectRoot: string): Promise<{ augmented: string; warnings: string[] }> {
  const matches = [...input.matchAll(/@([^\s]+)/g)];
  if (!matches.length) return { augmented: input, warnings: [] };

  const warnings: string[] = [];
  const attachments: string[] = [];

  for (const match of matches) {
    const ref = match[1];
    try {
      const safe = resolveSafePath(projectRoot, ref);
      const stat = await fs.stat(safe);
      if (!stat.isFile()) { warnings.push(`@${ref} is not a file — skipped.`); continue; }
      if (stat.size > MAX_FILE_REF_BYTES) { warnings.push(`@${ref} is too large (${stat.size} bytes) to inline — skipped.`); continue; }
      const content = await fs.readFile(safe, "utf-8");
      attachments.push(`Referenced file @${ref}:\n\`\`\`\n${content}\n\`\`\``);
    } catch (err) {
      if (err instanceof PathSecurityError) warnings.push(`@${ref} is outside the project root — skipped.`);
      else warnings.push(`@${ref} not found — skipped.`);
    }
  }

  if (!attachments.length) return { augmented: input, warnings };
  return { augmented: `${attachments.join("\n\n")}\n\n${input}`, warnings };
}

function printStatus(config: ReturnType<typeof getConfig>, projectRoot: string, session: SavedSession) {
  console.log();
  console.log(`  ${chalk.dim("Model")}       ${config.geminiModel}`);
  console.log(`  ${chalk.dim("Permission")}  ${config.permissionMode}`);
  console.log(`  ${chalk.dim("Root")}        ${projectRoot}`);
  console.log(`  ${chalk.dim("Session")}     ${session.id}`);
  console.log();
}

async function runDoctor(config: ReturnType<typeof getConfig>, projectRoot: string) {
  console.log();
  const check = (ok: boolean, label: string) => console.log(`  ${ok ? chalk.green("✓") : chalk.red("✗")} ${label}`);
  check(!!config.geminiApiKey, "GEMINI_API_KEY is set");
  check(!!config.geminiModel, `Model configured (${config.geminiModel})`);
  try { await fs.access(projectRoot); check(true, `Project root is accessible (${projectRoot})`); }
  catch { check(false, `Project root is accessible (${projectRoot})`); }
  check(process.stdout.isTTY === true, "Running in an interactive terminal");
  console.log(`  ${chalk.dim("Config file")}  ${getConfigPath()}`);
  console.log();
}

export async function startInteractiveSession() {
  const config = getConfig();
  const projectRoot = config.workingDirectory ?? process.cwd();
  if (!config.geminiApiKey) {
    printGreeting(config, projectRoot);
    printError("GEMINI_API_KEY is not set. Export it in your shell or run `cai config set geminiApiKey <key>`.");
    return;
  }
  const ctx: ExecutionContext = { projectRoot, cwd: projectRoot, permissionMode: config.permissionMode, confirm: makeConfirmer(config.permissionMode), log: (line) => console.log(chalk.dim(line)) };
  const rules = await loadProjectRules(projectRoot);
  const systemInstruction = rules ? `${BASE_SYSTEM_INSTRUCTION}\n\nProject-specific rules (from .cai/rules.md — follow these):\n${rules}` : BASE_SYSTEM_INSTRUCTION;
  let client: GeminiClient;
  try { client = new GeminiClient({ apiKey: config.geminiApiKey, model: config.geminiModel }, systemInstruction); } catch (err: any) { printError(err.message); return; }
  let session = await createSession(projectRoot);

  printGreeting(config, projectRoot);
  printSessionLine(session.id);
  console.log(chalk.dim("Type /help for commands, or just start typing."));
  console.log();

  const spinner = new Spinner("Thinking");

  while (true) {
    const raw = (await readPrompt()).trim();
    if (!raw) continue;

    // ── slash commands ──────────────────────────────────────────────────
    if (raw === "exit" || raw === "quit" || raw === "/exit") { break; }
    if (raw === "/help") { printHelp(); continue; }
    if (raw === "/status") { printStatus(config, projectRoot, session); continue; }
    if (raw === "/doctor") { await runDoctor(config, projectRoot); continue; }
    if (raw === "/clear") {
      client.resetHistory();
      session = await createSession(projectRoot);
      console.log(chalk.dim(`Conversation cleared. New session: ${session.id}`));
      console.log();
      continue;
    }
    if (raw === "/model" || raw.startsWith("/model ")) {
      const name = raw.slice("/model".length).trim();
      if (!name) { console.log(chalk.dim(`Current model: ${config.geminiModel}`)); console.log(); continue; }
      setConfigValue("geminiModel", name);
      config.geminiModel = name;
      try {
        client = new GeminiClient({ apiKey: config.geminiApiKey!, model: name }, systemInstruction);
        client.loadHistory(session.history);
        console.log(chalk.green(`Switched model to ${name}`));
      } catch (err: any) {
        printError(err.message);
      }
      console.log();
      continue;
    }
    if (raw === "/session" || raw === "/sessionRecovery") {
      const selected = await pickSession(projectRoot, raw === "/sessionRecovery");
      if (!selected) { console.log(chalk.dim("Session selection cancelled.")); continue; }
      if (raw === "/sessionRecovery") {
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

    // ── normal turn ──────────────────────────────────────────────────────
    try {
      if (session.title === "New session") await updateSessionTitle(session, makeSessionTitle(raw));

      const { augmented, warnings } = await expandFileReferences(raw, projectRoot);
      for (const w of warnings) printWarning(w);

      let lastPlanRender = "";
      let wroteChunk = false;
      let usedTools = false;

      const finalText = await runAgentTurn(augmented, {
        client,
        ctx,
        onThinkingStart: () => spinner.start(),
        onThinkingStop: () => spinner.stop(),
        onAssistantTextChunk: (delta) => {
          if (!wroteChunk) console.log();
          wroteChunk = true;
          process.stdout.write(chalk.white(delta));
        },
        onToolCall: (name, args) => {
          if (wroteChunk) { console.log(); console.log(); wroteChunk = false; }
          usedTools = true;
          printToolCall(name, args);
        },
        onToolResult: (name, success, output, error) => {
          printToolResult(name, success, output, error);
          if (name === "set_task_plan" || name === "update_task_step") {
            const rendered = activeTaskPlan.render();
            if (rendered && rendered !== lastPlanRender) { lastPlanRender = rendered; console.log(chalk.magenta(rendered)); }
          }
        },
      });

      if (wroteChunk) console.log();
      if (usedTools && !finalText.trim()) console.log(chalk.green("✓ Task completed"));

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
  printGoodbye();
}
