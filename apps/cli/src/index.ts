#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { spawnSync } from "node:child_process";
import { startInteractiveSession } from "./agent/session.js";
import { getConfig, setConfigValue, getConfigPath } from "./config/index.js";
import { processManager } from "./tools/process/manager.js";

const program = new Command();

program
  .name("cai")
  .description("CAI - Gemini-powered AI terminal agent")
  .version("0.1.0");

program
  .command("chat", { isDefault: true })
  .description("Start the interactive CAI session (default command)")
  .action(async () => {
    await startInteractiveSession();
  });

program
  .command("config")
  .description("View or set CAI configuration")
  .argument("[action]", "get | set | path")
  .argument("[key]", "config key")
  .argument("[value]", "config value")
  .action((action, key, value) => {
    const config = getConfig();
    if (!action || action === "get") {
      const { geminiApiKey, ...safe } = config;
      console.log(JSON.stringify({ ...safe, geminiApiKey: geminiApiKey ? "***set***" : undefined }, null, 2));
      return;
    }
    if (action === "path") {
      console.log(getConfigPath());
      return;
    }
    if (action === "set") {
      if (!key || value === undefined) {
        console.log(chalk.red("Usage: cai config set <key> <value>"));
        return;
      }
      setConfigValue(key as any, value as any);
      console.log(chalk.green(`Set ${key} = ${value}`));
      return;
    }
    console.log(chalk.red(`Unknown config action: ${action}`));
  });

program
  .command("doctor")
  .description("Check that CAI's environment is correctly configured")
  .action(() => {
    console.log(chalk.bold("CAI Doctor\n"));
    const checks: { label: string; ok: boolean; detail?: string }[] = [];

    const node = spawnSync("node", ["-v"]);
    checks.push({ label: "Node.js", ok: node.status === 0, detail: node.stdout?.toString().trim() });

    const python = spawnSync("python3", ["--version"]);
    checks.push({ label: "Python", ok: python.status === 0, detail: python.stdout?.toString().trim() || python.stderr?.toString().trim() });

    const git = spawnSync("git", ["--version"]);
    checks.push({ label: "Git", ok: git.status === 0, detail: git.stdout?.toString().trim() });

    const config = getConfig();
    checks.push({ label: "Gemini API key", ok: !!config.geminiApiKey });
    checks.push({ label: "Gemini model configured", ok: !!config.geminiModel, detail: config.geminiModel });
    checks.push({ label: "Project directory", ok: true, detail: process.cwd() });

    for (const c of checks) {
      const mark = c.ok ? chalk.green("✓") : chalk.red("✗");
      console.log(`${mark} ${c.label}${c.detail ? chalk.dim(`  (${c.detail})`) : ""}`);
    }

    const allOk = checks.every((c) => c.ok);
    console.log();
    console.log(allOk ? chalk.green("CAI is ready.") : chalk.yellow("CAI has configuration issues to resolve."));
  });

program
  .command("processes")
  .description("List background processes started by CAI in this session")
  .action(() => {
    const all = processManager.list();
    if (all.length === 0) {
      console.log(chalk.dim("No background processes."));
      return;
    }
    console.log(chalk.bold("ID   NAME        STATUS"));
    for (const p of all) {
      console.log(`${String(p.id).padEnd(4)} ${p.name.padEnd(11)} ${p.status}`);
    }
  });

program
  .command("init")
  .description("Initialize a .cai/ directory with rules.md and config.json in the current project")
  .action(async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const dir = path.join(process.cwd(), ".cai");
    await fs.mkdir(dir, { recursive: true });

    const rulesPath = path.join(dir, "rules.md");
    try {
      await fs.access(rulesPath);
      console.log(chalk.dim(".cai/rules.md already exists, skipping."));
    } catch {
      await fs.writeFile(
        rulesPath,
        "# CAI Project Rules\n\nAdd project-specific instructions here. CAI will read this file and follow these rules when working in this project.\n"
      );
      console.log(chalk.green("Created .cai/rules.md"));
    }
    console.log(chalk.green(`Initialized .cai/ in ${process.cwd()}`));
  });

program.parseAsync(process.argv);
