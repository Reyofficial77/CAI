export type PermissionLevel = "SAFE" | "WARNING" | "DANGEROUS" | "RESTRICTED";

export type PermissionMode =
  | "ask-every-time"
  | "ask-dangerous-only"
  | "trusted"
  | "read-only";

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  meta?: Record<string, unknown>;
}

export interface ToolDefinition<TInput = any> {
  name: string;
  description: string;
  permission: PermissionLevel;
  /** JSON schema (Gemini function-calling compatible) describing the input */
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (input: TInput, ctx: ExecutionContext) => Promise<ToolResult>;
}

export interface ExecutionContext {
  projectRoot: string;
  cwd: string;
  permissionMode: PermissionMode;
  confirm: (message: string, level: PermissionLevel) => Promise<boolean>;
  log: (line: string) => void;
}

export interface CAIConfig {
  geminiApiKey?: string;
  geminiModel: string;
  permissionMode: PermissionMode;
  theme: "default" | "minimal";
  commandTimeoutMs: number;
  workingDirectory?: string;
  loggingEnabled: boolean;
}
