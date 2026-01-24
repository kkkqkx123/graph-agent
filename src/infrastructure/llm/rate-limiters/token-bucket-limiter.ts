import { getConfig } from '../../config/config';
import { ExecutionError } from '../../../common/exceptions';

export class TokenBucketLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number;

  constructor() {
    this.capacity = getConfig().get('llm_runtime.rate_limit.capacity');
    this.refillRate = getConfig().get('llm_runtime.rate_limit.refill_rate'); // tokens per second
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }

  async checkLimit(): Promise<void> {
    this.refill();

    if (this.tokens < 1) {
      const waitTime = this.calculateWaitTime();
      throw new ExecutionError(
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
}
