/**
 * Dynamic Thread Event Builders
 * Provides builders for dynamic thread events
 */

import { now } from '@modular-agent/common-utils';
import type { DynamicThreadEvent } from '../../types/dynamic-thread.types.js';

// =============================================================================
// Dynamic Thread Events
// =============================================================================

/**
 * Build dynamic thread submitted event
 */
export const buildDynamicThreadSubmittedEvent = (params: {
  threadId: string;
  workflowId?: string;
  parentThreadId?: string;
}): DynamicThreadEvent => ({
  type: 'DYNAMIC_THREAD_SUBMITTED',
  timestamp: now(),
  ...params
});

/**
 * Build dynamic thread completed event
 */
export const buildDynamicThreadCompletedEvent = (params: {
  threadId: string;
  workflowId?: string;
  result: any;
}): DynamicThreadEvent => ({
  type: 'DYNAMIC_THREAD_COMPLETED',
  timestamp: now(),
  ...params,
  data: { result: params.result }
});

/**
 * Build dynamic thread failed event
 */
export const buildDynamicThreadFailedEvent = (params: {
  threadId: string;
  workflowId?: string;
  error: Error;
}): DynamicThreadEvent => ({
  type: 'DYNAMIC_THREAD_FAILED',
  timestamp: now(),
  threadId: params.threadId,
  data: { error: params.error.message }
});

/**
 * Build dynamic thread cancelled event
 */
export const buildDynamicThreadCancelledEvent = (params: {
  threadId: string;
  workflowId?: string;
  reason?: string;
}): DynamicThreadEvent => ({
  type: 'DYNAMIC_THREAD_CANCELLED',
  timestamp: now(),
  ...params
});
