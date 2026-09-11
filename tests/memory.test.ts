import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ExecutionContext } from "../apps/cli/src/types/index.js";
import { rememberNoteTool, recallMemoryTool } from "../apps/cli/src/tools/memory/index.js";

let tmpDir: string;
let ctx: ExecutionContext;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cai-test-mem-"));
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

describe("remember_note", () => {
  it("saves a normal note to real disk", async () => {
    const result = await rememberNoteTool.execute({ note: "Uses ESM modules throughout." }, ctx);
    expect(result.success).toBe(true);
    const recall = await recallMemoryTool.execute({}, ctx);
    expect(recall.output).toContain("Uses ESM modules throughout.");
  });

  it.each([
    "API key is sk-12345",
    "the api_key is stored elsewhere",
    "don't forget the secret sauce recipe",
    "password: hunter2",
    "auth token abc123",
  ])("refuses to store a note containing credentials: %s", async (note) => {
    const result = await rememberNoteTool.execute({ note }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/secrets or credentials/);
  });
});
