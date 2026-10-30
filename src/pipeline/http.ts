/**
 * Polite HTTP client for the data pipeline: identifies itself, rate-limits per
 * host, retries transient failures with backoff and never follows a failed
 * response as if it were data.
 */

export class SourceUnavailableError extends Error {
  constructor(
    message: string,
    readonly url: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "SourceUnavailableError";
  }
}

export class InvalidResponseError extends Error {
  constructor(
    message: string,
    readonly url: string,
  ) {
    super(message);
    this.name = "InvalidResponseError";
  }
}

export interface HttpClientOptions {
  /** Minimum delay between two requests to the same host. */
  minIntervalMs?: number;
  retries?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export interface GetOptions {
  accept?: string;
  /** Reject bodies smaller than this (guards against truncated or empty responses). */
  minBytes?: number;
  expectContentType?: RegExp;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const PROJECT_URL = "https://github.com/ivangarmar22/EspanaIndustrial";

/** Wikimedia's User-Agent policy requires a way to contact the operator. */
export function userAgent(): string {
  const contact = process.env.DATA_CONTACT?.trim() || PROJECT_URL;
  return `EspanaIndustrialBot/0.1 (${contact}) heritage-atlas-pipeline`;
}

export class HttpClient {
  private readonly lastRequestAt = new Map<string, number>();
  private readonly minIntervalMs: number;
  private readonly retries: number;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(opts: HttpClientOptions = {}) {
    this.minIntervalMs = opts.minIntervalMs ?? 1000;
    this.retries = opts.retries ?? 3;
    this.timeoutMs = opts.timeoutMs ?? 60_000;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.sleep = opts.sleep ?? defaultSleep;
  }

  async getBytes(url: string, opts: GetOptions = {}): Promise<{ body: Uint8Array; contentType: string }> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      await this.throttle(url);
      try {
        const res = await this.fetchImpl(url, {
          headers: { "User-Agent": userAgent(), Accept: opts.accept ?? "*/*" },
          signal: AbortSignal.timeout(this.timeoutMs),
          redirect: "follow",
        });
        if (res.status === 429 || res.status >= 500) {
          const retryAfter = Number(res.headers.get("retry-after"));
          lastError = new SourceUnavailableError(`HTTP ${res.status}`, url, res.status);
          await this.sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * 2 ** attempt);
          continue;
        }
        if (!res.ok) throw new SourceUnavailableError(`HTTP ${res.status}`, url, res.status);
        const contentType = res.headers.get("content-type") ?? "";
        const body = new Uint8Array(await res.arrayBuffer());
        if (opts.expectContentType && !opts.expectContentType.test(contentType)) {
          throw new InvalidResponseError(`Unexpected content-type "${contentType}"`, url);
        }
        if (opts.minBytes && body.byteLength < opts.minBytes) {
          throw new InvalidResponseError(`Response too small (${body.byteLength} bytes)`, url);
        }
        return { body, contentType };
      } catch (err) {
        if (err instanceof InvalidResponseError) throw err;
        if (err instanceof SourceUnavailableError && err.status && err.status < 500 && err.status !== 429) throw err;
        lastError = err;
        if (attempt < this.retries) await this.sleep(2000 * 2 ** attempt);
      }
    }
    if (lastError instanceof SourceUnavailableError) throw lastError;
    throw new SourceUnavailableError(`Request failed: ${String(lastError)}`, url);
  }

  async getText(url: string, opts: GetOptions = {}): Promise<string> {
    const { body } = await this.getBytes(url, opts);
    return new TextDecoder("utf-8").decode(body);
  }

  async getJson<T = unknown>(url: string, opts: GetOptions = {}): Promise<T> {
    const text = await this.getText(url, { accept: "application/json", ...opts });
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new InvalidResponseError("Body is not valid JSON", url);
    }
  }

  private async throttle(url: string): Promise<void> {
    const host = new URL(url).host;
    const last = this.lastRequestAt.get(host);
    if (last !== undefined) {
      const wait = last + this.minIntervalMs - Date.now();
      if (wait > 0) await this.sleep(wait);
    }
    this.lastRequestAt.set(host, Date.now());
  }
}
