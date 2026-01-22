import { injectable, inject } from 'inversify';
import { TYPES } from '../../../di/service-keys';
import { IConfigManager } from '../../config/loading/config-manager.interface';

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

@injectable()
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttempt: number = 0;

  private failureThreshold: number;
  private successThreshold: number;
  private timeout: number;
  private resetTimeout: number;

  constructor(@inject(TYPES.ConfigManager) private configManager: IConfigManager) {
    this.failureThreshold = this.configManager.get('http.circuitBreaker.failureThreshold', 5);
    this.successThreshold = this.configManager.get('http.circuitBreaker.successThreshold', 3);
    this.timeout = this.configManager.get('http.circuitBreaker.timeout', 60000);
    this.resetTimeout = this.configManager.get('http.circuitBreaker.resetTimeout', 30000);
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is OPEN. Request blocked.');
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  isClosed(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  isHalfOpen(): boolean {
    return this.state === CircuitState.HALF_OPEN;
  }

  getState(): string {
    return this.state;
  }

  recordSuccess(): void {
    this.lastFailureTime = 0;

    switch (this.state) {
      case CircuitState.CLOSED:
        // Reset failure count on success in closed state
        this.failureCount = 0;
        break;

      case CircuitState.HALF_OPEN:
        this.successCount++;
        if (this.successCount >= this.successThreshold) {
          // Reset to closed state after success threshold is reached
          this.setState(CircuitState.CLOSED);
          this.failureCount = 0;
          this.successCount = 0;
        }
        break;

      case CircuitState.OPEN:
        // Should not happen, but handle gracefully
        this.setState(CircuitState.HALF_OPEN);
        this.successCount = 1;
        break;
    }
  }

  recordFailure(): void {
    this.lastFailureTime = Date.now();

    switch (this.state) {
      case CircuitState.CLOSED:
        this.failureCount++;
        if (this.failureCount >= this.failureThreshold) {
          // Open the circuit after failure threshold is reached
          this.setState(CircuitState.OPEN);
          this.nextAttempt = Date.now() + this.resetTimeout;
        }
        break;

      case CircuitState.HALF_OPEN:
        // Immediately open on failure in half-open state
        this.setState(CircuitState.OPEN);
        this.nextAttempt = Date.now() + this.resetTimeout;
        this.successCount = 0;
        break;

      case CircuitState.OPEN:
        // Should not happen, but handle gracefully
        this.nextAttempt = Date.now() + this.resetTimeout;
        break;
    }
  }

  private setState(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    // Log state change if enabled
    if (this.configManager.get('http.logging.enabled', false)) {
      console.log(`Circuit breaker state changed: ${oldState} -> ${newState}`, {
        failureCount: this.failureCount,
        successCount: this.successCount,
        lastFailureTime: this.lastFailureTime,
      });
    }
  }

  reset(): void {
    this.setState(CircuitState.CLOSED);
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.nextAttempt = 0;
  }

  forceOpen(): void {
    this.setState(CircuitState.OPEN);
    this.nextAttempt = Date.now() + this.resetTimeout;
  }

  forceClose(): void {
    this.setState(CircuitState.CLOSED);
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.nextAttempt = 0;
  }

  getStats(): {
    state: string;
    failureCount: number;
    successCount: number;
    lastFailureTime: number;
    nextAttempt: number;
    timeUntilNextAttempt: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
      timeUntilNextAttempt: Math.max(0, this.nextAttempt - Date.now()),
    };
  }

  setFailureThreshold(threshold: number): void {
    this.failureThreshold = threshold;
  }

  setSuccessThreshold(threshold: number): void {
    this.successThreshold = threshold;
  }

  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  setResetTimeout(resetTimeout: number): void {
    this.resetTimeout = resetTimeout;
  }

  // Check if circuit should attempt to reset
  private shouldAttemptReset(): boolean {
    return this.state === CircuitState.OPEN && Date.now() >= this.nextAttempt;
  }

  // This method should be called periodically to check if the circuit should reset
  checkAndAttemptReset(): void {
    if (this.shouldAttemptReset()) {
      this.setState(CircuitState.HALF_OPEN);
      this.successCount = 0;
    }
  }
}
