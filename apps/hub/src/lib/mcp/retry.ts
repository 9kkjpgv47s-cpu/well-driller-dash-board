/**
 * Small retry helper for MCP tool data loads. The DNR registry load can fail
 * once on a cold server start (chunk files still being parsed / timeout race);
 * one or two quick retries usually land on the warmed cache.
 */
export type RetryOptions = {
  /** Number of *additional* attempts after the first. Default 2 (3 tries total). */
  retries?: number;
  /** Base delay between attempts. Default 400ms. */
  delayMs?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const retries = Math.max(0, options.retries ?? 2);
  const delayMs = Math.max(0, options.delayMs ?? 400);
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries && delayMs > 0) await sleep(delayMs);
    }
  }
  throw lastErr;
}
