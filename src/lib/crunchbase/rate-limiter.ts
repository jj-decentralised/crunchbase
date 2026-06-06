/**
 * Token-bucket rate limiter to stay safely under Crunchbase's 200 calls/min.
 *
 * Designed for testability: `now` and `sleep` are injectable so tests can drive
 * a virtual clock deterministically without real timers.
 */

export interface RateLimiterOptions {
  /** Max burst capacity (tokens). */
  capacity: number;
  /** Sustained refill rate, tokens per minute. */
  refillPerMinute: number;
  /** Clock source in ms. Defaults to Date.now. */
  now?: () => number;
  /** Sleep fn; should also advance the injected clock in tests. */
  sleep?: (ms: number) => Promise<void>;
}

const realSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export class RateLimiter {
  private tokens: number;
  private readonly capacity: number;
  private readonly refillPerMs: number;
  private lastRefill: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  /** Serializes waiters so concurrent acquirers queue fairly. */
  private chain: Promise<void> = Promise.resolve();

  constructor(opts: RateLimiterOptions) {
    if (opts.capacity <= 0) throw new Error("capacity must be > 0");
    if (opts.refillPerMinute <= 0) throw new Error("refillPerMinute must be > 0");
    this.capacity = opts.capacity;
    this.tokens = opts.capacity;
    this.refillPerMs = opts.refillPerMinute / 60000;
    this.now = opts.now ?? Date.now;
    this.sleep = opts.sleep ?? realSleep;
    this.lastRefill = this.now();
  }

  private refill(): void {
    const t = this.now();
    const elapsed = t - this.lastRefill;
    if (elapsed <= 0) return;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerMs);
    this.lastRefill = t;
  }

  /** Tokens currently available (after refill). Exposed for tests/metrics. */
  available(): number {
    this.refill();
    return this.tokens;
  }

  /** Acquire one token, waiting (and yielding) if necessary. */
  async acquire(): Promise<void> {
    // Queue behind any in-flight acquirers to preserve ordering + fairness.
    const prior = this.chain;
    let release!: () => void;
    this.chain = new Promise<void>((r) => (release = r));
    try {
      await prior;
      // Loop until a token is genuinely available.
      for (;;) {
        this.refill();
        if (this.tokens >= 1) {
          this.tokens -= 1;
          return;
        }
        const deficit = 1 - this.tokens;
        const waitMs = Math.ceil(deficit / this.refillPerMs);
        await this.sleep(waitMs);
      }
    } finally {
      release();
    }
  }
}
