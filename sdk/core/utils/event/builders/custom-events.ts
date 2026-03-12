/**
 * Custom Event Builders
 * Provides builders for custom events (NodeCustomEvent, AgentCustomEvent)
 */

import { now } from '@modular-agent/common-utils';
import type { NodeCustomEvent, AgentCustomEvent, Metadata } from '@modular-agent/types';

// =============================================================================
// Node Custom Event Builder
// =============================================================================

/**
 * Build node custom event
 */
export const buildNodeCustomEvent = (params: {
  workflowId: string;
  threadId: string;
  nodeId: string;
  nodeType: string;
  eventName: string;
  eventData: Record<string, any>;
  metadata?: Metadata;
}): NodeCustomEvent => ({
  type: 'NODE_CUSTOM_EVENT',
  timestamp: now(),
  ...params
});

// =============================================================================
// Agent Custom Event Builder
// =============================================================================

/**
 * Build agent custom event
 */
export const buildAgentCustomEvent = (params: {
  threadId: string;
  agentLoopId: string;
  eventName: string;
  eventData: Record<string, any>;
  iteration?: number;
  parentThreadId?: string;
  nodeId?: string;
  metadata?: Metadata;
}): AgentCustomEvent => ({
  type: 'AGENT_CUSTOM_EVENT',
  timestamp: now(),
  ...params
});
