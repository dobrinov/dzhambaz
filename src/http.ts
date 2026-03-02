const DEFAULT_DELAY_MS = 1500;
const DEFAULT_MAX_RETRIES = 2;
const RATE_LIMIT_WAIT_MS = 10_000;

const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept-Language': 'bg,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function detectCharsetFromHeader(contentType: string | null): string | null {
  if (!contentType) return null;
  const match = contentType.match(/charset=([^\s;]+)/i);
  return match ? match[1].toLowerCase() : null;
}

function detectCharsetFromHtml(bytes: Uint8Array): string | null {
  // Quick scan of first 2KB for <meta charset=...> or <meta http-equiv="Content-Type" content="...charset=...">
  const head = new TextDecoder('ascii').decode(bytes.slice(0, 2048));
  const match = head.match(/charset=([^\s;"']+)/i);
  return match ? match[1].toLowerCase() : null;
}

export class HttpClient {
  private delayMs: number;
  private maxRetries: number;
  private lastRequestTime = 0;

  constructor(options?: { delayMs?: number; maxRetries?: number }) {
    this.delayMs = options?.delayMs ?? DEFAULT_DELAY_MS;
    this.maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  private async rateLimit(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.delayMs) {
      await sleep(this.delayMs - elapsed);
    }
    this.lastRequestTime = Date.now();
  }

  async fetchPage(url: string, options?: { method?: string; body?: string; headers?: Record<string, string>; followRedirect?: boolean }): Promise<{ html: string; url: string; status: number }> {
    await this.rateLimit();

    const method = options?.method ?? 'GET';
    const headers = { ...DEFAULT_HEADERS, ...options?.headers };
    const redirect = options?.followRedirect === false ? 'manual' as const : 'follow' as const;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: options?.body,
          redirect,
        });

        if (response.status === 429) {
          process.stderr.write(`[http] 429 rate limited, waiting ${RATE_LIMIT_WAIT_MS}ms...\n`);
          await sleep(RATE_LIMIT_WAIT_MS);
          continue;
        }

        if (redirect === 'manual' && (response.status === 301 || response.status === 302)) {
          const location = response.headers.get('location') ?? '';
          return { html: '', url: location, status: response.status };
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} for ${url}`);
        }

        const contentType = response.headers.get('content-type');
        let charset = detectCharsetFromHeader(contentType);
        const buffer = await response.arrayBuffer();
        let html: string;

        // If header doesn't specify charset, check HTML meta tags
        if (!charset) {
          charset = detectCharsetFromHtml(new Uint8Array(buffer));
        }

        if (charset && charset !== 'utf-8' && charset !== 'utf8') {
          const decoder = new TextDecoder(charset);
          html = decoder.decode(buffer);
        } else {
          html = new TextDecoder('utf-8').decode(buffer);
        }

        return { html, url: response.url, status: response.status };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.maxRetries) {
          const backoff = Math.pow(2, attempt) * 1000;
          process.stderr.write(`[http] Retry ${attempt + 1}/${this.maxRetries} for ${url} in ${backoff}ms\n`);
          await sleep(backoff);
        }
      }
    }

    throw lastError ?? new Error(`Failed to fetch ${url}`);
  }
}
