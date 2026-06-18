/**
 * Checkpoint Manager Integration Examples
 *
 * This file demonstrates how to integrate CheckpointManager with Agent and Graph executors.
 * It shows both basic usage and advanced patterns.
 */

import { CheckpointManager } from "../checkpoint/index.js";
import { LayertwineExecutor } from "../services/executors/remote/implementations/layertwine/index.js";
import type { AgentStateSnapshot, GraphStateSnapshot } from "../checkpoint/types.js";
import type { AgentLoopEntity } from "./entities/agent-loop-entity.js";

/**
 * Example 1: Creating an Agent checkpoint after each iteration
 *
 * This would typically be called at the end of each agent loop iteration,
 * either within AgentExecutionCoordinator or in application code.
 */
export async function createAgentCheckpointExample(
  checkpointManager: CheckpointManager,
  entity: AgentLoopEntity,
  messages: unknown[],
  iteration: number
): Promise<void> {
  const snapshot: AgentStateSnapshot = {
    agentLoopId: entity.id,
    messages: messages as never[],
    state: entity.state,
    timestamp: Date.now(),
  };

  const checkpointId = await checkpointManager.createAgentCheckpoint(
    snapshot,
    `Agent iteration ${iteration} completed`
  );

  console.log("Checkpoint created:", checkpointId);
}

/**
 * Example 2: Restoring an agent from a checkpoint
 */
export async function restoreAgentExample(
  checkpointManager: CheckpointManager,
  checkpointId: string
): Promise<AgentStateSnapshot> {
  const snapshot = await checkpointManager.restoreAgentState(checkpointId);
  console.log("Agent restored from checkpoint:", checkpointId);
  return snapshot;
}

/**
 * Example 3: List all checkpoints
 */
export async function listCheckpointsExample(
  checkpointManager: CheckpointManager
): Promise<void> {
  const checkpoints = await checkpointManager.listCheckpoints();
  console.log("Available checkpoints:", checkpoints);
}

/**
 * Example 4: Time travel - get agent state at specific time
 */
export async function timeTravelExample(
  checkpointManager: CheckpointManager,
  agentLoopId: string,
  timestamp: number
): Promise<void> {
  const state = await checkpointManager.getStateAtTime(agentLoopId, timestamp);
  console.log("Agent state at time:", state);
}

/**
 * Example 5: Diff two checkpoints
 */
export async function diffCheckpointsExample(
  checkpointManager: CheckpointManager,
  fromCheckpointId: string,
  toCheckpointId: string
): Promise<void> {
  const diff = await checkpointManager.diffCheckpoints(fromCheckpointId, toCheckpointId);
  console.log("Checkpoint diff:", diff);
}

/**
 * Factory function to create CheckpointManager with proper configuration
 */
export async function createCheckpointManager(
  layertwineAddress: string = "localhost:5000"
): Promise<CheckpointManager> {
  const executor = new LayertwineExecutor({
    deployMode: "remote",
    address: layertwineAddress,
  });

  await executor.connect({
    address: layertwineAddress,
    useTls: false,
    timeout: 30000,
  });

  return new CheckpointManager(executor);
}
