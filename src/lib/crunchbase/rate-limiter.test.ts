import { describe, it, expect } from "vitest";
import { RateLimiter } from "./rate-limiter";

/** Virtual clock whose sleep advances time deterministically. */
function virtualClock() {
  let t = 0;
  return {
    now: () => t,
    sleep: async (ms: number) => {
      t += ms;
    },
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("RateLimiter", () => {
  it("allows immediate acquires up to capacity", async () => {
    const clock = virtualClock();
    const rl = new RateLimiter({
      capacity: 3,
      refillPerMinute: 60,
      now: clock.now,
      sleep: clock.sleep,
    });
    await rl.acquire();
    await rl.acquire();
    await rl.acquire();
    expect(clock.now()).toBe(0); // no waiting yet
  });

  it("waits to refill once capacity is exhausted", async () => {
    const clock = virtualClock();
    // 60/min => 1 token/sec.
    const rl = new RateLimiter({
      capacity: 1,
      refillPerMinute: 60,
      now: clock.now,
      sleep: clock.sleep,
    });
    await rl.acquire(); // uses the only token at t=0
    await rl.acquire(); // must wait ~1000ms for one token
    expect(clock.now()).toBeGreaterThanOrEqual(1000);
    expect(clock.now()).toBeLessThan(1100);
  });

  it("respects sustained rate across many calls", async () => {
    const clock = virtualClock();
    const rl = new RateLimiter({
      capacity: 5,
      refillPerMinute: 120, // 2/sec
      now: clock.now,
      sleep: clock.sleep,
    });
    for (let i = 0; i < 25; i++) await rl.acquire();
    // 25 calls, 5 free + 20 at 2/sec = ~10s.
    expect(clock.now()).toBeGreaterThanOrEqual(9500);
    expect(clock.now()).toBeLessThanOrEqual(10500);
  });
});
