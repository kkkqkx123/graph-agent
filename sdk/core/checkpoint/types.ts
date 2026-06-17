/**
 * Common interfaces and types for universal checkpoint system
 */

import type { BaseCheckpoint, DeltaStorageConfig } from "@wf-agent/types";

/**
 * Storage adapter interface for checkpoint persistence
 *
 * Re-exported from @wf-agent/storage to maintain a single unified interface
 * across the codebase. This eliminates the dual-type issue where SDK core
 * and packages/storage defined separate CheckpointStorageAdapter interfaces.
 */
export type { CheckpointStorageAdapter } from "@wf-agent/storage";

/**
 * Minimal entity interface for checkpointing
 * Only requires an ID - state extraction is handled by coordinator
 */
export interface CheckpointableEntity {
  id: string;
}

/**
 * Checkpoint dependencies interface
 * Generic enough to work with any checkpoint type
 */
export interface CheckpointDependencies<TCheckpoint extends BaseCheckpoint<unknown, unknown>> {
  saveCheckpoint: (checkpoint: TCheckpoint) => Promise<string>;
  getCheckpoint: (id: string) => Promise<TCheckpoint | null>;
  listCheckpoints: (parentId: string) => Promise<string[]>;
  deltaConfig?: DeltaStorageConfig;
}

/**
 * Delta restoration result
 */
export interface DeltaRestoreResult<TState> {
  snapshot: TState;
  metadata: {
    checkpointChain: string[];
    baseCheckpointId: string;
  };
}
