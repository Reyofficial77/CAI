import fs from "node:fs/promises";
import path from "node:path";
import type { ToolDefinition } from "../../types/index.js";

const INDICATORS: Record<string, string> = {
  "package.json": "Node.js / JavaScript / TypeScript",
  "package-lock.json": "npm",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
  "requirements.txt": "Python (pip)",
  "pyproject.toml": "Python (poetry/pep517)",
  "tsconfig.json": "TypeScript",
  "vite.config.ts": "Vite",
  "vite.config.js": "Vite",
  "Cargo.toml": "Rust",
  "CMakeLists.txt": "C/C++ (CMake)",
  "go.mod": "Go",
  "project.godot": "Godot Engine",
  "Assets": "Unity (heuristic)",
};

export const inspectProjectTool: ToolDefinition<{}> = {
  name: "inspect_project",
  description:
    "Inspect the project root to determine project type, languages, framework, package manager, and structure.",
  permission: "SAFE",
  parameters: { type: "object", properties: {} },
  async execute(_input, ctx) {
    try {
      const entries = await fs.readdir(ctx.projectRoot, { withFileTypes: true });
      const names = entries.map((e) => e.name);
      const detected: string[] = [];

      for (const [file, label] of Object.entries(INDICATORS)) {
        if (names.includes(file)) detected.push(`${file} -> ${label}`);
      }

      let packageJson: any = null;
      if (names.includes("package.json")) {
        try {
          const raw = await fs.readFile(path.join(ctx.projectRoot, "package.json"), "utf-8");
          packageJson = JSON.parse(raw);
        } catch {
          // ignore malformed package.json
        }
      }

      const hasGit = names.includes(".git");
      const topLevel = names.filter((n) => n !== "node_modules" && n !== ".git");

      const summary = {
        projectRoot: ctx.projectRoot,
        detectedIndicators: detected,
        topLevelEntries: topLevel.sort(),
        hasGit,
        packageInfo: packageJson
          ? {
              name: packageJson.name,
              version: packageJson.version,
              scripts: packageJson.scripts,
              dependencies: Object.keys(packageJson.dependencies ?? {}),
              devDependencies: Object.keys(packageJson.devDependencies ?? {}),
            }
          : null,
      };

      return { success: true, output: JSON.stringify(summary, null, 2) };
    } catch (err: any) {
      return { success: false, output: "", error: err.message };
    }
  },
};

export const getCurrentDirectoryTool: ToolDefinition<{}> = {
  name: "get_current_directory",
  description: "Return the current project root directory.",
  permission: "SAFE",
  parameters: { type: "object", properties: {} },
  async execute(_input, ctx) {
    return { success: true, output: ctx.projectRoot };
  },
};

export const analyzeCodebaseTool: ToolDefinition<{}> = {
  name: "analyze_codebase",
  description:
    "Run deeper static analysis: file/line counts per language across the whole project, and a scan for TODO/FIXME/HACK comments. Slower than inspect_project — use when the user asks for codebase stats or a TODO list.",
  permission: "SAFE",
  parameters: { type: "object", properties: {} },
  async execute(_input, ctx) {
    const { spawn } = await import("node:child_process");
    const path = await import("node:path");
    // Resolve the analyzer relative to this compiled file, walking up to the package root.
    const scriptPath = path.resolve(import.meta.dirname, "../../../../../../python/cai_analyze/analyze.py");

    return new Promise((resolve) => {
      const child = spawn("python3", [scriptPath, ctx.projectRoot]);
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d) => (stdout += d.toString()));
      child.stderr.on("data", (d) => (stderr += d.toString()));
      child.on("close", (code) => {
        if (code !== 0) {
          resolve({ success: false, output: "", error: stderr || `analyzer exited with code ${code}` });
          return;
        }
        resolve({ success: true, output: stdout.trim() });
      });
      child.on("error", (err) => resolve({ success: false, output: "", error: err.message }));
    });
  },
};

export const projectTools = [inspectProjectTool, getCurrentDirectoryTool, analyzeCodebaseTool];
