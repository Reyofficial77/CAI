import { GoogleGenAI, Type } from "@google/genai";
import type { Content, FunctionDeclaration } from "@google/genai";
import { getAllTools } from "../agent/registry.js";
import type { ToolDefinition } from "../types/index.js";

/** Converts our plain-JSON-schema tool params into Gemini's Type-enum schema format. */
function convertSchema(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;

  const typeMap: Record<string, Type> = {
    object: Type.OBJECT,
    string: Type.STRING,
    number: Type.NUMBER,
    boolean: Type.BOOLEAN,
    array: Type.ARRAY,
    integer: Type.INTEGER,
  };

  const out: any = {};
  if (schema.type) out.type = typeMap[schema.type] ?? Type.STRING;
  if (schema.description) out.description = schema.description;
  if (schema.required) out.required = schema.required;
  if (schema.properties) {
    out.properties = {};
    for (const [key, val] of Object.entries(schema.properties)) {
      out.properties[key] = convertSchema(val);
    }
  }
  if (schema.items) out.items = convertSchema(schema.items);
  return out;
}

export function buildFunctionDeclarations(tools: ToolDefinition[]): FunctionDeclaration[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: convertSchema(t.parameters),
  }));
}

export interface GeminiClientOptions {
  apiKey: string;
  model: string;
}

export class GeminiClient {
  private ai: GoogleGenAI;
  private model: string;
  private history: Content[] = [];
  private systemInstruction: string;

  constructor(opts: GeminiClientOptions, systemInstruction: string) {
    if (!opts.apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Configure it via the environment variable or `cai config`."
      );
    }
    this.ai = new GoogleGenAI({ apiKey: opts.apiKey });
    this.model = opts.model;
    this.systemInstruction = systemInstruction;
  }

  resetHistory() {
    this.history = [];
  }

  pushUserText(text: string) {
    this.history.push({ role: "user", parts: [{ text }] });
  }

  pushFunctionResponses(responses: { name: string; response: Record<string, unknown> }[]) {
    this.history.push({
      role: "user",
      parts: responses.map((r) => ({
        functionResponse: { name: r.name, response: r.response },
      })),
    });
  }

  /**
   * Sends the current history to Gemini and returns the response.
   * The caller inspects response.functionCalls / response.text and decides
   * whether to execute tools and loop again.
   */
  async send() {
    const tools = getAllTools();
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: this.history,
      config: {
        systemInstruction: this.systemInstruction,
        tools: [{ functionDeclarations: buildFunctionDeclarations(tools) }],
      },
    });

    // Append the model's turn (including any function calls) to history
    // so subsequent turns retain full context.
    const candidateContent = response.candidates?.[0]?.content;
    if (candidateContent) {
      this.history.push(candidateContent);
    }

    return response;
  }

  async *stream() {
    const tools = getAllTools();
    const stream = await this.ai.models.generateContentStream({
      model: this.model,
      contents: this.history,
      config: {
        systemInstruction: this.systemInstruction,
        tools: [{ functionDeclarations: buildFunctionDeclarations(tools) }],
      },
    });

    let lastCandidateContent: Content | undefined;
    for await (const chunk of stream) {
      if (chunk.candidates?.[0]?.content) {
        lastCandidateContent = chunk.candidates[0].content;
      }
      yield chunk;
    }
    if (lastCandidateContent) {
      this.history.push(lastCandidateContent);
    }
  }
}
