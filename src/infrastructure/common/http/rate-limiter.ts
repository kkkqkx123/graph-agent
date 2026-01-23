import { getConfig } from '../../config/config';

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private capacity: number;
  private refillRate: number;

  constructor() {
    this.capacity = getConfig('http.rateLimit.capacity', 100);
    this.refillRate = getConfig('http.rateLimit.refillRate', 10); // tokens per second
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }

  async checkLimit(): Promise<void> {
    this.refill();

    if (this.tokens < 1) {
      const waitTime = this.calculateWaitTime();
      throw new Error(
        `Rate limit exceeded. Please wait ${waitTime}ms before making another request.`
      );
    }

    this.tokens -= 1;
  }

  async waitForToken(): Promise<void> {
    while (true) {
      try {
        await this.checkLimit();
        break;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const waitTime = this.extractWaitTime(errorMessage);
        if (waitTime > 0) {
          await this.delay(waitTime);
        } else {
          throw error;
        }
      }
    }
  }

  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // Convert to seconds
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  private calculateWaitTime(): number {
    const tokensNeeded = 1;
    const tokensDeficit = tokensNeeded - this.tokens;
    const waitTime = (tokensDeficit / this.refillRate) * 1000; // Convert to milliseconds

    return Math.ceil(waitTime);
  }

  private extractWaitTime(errorMessage: string): number {
    const match = errorMessage.match(/wait (\d+)ms/);
    return match && match[1] ? parseInt(match[1], 10) : 0;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  setCapacity(capacity: number): void {
    this.capacity = capacity;
    this.tokens = Math.min(this.tokens, capacity);
  }

  setRefillRate(refillRate: number): void {
    this.refillRate = refillRate;
  }

  getStats(): {
    availableTokens: number;
    capacity: number;
    refillRate: number;
    utilization: number;
  } {
    this.refill();
    const utilization = ((this.capacity - this.tokens) / this.capacity) * 100;

    return {
      availableTokens: this.tokens,
      capacity: this.capacity,
      refillRate: this.refillRate,
      utilization,
    };
  }
}
