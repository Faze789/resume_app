type RetryOptions = {
  maxAttempts?: number;
  delayMs?: number;
  backoff?: 'linear' | 'exponential';
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = 2, delayMs = 2000, backoff = 'exponential' } = options;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (attempt < maxAttempts) {
        const wait = backoff === 'exponential' ? delayMs * Math.pow(2, attempt - 1) : delayMs;
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }

  throw lastError;
}
