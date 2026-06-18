/**
 * Checkpoint Manager
 *
 * Coordinates checkpoint creation and restoration operations with Layertwine backend.
 * Handles serialization/deserialization of Agent and Graph state snapshots.
 */

import { LayertwineExecutor } from "../services/executors/remote/implementations/layertwine/index.js";
import type {
  AgentStateSnapshot,
  GraphStateSnapshot,
  CheckpointState,
  SelectiveRestoreOptions,
  CheckpointInfo,
  CheckpointDiff,
} from "./types.js";

export class CheckpointManager {
  constructor(
    private layertwineExecutor: LayertwineExecutor
  ) {}

  /**
   * Create an Agent checkpoint
   */
  async createAgentCheckpoint(
    snapshot: AgentStateSnapshot,
    message: string
  ): Promise<string> {
    JSON.stringify({
      agentLoopId: snapshot.agentLoopId,
      messages: snapshot.messages,
      state: snapshot.state,
      timestamp: snapshot.timestamp,
    });

    const response = await this.layertwineExecutor.commit({
      message,
      author: snapshot.agentLoopId,
    });

    return response.checkpointId;
  }

  /**
   * Create a Graph checkpoint
   */
  async createGraphCheckpoint(
    snapshot: GraphStateSnapshot,
    message: string
  ): Promise<string> {
    JSON.stringify({
      executionId: snapshot.executionId,
      workflowId: snapshot.workflowId,
      state: snapshot.state,
      timestamp: snapshot.timestamp,
    });

    const response = await this.layertwineExecutor.commit({
      message,
      author: snapshot.executionId,
    });

    return response.checkpointId;
  }

  /**
   * Restore full checkpoint
   */
  async restoreFull(checkpointId: string): Promise<CheckpointState> {
    const response = await this.layertwineExecutor.restoreCheckpoint({
      checkpointId,
    });

    return {
      checkpointId: response.checkpointId,
      metadata: response.metadata,
      ancestry: response.ancestry,
      agentState: undefined,
      graphState: undefined,
      fileSnapshots: undefined,
    };
  }

  /**
   * Restore Agent state from checkpoint
   */
  async restoreAgentState(checkpointId: string): Promise<AgentStateSnapshot> {
    const response = await this.layertwineExecutor.restoreSelectiveCheckpoint({
      checkpointId,
      sources: ["agent://"],
    });

    if (!response.snapshots || response.snapshots.length === 0) {
      throw new Error(`No agent snapshot found in checkpoint ${checkpointId}`);
    }

    const snapshotData = response.snapshots[0];
    if (!snapshotData) {
      throw new Error(`Invalid snapshot data in checkpoint ${checkpointId}`);
    }

    const content = await this.getSnapshotContent(checkpointId, snapshotData.id);

    const parsed = JSON.parse(content.toString());
    return {
      agentLoopId: parsed.agentLoopId,
      messages: parsed.messages || [],
      state: parsed.state,
      timestamp: parsed.timestamp || Date.now(),
    };
  }

  /**
   * Restore Agent messages only
   */
  async restoreAgentMessages(checkpointId: string) {
    const state = await this.restoreAgentState(checkpointId);
    return state.messages;
  }

  /**
   * Restore Graph state from checkpoint
   */
  async restoreGraphState(checkpointId: string): Promise<GraphStateSnapshot> {
    const response = await this.layertwineExecutor.restoreSelectiveCheckpoint({
      checkpointId,
      sources: ["graph://"],
    });

    if (!response.snapshots || response.snapshots.length === 0) {
      throw new Error(`No graph snapshot found in checkpoint ${checkpointId}`);
    }

    const snapshotData = response.snapshots[0];
    if (!snapshotData) {
      throw new Error(`Invalid snapshot data in checkpoint ${checkpointId}`);
    }

    const content = await this.getSnapshotContent(checkpointId, snapshotData.id);

    const parsed = JSON.parse(content.toString());
    return {
      executionId: parsed.executionId,
      workflowId: parsed.workflowId,
      state: parsed.state,
      timestamp: parsed.timestamp || Date.now(),
    };
  }

  /**
   * Restore selectively by source pattern
   */
  async restoreSelective(
    checkpointId: string,
    options: SelectiveRestoreOptions
  ): Promise<Partial<CheckpointState>> {
    const response = await this.layertwineExecutor.restoreSelectiveCheckpoint({
      checkpointId,
      sources: options.sources,
    });

    return {
      checkpointId: response.checkpointId,
      metadata: response.metadata,
    };
  }

  /**
   * Get checkpoint state at specific timestamp
   */
  async getStateAtTime(agentOrGraphId: string, timestamp: number): Promise<AgentStateSnapshot | GraphStateSnapshot> {
    const response = await this.layertwineExecutor.restoreCheckpointByTime({
      timestamp,
      source: `agent://${agentOrGraphId}`,
    });

    if (!response.snapshots || response.snapshots.length === 0) {
      throw new Error(`No snapshot found for entity ${agentOrGraphId} at timestamp ${timestamp}`);
    }

    const snapshotData = response.snapshots[0];
    if (!snapshotData) {
      throw new Error(`Invalid snapshot data at timestamp ${timestamp}`);
    }

    const content = await this.getSnapshotContent(response.checkpointId, snapshotData.id);
    const parsed = JSON.parse(content.toString());

    if (parsed.agentLoopId) {
      return {
        agentLoopId: parsed.agentLoopId,
        messages: parsed.messages || [],
        state: parsed.state,
        timestamp: parsed.timestamp || Date.now(),
      };
    } else {
      return {
        executionId: parsed.executionId,
        workflowId: parsed.workflowId,
        state: parsed.state,
        timestamp: parsed.timestamp || Date.now(),
      };
    }
  }

  /**
   * List checkpoints for an entity
   */
  async listCheckpoints(): Promise<CheckpointInfo[]> {
    const response = await this.layertwineExecutor.log({ count: 1000 });

    return response.checkpoints.map((cp) => ({
      id: cp.id,
      author: cp.author,
      message: cp.message,
      createdAt: cp.createdAt,
      ancestry: cp.parents,
    }));
  }

  /**
   * Diff two checkpoints
   */
  async diffCheckpoints(fromId: string, toId: string): Promise<CheckpointDiff> {
    const response = await this.layertwineExecutor.diffCheckpoints({
      fromCheckpointId: fromId,
      toCheckpointId: toId,
    });

    return {
      added: response.added,
      removed: response.removed,
      modified: response.modified,
    };
  }

  /**
   * Get snapshot content by ID
   */
  private async getSnapshotContent(checkpointId: string, snapshotId: string): Promise<string | Buffer> {
    const response = await this.layertwineExecutor.getSnapshot({
      checkpointId,
      snapshotId,
    });

    return response.content;
  }
}
