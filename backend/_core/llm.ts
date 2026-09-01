export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = { type: "text"; text: string };
export type ImageContent = { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };
export type FileContent = { type: "file_url"; file_url: { url: string; mime_type?: string } };
export type MessageContent = string | TextContent | ImageContent | FileContent;
export type Message = { role: Role; content: MessageContent | MessageContent[]; name?: string; tool_call_id?: string };
export type Tool = { type: "function"; function: { name: string; description?: string; parameters?: Record<string, unknown> } };
export type ToolChoice = "none" | "auto" | "required" | { name: string } | { type: "function"; function: { name: string } };
export type JsonSchema = { name: string; schema: Record<string, unknown>; strict?: boolean };
export type OutputSchema = JsonSchema;
export type ResponseFormat = { type: "text" } | { type: "json_object" } | { type: "json_schema"; json_schema: JsonSchema };

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  model?: string;
  thinking?: Record<string, unknown>;
  reasoning?: Record<string, unknown>;
};

export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: Role; content: string | Array<TextContent | ImageContent | FileContent> | null; tool_calls?: ToolCall[] };
    finish_reason: string | null;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

const DEFAULT_MODEL = "gemini-3-flash-preview";

function endpoint() {
  const base = process.env.BUILT_IN_FORGE_API_URL;
  const key = process.env.BUILT_IN_FORGE_API_KEY;
  if (!base || !key) throw new Error("Manus built-in LLM service is not configured");
  return { url: `${base.replace(/\/$/, "")}/v1/chat/completions`, key };
}

function normalizeParams(params: InvokeParams) {
  const responseFormat = params.response_format ?? params.responseFormat ?? (params.output_schema || params.outputSchema ? {
    type: "json_schema" as const,
    json_schema: params.output_schema ?? params.outputSchema!,
  } : undefined);
  return {
    model: params.model ?? DEFAULT_MODEL,
    messages: params.messages,
    ...(params.tools ? { tools: params.tools } : {}),
    ...(params.tool_choice || params.toolChoice ? { tool_choice: params.tool_choice ?? params.toolChoice } : {}),
    ...(params.max_tokens || params.maxTokens ? { max_tokens: params.max_tokens ?? params.maxTokens } : {}),
    ...(responseFormat ? { response_format: responseFormat } : {}),
    ...(params.thinking ? { thinking: params.thinking } : {}),
    ...(params.reasoning ? { reasoning: params.reasoning } : {}),
  };
}

async function request(path: string, init?: RequestInit) {
  const { url, key } = endpoint();
  const target = path ? `${url.replace(/\/chat\/completions$/, "")}${path}` : url;
  const response = await fetch(target, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await response.text();
  let parsed: unknown;
  try { parsed = body ? JSON.parse(body) : {}; } catch { parsed = { error: body }; }
  if (!response.ok) {
    const detail = typeof parsed === "object" && parsed && "error" in parsed ? String((parsed as { error: unknown }).error) : response.statusText;
    throw new Error(`Built-in LLM request failed (${response.status}): ${detail}`);
  }
  return parsed as InvokeResult;
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  return request("", { method: "POST", body: JSON.stringify(normalizeParams(params)) });
}

export type ModelInfo = { id: string; object: string; created: number; owned_by: string; pricing?: unknown; capabilities?: unknown };
export type ModelsResponse = { object: string; data: ModelInfo[] };

export async function listLLMModels(): Promise<ModelsResponse> {
  return request("/models", { method: "GET" }) as unknown as Promise<ModelsResponse>;
}
