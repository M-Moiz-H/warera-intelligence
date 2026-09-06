import { env } from "../config/env.js";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeStringify(value: unknown, maxLength = 1_500): string {
  if (typeof value === "string") {
    return value.slice(0, maxLength);
  }

  try {
    const serialized = JSON.stringify(value);
    return serialized.length > maxLength
      ? `${serialized.slice(0, maxLength)}…`
      : serialized;
  } catch {
    return String(value);
  }
}

function extractTrpcError(body: unknown): string | null {
  if (!isRecord(body)) {
    return null;
  }

  const error = body.error;

  if (!isRecord(error)) {
    return null;
  }

  const parts: string[] = [];

  if (typeof error.message === "string") {
    parts.push(error.message);
  }

  if (isRecord(error.data)) {
    const data = error.data;

    if (typeof data.code === "string") {
      parts.push(`code=${data.code}`);
    }

    if (typeof data.httpStatus === "number") {
      parts.push(`httpStatus=${data.httpStatus}`);
    }

    if (typeof data.path === "string") {
      parts.push(`path=${data.path}`);
    }

    if (data.cause !== undefined) {
      parts.push(`cause=${safeStringify(data.cause, 500)}`);
    }
  }

  if (parts.length > 0) {
    return parts.join(" | ");
  }

  return safeStringify(error);
}

export class TrpcClient {
  constructor(
    private readonly base = env.wareraApiBaseUrl,
    private readonly apiKey = env.wareraApiKey
  ) {}

  async get<T>(procedure: string, input: unknown = {}): Promise<T> {
    const base = this.base.replace(/\/$/, "");
    const url = new URL(`${base}/${procedure}`);

    // Always provide an input object. Some WarEra procedures reject undefined.
    url.searchParams.set("input", JSON.stringify(input ?? {}));

    const headers: Record<string, string> = {
      accept: "application/json"
    };

    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    let response: Response;

    try {
      response = await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(15_000)
      });
    } catch (error) {
      throw new Error(
        `${procedure}: request to ${base} failed — ${safeStringify(
          error instanceof Error ? error.message : error
        )}`
      );
    }

    const contentType = response.headers.get("content-type") ?? "";

    let body: unknown;
    let rawText = "";

    try {
      if (contentType.includes("application/json")) {
        body = await response.json();
      } else {
        rawText = await response.text();
        body = rawText;
      }
    } catch (error) {
      throw new Error(
        `${procedure}: ${response.status} ${response.statusText} — failed to parse response from ${base}`
      );
    }

    if (!response.ok) {
      const details =
        extractTrpcError(body) ??
        safeStringify(body ?? rawText);

      throw new Error(
        `${procedure}: ${response.status} ${response.statusText} — ${details}`
      );
    }

    // tRPC can return an error object with a successful HTTP status.
    const trpcError = extractTrpcError(body);

    if (trpcError) {
      throw new Error(
        `${procedure}: tRPC error — ${trpcError}`
      );
    }

    return this.unwrap(body) as T;
  }

  private unwrap(body: unknown): unknown {
    if (Array.isArray(body)) {
      return body.map((item) => this.unwrap(item));
    }

    if (!isRecord(body)) {
      return body;
    }

    // Standard tRPC response:
    // { result: { data: { json: ... } } }
    const result = body.result;

    if (isRecord(result)) {
      const resultData = result.data;

      if (isRecord(resultData) && "json" in resultData) {
        return resultData.json;
      }

      if (resultData !== undefined) {
        return resultData;
      }
    }

    // Alternative response shape:
    // { json: ... }
    if ("json" in body) {
      return body.json;
    }

    // Alternative nested shape:
    // { data: ... }
    if ("data" in body) {
      return body.data;
    }

    return body;
  }
}
