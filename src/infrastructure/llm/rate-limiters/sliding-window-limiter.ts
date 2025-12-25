import { injectable, inject } from 'inversify';

interface RequestRecord {
  timestamp: number;
}

@injectable()
export class SlidingWindowLimiter {
  private requests: RequestRecord[] = [];
  private readonly maxRequests: number;
  private readonly windowSizeMs: number;

  constructor(
    @inject('ConfigManager') private configManager: any
  ) {
    this.maxRequests = this.configManager.get('llm.rateLimit.maxRequests', 60);
    this.windowSizeMs = this.configManager.get('llm.rateLimit.windowSizeMs', 60000); // 1 minute
  }

  async checkLimit(): Promise<void> {
    this.cleanupOldRequests();

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      if (oldestRequest) {
        const waitTime = this.windowSizeMs - (Date.now() - oldestRequest.timestamp);
        throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime)}ms before making another request.`);
      }
    }

    this.requests.push({ timestamp: Date.now() });
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
    this.cleanupOldRequests();
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  reset(): void {
    this.requests = [];
  }

  private cleanupOldRequests(): void {
    const now = Date.now();
    const cutoffTime = now - this.windowSizeMs;

    this.requests = this.requests.filter(request => request.timestamp > cutoffTime);
  }

  private extractWaitTime(errorMessage: string): number {
    const match = errorMessage.match(/wait (\d+)ms/);
    return match && match[1] ? parseInt(match[1], 10) : 0;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}