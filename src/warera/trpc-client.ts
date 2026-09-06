import { env } from "../config/env.js";

export class TrpcClient {
  constructor(
    private readonly base = env.wareraApiBaseUrl,
    private readonly apiKey = env.wareraApiKey
  ) {}

  async get<T>(procedure: string, input: unknown = {}): Promise<T> {
    const base = this.base.replace(/\/$/, "");
    const url = new URL(`${base}/${procedure}`);

    // WarEra tRPC procedures expect an input object.
    url.searchParams.set("input", JSON.stringify(input ?? {}));

    const headers: Record<string, string> = {
      accept: "application/json"
    };

    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(15_000)
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");

      throw new Error(
        `${procedure}: ${response.status} ${response.statusText}` +
          (text ? ` — ${text.slice(0, 300)}` : "")
      );
    }

    const body = await response.json();
    return this.unwrap(body) as T;
  }

  private unwrap(body: unknown): unknown {
    if (Array.isArray(body)) {
      return body.map((item) => this.unwrap(item));
    }

    if (!body || typeof body !== "object") {
      return body;
    }

    const data = body as Record<string, unknown>;

    const result = data.result;
    if (result && typeof result === "object") {
      const resultData = (result as Record<string, unknown>).data;

      if (resultData && typeof resultData === "object") {
        const resultRecord = resultData as Record<string, unknown>;

        if ("json" in resultRecord) {
          return resultRecord.json;
        }
      }

      if (resultData !== undefined) {
        return resultData;
      }
    }

    if ("json" in data) {
      return data.json;
    }

    return body;
  }
}
