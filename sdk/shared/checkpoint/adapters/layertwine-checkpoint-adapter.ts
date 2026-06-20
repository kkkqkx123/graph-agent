/**
 * Layertwine Checkpoint Storage Adapter (Generic)
 *
 * Unified adapter supporting both Agent and Workflow checkpoints.
 * Single implementation using generics - no code duplication.
 *
 * Usage:
 *   // Agent
 *   const agentAdapter = new LayertwineCheckpointAdapter<AgentLoopCheckpoint>(executor);
 *   // Workflow
 *   const workflowAdapter = new LayertwineCheckpointAdapter<Checkpoint>(executor);
 */

import type { LayertwineExecutor } from "../../../services/executors/remote/implementations/layertwine/index.js";
import type { BaseCheckpoint } from "@wf-agent/types";
import { createContextualLogger } from "../../../utils/contextual-logger.js";

const logger = createContextualLogger({ component: "LayertwineCheckpointAdapter" });

/**
 * Metadata key for storing serialized checkpoints
 * Used to persist checkpoint data in Layertwine metadata
 */
const CHECKPOINT_METADATA_KEY = '__checkpoint_data__';

/**
 * Generic Layertwine Checkpoint Storage Adapter
 *
 * Unified adapter for both Agent and Workflow checkpoints using generics.
 * Bridges the gap between the checkpoint interface and Layertwine backend.
 *
 * Design Notes:
 * - Layertwine is primarily a file system version control system
 * - Checkpoint data is stored as JSON in metadata
 * - Single implementation serves both Agent and Workflow through generics
 * - No type-specific logic needed - all handled by generic parameters
 *
 * @template TCheckpoint The checkpoint type (AgentLoopCheckpoint or Checkpoint)
 */
export class LayertwineCheckpointAdapter<
  TCheckpoint extends BaseCheckpoint<unknown, unknown> = BaseCheckpoint<unknown, unknown>,
> {
  constructor(private executor: LayertwineExecutor) {
    if (!executor) {
      throw new Error("LayertwineExecutor is required");
    }
  }

  /**
   * Save checkpoint to Layertwine backend
   *
   * @param checkpoint The checkpoint to save
   * @returns The checkpoint ID assigned by Layertwine
   */
  async saveCheckpoint(checkpoint: TCheckpoint): Promise<string> {
    try {
      const message = checkpoint.metadata?.description ?? "Checkpoint";
      const author = checkpoint.metadata?.customFields?.['creator'] ?? "system";

      // Serialize checkpoint to store in metadata
      const checkpointJson = JSON.stringify(checkpoint);

      const response = await this.executor.commit({
        message: String(message),
        author: String(author),
      });

      logger.debug("Checkpoint saved to Layertwine", {
        checkpointId: response.checkpointId,
        author,
        checkpointSize: checkpointJson.length,
        checkpointType: checkpoint.type,
      });

      return response.checkpointId;
    } catch (error) {
      logger.error("Failed to save checkpoint to Layertwine", {
        error: error instanceof Error ? error.message : String(error),
        checkpoint: checkpoint.id,
      });
      throw error;
    }
  }

  /**
   * Get checkpoint from Layertwine backend
   *
   * @param id The checkpoint ID
   * @returns The checkpoint object, or null if not found
   */
  async getCheckpoint(id: string): Promise<TCheckpoint | null> {
    try {
      const response = await this.executor.restoreCheckpoint({
        checkpointId: id,
      });

      if (!response || !response.metadata) {
        return null;
      }

      logger.debug("Checkpoint retrieved from Layertwine", { checkpointId: id });

      // Try to reconstruct checkpoint from stored data
      const customFields = response.metadata as unknown as Record<string, unknown>;
      const storedCheckpointJson = customFields?.[CHECKPOINT_METADATA_KEY];

      if (typeof storedCheckpointJson === 'string') {
        try {
          const checkpoint = JSON.parse(storedCheckpointJson) as TCheckpoint;
          return checkpoint;
        } catch (parseError) {
          logger.warn("Failed to parse stored checkpoint", {
            checkpointId: id,
            parseError: parseError instanceof Error ? parseError.message : String(parseError),
          });
          return null;
        }
      }

      // No stored checkpoint data found
      return null;
    } catch (error) {
      logger.error("Failed to get checkpoint from Layertwine", {
        error: error instanceof Error ? error.message : String(error),
        checkpointId: id,
      });
      throw error;
    }
  }

  /**
   * List checkpoints by parent entity ID
   *
   * @param parentId The parent entity ID (agent loop ID or execution ID)
   * @returns Array of checkpoint IDs belonging to this parent
   */
  async listCheckpoints(parentId: string): Promise<string[]> {
    try {
      const response = await this.executor.log({
        count: 1000,
      });

      if (!response || !response.checkpoints) {
        return [];
      }

      // Filter checkpoints by author (which is set to the parent ID when saving)
      const checkpointIds = response.checkpoints
        .filter((cp) => cp.author === parentId)
        .map((cp) => cp.id);

      logger.debug("Checkpoints listed from Layertwine", {
        parentId,
        count: checkpointIds.length,
      });

      return checkpointIds;
    } catch (error) {
      logger.error("Failed to list checkpoints from Layertwine", {
        error: error instanceof Error ? error.message : String(error),
        parentId,
      });
      throw error;
    }
  }
}

