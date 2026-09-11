import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ExecutionContext } from "../apps/cli/src/types/index.js";
import { runCommandTool } from "../apps/cli/src/tools/terminal/index.js";

let tmpDir: string;
let ctx: ExecutionContext;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cai-test-cmd-"));
  ctx = {
    projectRoot: tmpDir,
    cwd: tmpDir,
    permissionMode: "trusted",
    confirm: async () => true,
    log: () => {},
  };
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("run_command — real subprocess execution", () => {
  it("captures real stdout and exit code", async () => {
    const result = await runCommandTool.execute({ command: "echo hi-from-test" }, ctx);
    expect(result.success).toBe(true);
    expect(result.output).toBe("hi-from-test");
    expect((result.meta as any).exitCode).toBe(0);
  });

  it("captures a non-zero exit code as failure", async () => {
    const result = await runCommandTool.execute({ command: "exit 1" }, ctx);
    expect(result.success).toBe(false);
  });

  it("runs inside the project root cwd", async () => {
    const result = await runCommandTool.execute({ command: "pwd" }, ctx);
    expect(result.output.trim()).toBe(tmpDir);
  });

  it("blocks restricted commands without executing them", async () => {
    const result = await runCommandTool.execute({ command: "rm -rf /" }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/blocked/i);
  });

  it("respects read-only permission mode", async () => {
    const readOnlyCtx: ExecutionContext = { ...ctx, permissionMode: "read-only" };
    const result = await runCommandTool.execute({ command: "echo test" }, readOnlyCtx);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/read-only/);
  });
});
