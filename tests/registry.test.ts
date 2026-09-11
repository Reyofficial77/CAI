import { describe, it, expect } from "vitest";
import { getAllTools, getTool, toGeminiFunctionDeclarations } from "../apps/cli/src/agent/registry.js";
import { buildFunctionDeclarations } from "../apps/cli/src/gemini/client.js";

describe("tool registry", () => {
  it("registers all expected tool categories", () => {
    const names = getAllTools().map((t) => t.name);
    expect(names).toContain("read_file");
    expect(names).toContain("run_command");
    expect(names).toContain("inspect_project");
    expect(names).toContain("git_status");
    expect(names).toContain("run_script");
    expect(names).toContain("remember_note");
    expect(names).toContain("set_task_plan");
  });

  it("every registered tool has a unique name", () => {
    const names = getAllTools().map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("getTool resolves a known tool and returns undefined for unknown", () => {
    expect(getTool("read_file")).toBeDefined();
    expect(getTool("does_not_exist")).toBeUndefined();
  });

  it("every tool exposes a valid parameter schema", () => {
    for (const t of getAllTools()) {
      expect(t.parameters.type).toBe("object");
      expect(typeof t.parameters.properties).toBe("object");
    }
  });
});

describe("Gemini schema conversion", () => {
  it("converts JSON-schema-style params into Gemini Type-enum schema", () => {
    const tools = getAllTools();
    const declarations = buildFunctionDeclarations(tools);
    expect(declarations.length).toBe(tools.length);

    const readFileDecl = declarations.find((d) => d.name === "read_file")!;
    expect(readFileDecl.parameters?.type).toBeDefined();
    expect(readFileDecl.parameters?.properties?.path).toBeDefined();
  });

  it("toGeminiFunctionDeclarations produces plain JSON-schema shape (pre-conversion)", () => {
    const decls = toGeminiFunctionDeclarations();
    const readFileDecl = decls.find((d) => d.name === "read_file")!;
    expect(readFileDecl.parameters.type).toBe("object");
  });
});
