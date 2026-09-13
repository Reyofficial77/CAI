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

/**
 * Compact single-line header: name + model in one box row, with the project
 * root and permission mode printed underneath (dim, outside the box) —
 * matching a modern coding-agent CLI rather than a big empty banner.
 */
export function printGreeting(config: CAIConfig, projectRoot: string) {
  const left = chalk.bold.cyanBright("✳ CAI");
  const right = chalk.dim(config.geminiModel);
  const minGap = 3;
  const contentWidth = visibleLength(left) + minGap + visibleLength(right);
  const width = Math.min(termWidth(), contentWidth + 4); // +4 = 1 space padding each side + 2 borders
  const gap = Math.max(minGap, width - 4 - visibleLength(left) - visibleLength(right));
  console.log(chalk.dim("╭" + "─".repeat(width - 2) + "╮"));
  console.log(chalk.dim("│ ") + left + " ".repeat(gap) + right + chalk.dim(" │"));
  console.log(chalk.dim("╰" + "─".repeat(width - 2) + "╯"));
  console.log();
  console.log(chalk.dim(`  ${projectRoot}   ·   ${config.permissionMode}`));
  console.log();
}

export function printSessionLine(id: string) {
  console.log(chalk.dim(`Session: ${id}`));
}

export function printHelp() {
  const rows: [string, string][] = [
    ["/help", "show this list"],
    ["/session", "switch to a previous session"],
    ["/sessionRecovery", "recover a session's history into a new session"],
    ["/clear", "start a fresh conversation in this session"],
    ["/model [name]", "show or change the active model"],
    ["/status", "show model, permission mode, root, and session"],
    ["/doctor", "run basic configuration diagnostics"],
    ["/exit", "leave CAI"],
  ];
  console.log();
  for (const [cmd, desc] of rows) console.log(`  ${chalk.cyan(cmd.padEnd(18))}${chalk.dim(desc)}`);
  console.log();
  console.log(chalk.dim(`  Tip: reference a file with ${chalk.cyan("@path/to/file")} in your message.`));
  console.log();
}

export function printGoodbye() {
  console.log(chalk.cyan("Goodbye!"));
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

// ── prompt (boxed, multiline-capable) ───────────────────────────────────────

function windowForLine(lineText: string, cursorCol: number, contentWidth: number, isActive: boolean): { text: string; offset: number } {
  if (lineText.length <= contentWidth) return { text: lineText, offset: 0 };
  if (!isActive) return { text: lineText.slice(0, Math.max(0, contentWidth - 1)) + "…", offset: 0 };
  let start = Math.max(0, cursorCol - contentWidth + 1);
  if (start + contentWidth > lineText.length) start = lineText.length - contentWidth;
  if (cursorCol < start) start = cursorCol;
  return { text: lineText.slice(start, start + contentWidth), offset: start };
}

/**
 * A rounded input box, redrawn live on every keystroke — both borders stay
 * closed the entire time you're typing. Grows to fit multiple lines: end a
 * line with a trailing `\` (or press Ctrl+J) to insert a newline and keep
 * typing inside the box; a plain Enter submits. Long lines scroll
 * horizontally within the box instead of overflowing it.
 */
export function readPrompt(): Promise<string> {
  return new Promise((resolve) => {
    const width = termWidth();
    const contentWidth = width - 4 - 2; // borders + inner padding, minus the 2-char prefix
    let buffer = "";
    let cursor = 0;
    let firstDraw = true;
    let cursorScreenRow = 0; // absolute row (0-indexed) within the block where the cursor currently sits

    const draw = () => {
      if (!firstDraw) {
        process.stdout.write("\x1b[1G");
        if (cursorScreenRow > 0) process.stdout.write(`\x1b[${cursorScreenRow}A`);
        process.stdout.write("\x1b[0J");
      }
      firstDraw = false;

      const lines = buffer.split("\n");
      const upto = buffer.slice(0, cursor).split("\n");
      const curRow = upto.length - 1;
      const curCol = upto[upto.length - 1].length;

      const top = chalk.dim("╭" + "─".repeat(width - 2) + "╮");
      const bottom = chalk.dim("╰" + "─".repeat(width - 2) + "╯");
      const hint = chalk.dim("  ? for shortcuts");
      let activeOffset = 0;
      const contentRows = lines.map((lineText, i) => {
        const isActive = i === curRow;
        const { text, offset } = windowForLine(lineText, isActive ? curCol : 0, contentWidth, isActive);
        if (isActive) activeOffset = offset;
        const prefix = i === 0 ? chalk.bold.cyan("❯ ") : chalk.dim("  ");
        const padded = text + " ".repeat(Math.max(0, contentWidth - text.length));
        return chalk.dim("│ ") + prefix + padded + chalk.dim(" │");
      });

      process.stdout.write([top, ...contentRows, bottom, hint].join("\n"));

      const lastRowIndex = lines.length + 2; // 0-indexed: top=0, content=1..N, bottom=N+1, hint=N+2
      const targetRow = 1 + curRow;
      const upFromEnd = lastRowIndex - targetRow;
      if (upFromEnd > 0) process.stdout.write(`\x1b[${upFromEnd}A`);
      const caretCol = 2 + 2 + (curCol - activeOffset) + 1; // "│ " + prefix(2) + column, 1-indexed
      process.stdout.write(`\x1b[${caretCol}G`);
      cursorScreenRow = targetRow;
    };

    draw();

    readline.emitKeypressEvents(process.stdin);
    process.stdin.resume();
    process.stdin.setRawMode?.(true);

    const finish = (submit: boolean) => {
      process.stdin.off("keypress", onKey);
      if (process.stdin.isRaw) process.stdin.setRawMode?.(false);
      const lines = buffer.split("\n");
      const lastRowIndex = lines.length + 2;
      const downMoves = lastRowIndex - cursorScreenRow;
      process.stdout.write("\x1b[1G");
      if (downMoves > 0) process.stdout.write(`\x1b[${downMoves}B`);
      process.stdout.write("\x1b[2K"); // drop the hint line, leave the closed box as a permanent record
      if (submit) resolve(buffer);
    };

    const insertNewline = () => {
      buffer = buffer.slice(0, cursor) + "\n" + buffer.slice(cursor);
      cursor += 1;
      draw();
    };

    const moveVertical = (dir: 1 | -1) => {
      const lines = buffer.split("\n");
      const upto = buffer.slice(0, cursor).split("\n");
      const row = upto.length - 1;
      const col = upto[upto.length - 1].length;
      const newRow = row + dir;
      if (newRow < 0 || newRow >= lines.length) return;
      const newCol = Math.min(col, lines[newRow].length);
      let idx = 0;
      for (let i = 0; i < newRow; i++) idx += lines[i].length + 1;
      cursor = idx + newCol;
      draw();
    };

    const onKey = (str: string | undefined, key: readline.Key) => {
      if (key.ctrl && key.name === "c") { finish(false); process.exit(0); }
      if (key.name === "return" || key.name === "enter") {
        if (cursor === buffer.length && buffer.endsWith("\\")) {
          buffer = buffer.slice(0, -1);
          cursor = buffer.length;
          insertNewline();
          return;
        }
        finish(true);
        return;
      }
      if (key.ctrl && key.name === "j") { insertNewline(); return; }
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
      if (key.name === "up") { moveVertical(-1); return; }
      if (key.name === "down") { moveVertical(1); return; }
      if (key.name === "home" || (key.ctrl && key.name === "a")) {
        const upto = buffer.slice(0, cursor);
        cursor = upto.lastIndexOf("\n") + 1;
        draw();
        return;
      }
      if (key.name === "end" || (key.ctrl && key.name === "e")) {
        const rest = buffer.slice(cursor);
        const nl = rest.indexOf("\n");
        cursor = nl === -1 ? buffer.length : cursor + nl;
        draw();
        return;
      }
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

  setLabel(label: string) {
    this.label = label;
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
