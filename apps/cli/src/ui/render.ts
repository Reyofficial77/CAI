import chalk from "chalk";
import readline from "node:readline";
import type { CAIConfig, PermissionLevel, PermissionMode } from "../types/index.js";

// ── layout helpers ────────────────────────────────────────────────────────

function termWidth(): number {
  const w = process.stdout.columns || 60;
  return Math.max(40, Math.min(w, 78));
}

/** Visible length, ignoring ANSI color codes, for padding math. */
function visibleLength(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}

function padLine(content: string, width: number): string {
  const inner = width - 2; // minus the two border chars
  const pad = Math.max(0, inner - visibleLength(content));
  return content + " ".repeat(pad);
}

/**
 * Draws a rounded box. `lines` may contain chalk-colored strings.
 * When `width` is omitted, the box tightly fits its content (capped to the
 * terminal width) instead of stretching to fill the whole terminal — a
 * full-width banner reads as empty/stretched, which is not how Claude
 * Code's welcome box looks.
 * Returns the number of terminal rows the box occupied (for redraw math).
 */
export function drawBox(lines: string[], color: (s: string) => string = chalk.cyan, width?: number): number {
  const w = width ?? Math.min(termWidth(), Math.max(...lines.map(visibleLength)) + 4);
  const top = color("╭" + "─".repeat(w - 2) + "╮");
  const bottom = color("╰" + "─".repeat(w - 2) + "╯");
  console.log(top);
  for (const line of lines) {
    console.log(color("│ ") + padLine(line, w - 2) + color(" │"));
  }
  console.log(bottom);
  return lines.length + 2;
}

// ── greeting ───────────────────────────────────────────────────────────────

export function banner() {
  drawBox(
    [chalk.bold.cyanBright("✳ CAI"), chalk.dim("  Gemini-powered AI Computer Assistant")],
    chalk.cyan
  );
}

/**
 * Full startup greeting: banner + model/permission/root info + quick tips,
 * matching the "greeting" shown when a Claude Code-style CLI starts up.
 */
export function printGreeting(config: CAIConfig, projectRoot: string) {
  banner();
  console.log();
  const row = (label: string, value: string) => `  ${chalk.dim(label.padEnd(12))}${chalk.white(value)}`;
  console.log(row("Model", config.geminiModel));
  console.log(row("Permission", config.permissionMode));
  console.log(row("Root", projectRoot));
  console.log();
  console.log(chalk.dim("  Tips"));
  console.log(chalk.dim("  • /session          switch to a previous session"));
  console.log(chalk.dim("  • /sessionRecovery  recover a session's history into a new session"));
  console.log(chalk.dim("  • exit / quit        leave CAI"));
  console.log(chalk.dim("  • Ctrl+C             cancel the current action"));
  console.log();
}

export function printSessionLine(title: string, id: string) {
  console.log(chalk.dim(`Session: ${title} (${id})`));
}

// ── conversation output ─────────────────────────────────────────────────────

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

// ── input box (Claude Code style) ───────────────────────────────────────────

const INPUT_PROMPT = "❯ ";

function inputWindow(buffer: string, cursor: number, contentWidth: number): { text: string; offset: number } {
  if (buffer.length <= contentWidth) return { text: buffer, offset: 0 };
  let start = Math.max(0, cursor - contentWidth + 1);
  if (start + contentWidth > buffer.length) start = buffer.length - contentWidth;
  if (cursor < start) start = cursor;
  return { text: buffer.slice(start, start + contentWidth), offset: start };
}

/**
 * A real boxed input, redrawn live on every keystroke — both borders stay
 * closed the entire time you're typing (unlike a plain `readline.question`,
 * which can only print the bottom border after you hit Enter). Supports
 * left/right/home/end/backspace/delete and horizontally scrolls long lines,
 * similar to Claude Code's own input box.
 */
export function readBoxedInput(): Promise<string> {
  return new Promise((resolve) => {
    const width = termWidth();
    const contentWidth = width - 2 /* borders */ - 2 /* inner padding */ - INPUT_PROMPT.length;
    let buffer = "";
    let cursor = 0;
    let firstDraw = true;

    const draw = () => {
      if (!firstDraw) {
        // Cursor sits on the content row (row 2 of 4) after the previous
        // draw's caret placement — hop up to the top border and wipe the
        // whole block before redrawing it.
        process.stdout.write("\x1b[1G\x1b[1A\x1b[0J");
      }
      firstDraw = false;

      const { text, offset } = inputWindow(buffer, cursor, contentWidth);
      const padded = text + " ".repeat(Math.max(0, contentWidth - text.length));
      const top = chalk.dim("╭" + "─".repeat(width - 2) + "╮");
      const content = chalk.dim("│ ") + chalk.bold.cyan(INPUT_PROMPT) + padded + chalk.dim(" │");
      const bottom = chalk.dim("╰" + "─".repeat(width - 2) + "╯");
      const hint = chalk.dim("  ? for shortcuts");
      process.stdout.write(`${top}\n${content}\n${bottom}\n${hint}`);

      const caretCol = 2 + INPUT_PROMPT.length + (cursor - offset) + 1; // 1-indexed
      process.stdout.write(`\x1b[2A\x1b[${caretCol}G`);
    };

    draw();

    readline.emitKeypressEvents(process.stdin);
    process.stdin.resume();
    process.stdin.setRawMode?.(true);

    const finish = (submit: boolean) => {
      process.stdin.off("keypress", onKey);
      if (process.stdin.isRaw) process.stdin.setRawMode?.(false);
      // Drop the hint line and leave the closed box (top/content/bottom) as
      // a permanent record, with the cursor ready for the next output line.
      process.stdout.write("\x1b[1G\x1b[2B\x1b[2K");
      if (submit) resolve(buffer);
    };

    const onKey = (str: string | undefined, key: readline.Key) => {
      if (key.ctrl && key.name === "c") { finish(false); process.exit(0); }
      if (key.name === "return" || key.name === "enter") { finish(true); return; }
      if (key.name === "backspace") {
        if (cursor > 0) { buffer = buffer.slice(0, cursor - 1) + buffer.slice(cursor); cursor--; draw(); }
        return;
      }
      if (key.name === "delete") {
        if (cursor < buffer.length) { buffer = buffer.slice(0, cursor) + buffer.slice(cursor + 1); draw(); }
        return;
      }
      if (key.name === "left") { if (cursor > 0) { cursor--; draw(); } return; }
      if (key.name === "right") { if (cursor < buffer.length) { cursor++; draw(); } return; }
      if (key.name === "home" || (key.ctrl && key.name === "a")) { cursor = 0; draw(); return; }
      if (key.name === "end" || (key.ctrl && key.name === "e")) { cursor = buffer.length; draw(); return; }
      if (key.ctrl && key.name === "u") { buffer = ""; cursor = 0; draw(); return; }
      if (key.ctrl && key.name === "w") {
        let i = cursor;
        while (i > 0 && /\s/.test(buffer[i - 1])) i--;
        while (i > 0 && !/\s/.test(buffer[i - 1])) i--;
        buffer = buffer.slice(0, i) + buffer.slice(cursor);
        cursor = i;
        draw();
        return;
      }
      if (str && !key.ctrl && !key.meta) {
        buffer = buffer.slice(0, cursor) + str + buffer.slice(cursor);
        cursor += str.length;
        draw();
      }
    };

    process.stdin.on("keypress", onKey);
  });
}

// ── thinking spinner (with elapsed time) ────────────────────────────────────

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export class Spinner {
  private timer: NodeJS.Timeout | null = null;
  private frame = 0;
  private startedAt = 0;
  private label: string;
  private active = false;

  constructor(label = "Thinking") {
    this.label = label;
  }

  start() {
    if (!process.stdout.isTTY) {
      console.log(chalk.dim(`${this.label}…`));
      return;
    }
    if (this.active) return;
    this.active = true;
    this.startedAt = Date.now();
    this.frame = 0;
    this.timer = setInterval(() => this.render(), 80);
    this.render();
  }

  private render() {
    const elapsed = ((Date.now() - this.startedAt) / 1000).toFixed(1);
    const glyph = SPINNER_FRAMES[this.frame % SPINNER_FRAMES.length];
    this.frame++;
    process.stdout.write(`\r\x1b[2K${chalk.magenta(glyph)} ${chalk.dim(`${this.label}… (${elapsed}s)`)}`);
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    process.stdout.write(`\r\x1b[2K`);
  }
}

// ── flicker-free region redraw (fixes the stacking/"dupe" render bug) ──────

/**
 * Many terminals (notably Windows PowerShell / legacy conhost) don't handle
 * `\x1b[2J\x1b[H` (clear screen + home) reliably — the cursor doesn't
 * actually return to a stable origin, so each re-render prints a *new* copy
 * of the frame below the last one instead of replacing it. That's what
 * caused the repeated session-picker boxes.
 *
 * This redrawer instead remembers how many terminal rows the previous frame
 * used, moves the cursor up that many rows, and clears from there to the
 * end of the screen before drawing the next frame — which works reliably
 * across terminals because it's relative to the cursor's current position,
 * not an absolute "home".
 */
export class RegionRenderer {
  private previousRows = 0;

  /** Render one frame. `draw` should return the number of rows it printed. */
  render(draw: () => number) {
    if (this.previousRows > 0) {
      process.stdout.write(`\x1b[${this.previousRows}A\x1b[0J`);
    }
    this.previousRows = draw();
  }

  /** Clear the last-drawn frame without printing a new one. */
  clear() {
    if (this.previousRows > 0) {
      process.stdout.write(`\x1b[${this.previousRows}A\x1b[0J`);
      this.previousRows = 0;
    }
  }
}

// ── permission confirm prompt ────────────────────────────────────────────────

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
