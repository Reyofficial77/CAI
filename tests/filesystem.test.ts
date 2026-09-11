import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ExecutionContext } from "../apps/cli/src/types/index.js";
import { filesystemTools } from "../apps/cli/src/tools/filesystem/index.js";
import { resolveSafePath, PathSecurityError } from "../apps/cli/src/tools/filesystem/paths.js";

let tmpDir: string;
let ctx: ExecutionContext;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cai-test-"));
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

function tool(name: string) {
  const t = filesystemTools.find((t) => t.name === name);
  if (!t) throw new Error(`tool not found: ${name}`);
  return t;
}

describe("path security", () => {
  it("resolves paths inside the root", () => {
    expect(resolveSafePath(tmpDir, "foo.txt")).toBe(path.join(tmpDir, "foo.txt"));
  });

  it("rejects traversal outside the root", () => {
    expect(() => resolveSafePath(tmpDir, "../../etc/passwd")).toThrow(PathSecurityError);
  });

  it("rejects absolute paths outside the root", () => {
    expect(() => resolveSafePath(tmpDir, "/etc/passwd")).toThrow(PathSecurityError);
  });
});

describe("filesystem tools — real disk I/O", () => {
  it("create_file writes a real file and verifies it", async () => {
    const result = await tool("create_file").execute({ path: "a.txt", content: "hello" }, ctx);
    expect(result.success).toBe(true);
    const onDisk = await fs.readFile(path.join(tmpDir, "a.txt"), "utf-8");
    expect(onDisk).toBe("hello");
  });

  it("create_file fails if file already exists", async () => {
    await tool("create_file").execute({ path: "a.txt", content: "hello" }, ctx);
    const result = await tool("create_file").execute({ path: "a.txt", content: "again" }, ctx);
    expect(result.success).toBe(false);
  });

  it("read_file returns real content", async () => {
    await fs.writeFile(path.join(tmpDir, "b.txt"), "world");
    const result = await tool("read_file").execute({ path: "b.txt" }, ctx);
    expect(result.success).toBe(true);
    expect(result.output).toBe("world");
  });

  it("read_file fails cleanly on missing file", async () => {
    const result = await tool("read_file").execute({ path: "missing.txt" }, ctx);
    expect(result.success).toBe(false);
  });

  it("edit_file requires a unique match", async () => {
    await fs.writeFile(path.join(tmpDir, "c.txt"), "foo foo");
    const result = await tool("edit_file").execute({ path: "c.txt", find: "foo", replace: "bar" }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not unique/);
  });

  it("edit_file performs a targeted replace", async () => {
    await fs.writeFile(path.join(tmpDir, "d.txt"), "hello world");
    const result = await tool("edit_file").execute({ path: "d.txt", find: "world", replace: "there" }, ctx);
    expect(result.success).toBe(true);
    const onDisk = await fs.readFile(path.join(tmpDir, "d.txt"), "utf-8");
    expect(onDisk).toBe("hello there");
  });

  it("delete_file actually removes the file", async () => {
    await fs.writeFile(path.join(tmpDir, "e.txt"), "bye");
    const result = await tool("delete_file").execute({ path: "e.txt" }, ctx);
    expect(result.success).toBe(true);
    await expect(fs.access(path.join(tmpDir, "e.txt"))).rejects.toThrow();
  });

  it("create_directory makes nested dirs", async () => {
    const result = await tool("create_directory").execute({ path: "nested/deep/dir" }, ctx);
    expect(result.success).toBe(true);
    const stat = await fs.stat(path.join(tmpDir, "nested/deep/dir"));
    expect(stat.isDirectory()).toBe(true);
  });

  it("move_file relocates a real file", async () => {
    await fs.writeFile(path.join(tmpDir, "src.txt"), "content");
    const result = await tool("move_file").execute({ from: "src.txt", to: "moved/dest.txt" }, ctx);
    expect(result.success).toBe(true);
    const onDisk = await fs.readFile(path.join(tmpDir, "moved/dest.txt"), "utf-8");
    expect(onDisk).toBe("content");
  });

  it("list_directory reflects real directory contents", async () => {
    await fs.writeFile(path.join(tmpDir, "one.txt"), "");
    await fs.mkdir(path.join(tmpDir, "sub"));
    const result = await tool("list_directory").execute({ path: "." }, ctx);
    expect(result.output).toContain("one.txt");
    expect(result.output).toContain("sub/");
  });

  it("blocks file operations that escape the project root", async () => {
    const result = await tool("read_file").execute({ path: "../../../../etc/passwd" }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Access denied/);
  });
});
