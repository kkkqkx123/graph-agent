/**
 * Execution-related types for SDK-Kit
 */

import type { ExecutionEvent, ExecutionResult } from './common.types.js';

/**
 * Execution builder interface
 */
export interface ExecutionBuilder {
  input(data: Record<string, unknown>): ExecutionBuilder;
  onProgress(handler: (event: ExecutionEvent) => void): ExecutionBuilder;
  onError(handler: (error: Error) => void): ExecutionBuilder;
  execute(): Promise<ExecutionResult>;
  getExecutionId(): string;
}

/**
 * Event handler function
 */
export type EventHandler = (event: ExecutionEvent | Error) => void;
