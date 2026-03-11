/**
 * Agent Loop Incremental Checkpoint Restorer
 *
 * Used to restore the full state from incremental checkpoints
 */

import type {
  AgentLoopCheckpoint,
  AgentLoopStateSnapshot,
  AgentLoopDelta
} from '@modular-agent/types';
import type { LLMMessage, AgentLoopConfig, TCheckpointType } from '@modular-agent/types';
import { CheckpointType } from '@modular-agent/types';

/**
 * Full Checkpoint Data
 */
interface FullCheckpointData {
  stateSnapshot: AgentLoopStateSnapshot;
  messages: LLMMessage[];
  variables: Record<string, any>;
  config: AgentLoopConfig;
}

/**
 * Delta Restorer Dependencies
 */
export interface DeltaRestorerDependencies {
  getCheckpoint: (id: string) => Promise<AgentLoopCheckpoint | null>;
  listCheckpoints: (agentLoopId: string) => Promise<string[]>;
}

/**
 * Agent Loop Incremental Checkpoint Restorer
 */
export class AgentLoopDeltaRestorer {
  constructor(private dependencies: DeltaRestorerDependencies) { }

  /**
   * Restore full state from a checkpoint
   * @param checkpointId Checkpoint ID
   * @returns Full checkpoint data
   */
  async restore(checkpointId: string): Promise<FullCheckpointData> {
    const checkpoint = await this.dependencies.getCheckpoint(checkpointId);

    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    // If it's a full checkpoint, return directly
    if (!checkpoint.type || checkpoint.type === CheckpointType['FULL']) {
      return this.extractFullCheckpoint(checkpoint);
    }

    // If it's an incremental checkpoint, chain recovery is needed
    return this.restoreDeltaCheckpoint(checkpoint);
  }

  /**
   * Extract full checkpoint data
   * @param checkpoint Checkpoint
   * @returns Full checkpoint data
   */
  private extractFullCheckpoint(checkpoint: AgentLoopCheckpoint): FullCheckpointData {
    const snapshot = checkpoint.snapshot!;
    return {
      stateSnapshot: snapshot,
      messages: snapshot.messages,
      variables: snapshot.variables,
      config: snapshot.config || {}
    };
  }

  /**
   * Chain recovery for incremental checkpoints
   * @param deltaCheckpoint Incremental checkpoint
   * @returns Full checkpoint data
   */
  private async restoreDeltaCheckpoint(
    deltaCheckpoint: AgentLoopCheckpoint
  ): Promise<FullCheckpointData> {
    // 1. Find the base checkpoint
    const baseCheckpoint = await this.findBaseCheckpoint(deltaCheckpoint);

    // 2. Apply increments sequentially starting from the base
    let result = this.extractFullCheckpoint(baseCheckpoint);
    const deltaChain = await this.buildDeltaChain(
      baseCheckpoint.id,
      deltaCheckpoint.id
    );

    for (const delta of deltaChain) {
      result = this.applyDelta(result, delta);
    }

    return result;
  }

  /**
   * Find the base checkpoint
   * @param checkpoint Starting checkpoint
   * @returns Base checkpoint
   */
  private async findBaseCheckpoint(
    checkpoint: AgentLoopCheckpoint
  ): Promise<AgentLoopCheckpoint> {
    // If baseCheckpointId exists, get it directly
    if (checkpoint.baseCheckpointId) {
      const baseCheckpoint = await this.dependencies.getCheckpoint(
        checkpoint.baseCheckpointId
      );
      if (baseCheckpoint) {
        return baseCheckpoint;
      }
    }

    // Otherwise, traverse up the previousCheckpointId chain
    let current = checkpoint;
    while (current.previousCheckpointId) {
      const prevCheckpoint = await this.dependencies.getCheckpoint(
        current.previousCheckpointId
      );
      if (!prevCheckpoint) {
        throw new Error(
          `Previous checkpoint not found: ${current.previousCheckpointId}`
        );
      }

      // Found a full checkpoint
      if (!prevCheckpoint.type || prevCheckpoint.type === CheckpointType['FULL']) {
        return prevCheckpoint;
      }

      current = prevCheckpoint;
    }

    // If no base checkpoint is found, throw an error
    throw new Error('No base checkpoint found in the chain');
  }

  /**
   * Build the delta chain
   * @param baseCheckpointId Base checkpoint ID
   * @param targetCheckpointId Target checkpoint ID
   * @returns Delta data chain
   */
  private async buildDeltaChain(
    baseCheckpointId: string,
    targetCheckpointId: string
  ): Promise<AgentLoopDelta[]> {
    const deltaChain: AgentLoopDelta[] = [];
    let currentId = targetCheckpointId;

    // Traverse from the target checkpoint towards the base checkpoint, collecting deltas
    while (currentId && currentId !== baseCheckpointId) {
      const checkpoint = await this.dependencies.getCheckpoint(currentId);
      if (!checkpoint) {
        throw new Error(`Checkpoint not found: ${currentId}`);
      }

      if (checkpoint.delta) {
        deltaChain.unshift(checkpoint.delta);
      }

      currentId = checkpoint.previousCheckpointId || '';
    }

    return deltaChain;
  }

  /**
   * Apply delta to the state
   * @param state Current state
   * @param delta Delta data
   * @returns State after applying delta
   */
  private applyDelta(
    state: FullCheckpointData,
    delta: AgentLoopDelta
  ): FullCheckpointData {
    const result = { ...state };

    // Apply added messages delta
    if (delta.addedMessages && delta.addedMessages.length > 0) {
      result.messages = [...result.messages, ...delta.addedMessages];
    }

    // Apply status change
    if (delta.statusChange) {
      result.stateSnapshot.status = delta.statusChange.to;
    }

    // Apply other changes
    if (delta.otherChanges) {
      for (const [key, change] of Object.entries(delta.otherChanges)) {
        if (key === 'toolCallCount') {
          result.stateSnapshot.toolCallCount = change.to;
        } else if (key === 'error') {
          result.stateSnapshot.error = change.to;
        } else if (key === 'startTime') {
          result.stateSnapshot.startTime = change.to;
        } else if (key === 'endTime') {
          result.stateSnapshot.endTime = change.to;
        }
      }
    }

    return result;
  }
}
