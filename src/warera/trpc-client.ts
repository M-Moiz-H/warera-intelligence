import { env } from "../config/env.js";

export class TrpcClient {
  constructor(
    private readonly base = env.wareraApiBaseUrl,
    private readonly apiKey = env.wareraApiKey
  ) {}

  async get<T>(procedure: string, input?: unknown): Promise<T> {
    const url = new URL(`${this.base.replace(/\/$/, "")}/${procedure}`);
    if (input !== undefined) url.searchParams.set("input", JSON.stringify(input));
    const headers: Record<string, string> = { accept: "application/json" };
    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`${procedure}: ${response.status} ${response.statusText}${text ? ` — ${text.slice(0, 180)}` : ""}`);
    }
    return this.unwrap(await response.json()) as T;
  }

  private unwrap(body: any): unknown {
    if (Array.isArray(body)) return body.map((x) => this.unwrap(x));
    if (body?.result?.data?.json !== undefined) return body.result.data.json;
    if (body?.result?.data !== undefined) return body.result.data;
    if (body?.json !== undefined) return body.json;
    return body;
  }
}
