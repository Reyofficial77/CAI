import { GoogleGenAI, Type } from "@google/genai";
import type { Content, FunctionCall, FunctionDeclaration } from "@google/genai";
import { getAllTools } from "../agent/registry.js";
import type { ToolDefinition } from "../types/index.js";

function convertSchema(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;
  const typeMap: Record<string, Type> = { object: Type.OBJECT, string: Type.STRING, number: Type.NUMBER, boolean: Type.BOOLEAN, array: Type.ARRAY, integer: Type.INTEGER };
  const out: any = {};
  if (schema.type) out.type = typeMap[schema.type] ?? Type.STRING;
  if (schema.description) out.description = schema.description;
  if (schema.required) out.required = schema.required;
  if (schema.properties) {
    out.properties = {};
    for (const [key, val] of Object.entries(schema.properties)) out.properties[key] = convertSchema(val);
  }
  if (schema.items) out.items = convertSchema(schema.items);
  return out;
}

export function buildFunctionDeclarations(tools: ToolDefinition[]): FunctionDeclaration[] {
  return tools.map((t) => ({ name: t.name, description: t.description, parameters: convertSchema(t.parameters) }));
}

export interface GeminiClientOptions { apiKey: string; model: string; }
export interface GeminiResponse { text: string; functionCalls: FunctionCall[]; }

export class GeminiClient {
  private ai: GoogleGenAI;
  private model: string;
  private history: Content[] = [];
  private systemInstruction: string;

  constructor(opts: GeminiClientOptions, systemInstruction: string) {
    if (!opts.apiKey) throw new Error("GEMINI_API_KEY is not set. Configure it via the environment variable or `cai config`.");
    this.ai = new GoogleGenAI({ apiKey: opts.apiKey });
    this.model = opts.model;
    this.systemInstruction = systemInstruction;
  }

  resetHistory() { this.history = []; }
  getHistory(): Content[] { return structuredClone(this.history); }
  loadHistory(history: Content[]) { this.history = structuredClone(history); }
  pushUserText(text: string) { this.history.push({ role: "user", parts: [{ text }] }); }
  pushFunctionResponses(responses: { name: string; response: Record<string, unknown> }[]) {
    this.history.push({ role: "user", parts: responses.map((r) => ({ functionResponse: { name: r.name, response: r.response } })) });
  }

  async send(): Promise<GeminiResponse> {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: this.history,
      config: { systemInstruction: this.systemInstruction, tools: [{ functionDeclarations: buildFunctionDeclarations(getAllTools()) }] },
    });
    const candidateContent = response.candidates?.[0]?.content;
    if (candidateContent) this.history.push(candidateContent);
    const parts = candidateContent?.parts ?? [];
    const text = parts.filter((part) => typeof part.text === "string").map((part) => part.text ?? "").join("");
    const functionCalls = parts.filter((part): part is typeof part & { functionCall: FunctionCall } => !!part.functionCall).map((part) => part.functionCall);
    return { text, functionCalls };
  }
}
