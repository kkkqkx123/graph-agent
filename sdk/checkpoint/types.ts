/**
 * CheckpointManager Type Definitions
 *
 * Aligned with final architecture design for Layertwine-Centric checkpoint system
 */

import type { AgentLoopStateSnapshot } from "@wf-agent/types";
import type { WorkflowExecutionStateSnapshot } from "@wf-agent/types";
import type { Message } from "@wf-agent/types";

/**
 * Agent execution state snapshot for Layertwine
 */
export interface AgentStateSnapshot {
  agentLoopId: string;
  messages: Message[];
  state: AgentLoopStateSnapshot;
  timestamp: number;
}

/**
 * Graph execution state snapshot for Layertwine
 */
export interface GraphStateSnapshot {
  executionId: string;
  workflowId: string;
  state: WorkflowExecutionStateSnapshot;
  timestamp: number;
}

/**
 * File snapshot for Layertwine
 */
export interface FileSnapshot {
  path: string;
  content: string | Buffer;
  mimeType?: string;
}

/**
 * Complete checkpoint state restored from Layertwine
 */
export interface CheckpointState {
  checkpointId: string;
  agentState?: AgentStateSnapshot;
  graphState?: GraphStateSnapshot;
  fileSnapshots?: FileSnapshot[];
  metadata: {
    author: string;
    message: string;
    createdAt: number;
  };
  ancestry: string[];
}

/**
 * Checkpoint query conditions
 */
export interface CheckpointQuery {
  agentLoopId?: string;
  executionId?: string;
  timeRange?: [number, number];
  tags?: string[];
}

/**
 * Selective restore options
 */
export interface SelectiveRestoreOptions {
  sources?: string[];
  fields?: string[];
  exclude?: string[];
}

/**
 * Checkpoint diff result
 */
export interface CheckpointDiff {
  added: string[];
  removed: string[];
  modified: string[];
}

/**
 * Checkpoint info for listing
 */
export interface CheckpointInfo {
  id: string;
  author: string;
  message: string;
  createdAt: number;
  ancestry: string[];
}
