/**
 * Thread Event Builders
 * Provides builders for thread lifecycle events
 */

import { now } from '@modular-agent/common-utils';
import type { Thread, ThreadResult, ID } from '@modular-agent/types';
import type {
  ThreadStartedEvent,
  ThreadCompletedEvent,
  ThreadFailedEvent,
  ThreadPausedEvent,
  ThreadResumedEvent,
  ThreadCancelledEvent,
  ThreadStateChangedEvent,
  ThreadForkStartedEvent,
  ThreadForkCompletedEvent,
  ThreadJoinStartedEvent,
  ThreadJoinConditionMetEvent,
  ThreadCopyStartedEvent,
  ThreadCopyCompletedEvent
} from '@modular-agent/types';
import { createErrorBuilder, createBuilder } from './common.js';

// =============================================================================
// Thread Lifecycle Events (built from Thread object)
// =============================================================================

/**
 * Build thread started event
 */
export const buildThreadStartedEvent = (thread: Thread): ThreadStartedEvent => ({
  type: 'THREAD_STARTED',
  timestamp: now(),
  workflowId: thread.workflowId,
  threadId: thread.id,
  input: thread.input
});

/**
 * Build thread completed event
 */
export const buildThreadCompletedEvent = (thread: Thread, result: ThreadResult): ThreadCompletedEvent => ({
  type: 'THREAD_COMPLETED',
  timestamp: now(),
  workflowId: thread.workflowId,
  threadId: thread.id,
  output: result.output,
  executionTime: result.executionTime
});

/**
 * Build thread failed event
 */
export const buildThreadFailedEvent = createErrorBuilder<ThreadFailedEvent>('THREAD_FAILED');

/**
 * Build thread paused event
 */
export const buildThreadPausedEvent = (thread: Thread): ThreadPausedEvent => ({
  type: 'THREAD_PAUSED',
  timestamp: now(),
  workflowId: thread.workflowId,
  threadId: thread.id
});

/**
 * Build thread resumed event
 */
export const buildThreadResumedEvent = (thread: Thread): ThreadResumedEvent => ({
  type: 'THREAD_RESUMED',
  timestamp: now(),
  workflowId: thread.workflowId,
  threadId: thread.id
});

/**
 * Build thread cancelled event
 */
export const buildThreadCancelledEvent = (thread: Thread, reason?: string): ThreadCancelledEvent => ({
  type: 'THREAD_CANCELLED',
  timestamp: now(),
  workflowId: thread.workflowId,
  threadId: thread.id,
  reason
});

/**
 * Build thread state changed event
 */
export const buildThreadStateChangedEvent = (
  thread: Thread,
  previousStatus: string,
  newStatus: string
): ThreadStateChangedEvent => ({
  type: 'THREAD_STATE_CHANGED',
  timestamp: now(),
  workflowId: thread.workflowId,
  threadId: thread.id,
  previousStatus,
  newStatus
});

// =============================================================================
// Fork/Join/Copy Events
// =============================================================================

/**
 * Build thread fork started event
 */
export const buildThreadForkStartedEvent = createBuilder<ThreadForkStartedEvent>('THREAD_FORK_STARTED');

/**
 * Build thread fork completed event
 */
export const buildThreadForkCompletedEvent = createBuilder<ThreadForkCompletedEvent>('THREAD_FORK_COMPLETED');

/**
 * Build thread join started event
 */
export const buildThreadJoinStartedEvent = createBuilder<ThreadJoinStartedEvent>('THREAD_JOIN_STARTED');

/**
 * Build thread join condition met event
 */
export const buildThreadJoinConditionMetEvent = createBuilder<ThreadJoinConditionMetEvent>('THREAD_JOIN_CONDITION_MET');

/**
 * Build thread copy started event
 */
export const buildThreadCopyStartedEvent = createBuilder<ThreadCopyStartedEvent>('THREAD_COPY_STARTED');

/**
 * Build thread copy completed event
 */
export const buildThreadCopyCompletedEvent = createBuilder<ThreadCopyCompletedEvent>('THREAD_COPY_COMPLETED');
