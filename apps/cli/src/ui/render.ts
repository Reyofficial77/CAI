import chalk from "chalk";
import readline from "node:readline";
import type { PermissionLevel, PermissionMode } from "../types/index.js";

export function banner() {
  const lines = [
    "╭──────────────────────────────────────╮",
    "│ CAI                                   │",
    "│ Gemini-powered AI Computer Assistant  │",
    "╰──────────────────────────────────────╯",
  ];
  console.log(chalk.cyanBright(lines.join("\n")));
}

export function printAssistant(text: string) {
  console.log(chalk.white(text));
}

export function printToolCall(name: string, args: unknown) {
  const argStr = args && Object.keys(args as object).length ? ` ${chalk.dim(JSON.stringify(args))}` : "";
  console.log(chalk.blue(`→ ${name}${argStr}`));
}

export function printToolResult(name: string, success: boolean, output: string, error?: string) {
  if (success) {
    const preview = output.length > 300 ? output.slice(0, 300) + " …" : output;
    console.log(chalk.green(`✓ ${name}`) + (preview ? chalk.dim(`  ${oneLine(preview)}`) : ""));
  } else {
    console.log(chalk.red(`✗ ${name}: ${error ?? "failed"}`));
  }
}

function oneLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function printError(message: string) {
  console.log(chalk.red(`Error: ${message}`));
}

export function printWarning(message: string) {
  console.log(chalk.yellow(message));
}

const levelColor: Record<PermissionLevel, (s: string) => string> = {
  SAFE: chalk.green,
  WARNING: chalk.yellow,
  DANGEROUS: chalk.red,
  RESTRICTED: chalk.bgRed.white,
};

/**
 * Prompts the user to confirm an action, respecting the active permission mode.
 */
export function makeConfirmer(permissionMode: PermissionMode) {
  return async (message: string, level: PermissionLevel): Promise<boolean> => {
    if (permissionMode === "trusted" && level !== "RESTRICTED") return true;
    if (permissionMode === "read-only") return false;
    if (permissionMode === "ask-dangerous-only" && level === "SAFE") return true;
    if (permissionMode === "ask-dangerous-only" && level === "WARNING") return true;

    const color = levelColor[level];
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>((resolve) => {
      rl.question(color(`? [${level}] ${message} (y/N) `), resolve);
    });
    rl.close();
    return answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes";
  };
}
