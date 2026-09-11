import { describe, it, expect } from "vitest";
import { classifyCommand } from "../apps/cli/src/tools/terminal/security.js";

describe("command classification", () => {
  it("classifies safe commands", () => {
    expect(classifyCommand("ls -la")).toBe("SAFE");
    expect(classifyCommand("echo hello")).toBe("SAFE");
    expect(classifyCommand("node server.js")).toBe("SAFE");
  });

  it("classifies warning-level commands", () => {
    expect(classifyCommand("npm install")).toBe("WARNING");
    expect(classifyCommand("pip install pygame")).toBe("WARNING");
    expect(classifyCommand("git commit -m 'x'")).toBe("WARNING");
  });

  it("classifies dangerous commands", () => {
    expect(classifyCommand("rm -rf ./build")).toBe("DANGEROUS");
    expect(classifyCommand("git push --force")).toBe("DANGEROUS");
    expect(classifyCommand("git reset --hard HEAD~3")).toBe("DANGEROUS");
    expect(classifyCommand("sudo apt install foo")).toBe("DANGEROUS");
  });

  it("classifies restricted commands and blocks them outright", () => {
    expect(classifyCommand("rm -rf /")).toBe("RESTRICTED");
    expect(classifyCommand("format c:")).toBe("RESTRICTED");
    expect(classifyCommand("shutdown now")).toBe("RESTRICTED");
  });
});
