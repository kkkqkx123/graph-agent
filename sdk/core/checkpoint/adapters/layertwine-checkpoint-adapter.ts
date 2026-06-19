/**
 * Layertwine Checkpoint Storage Adapter
 *
 * Implements the CheckpointDependencies interface using Layertwine as the backend.
 * This allows both Agent and Workflow checkpoint systems to use Layertwine for persistent storage
 * without knowing the details of the Layertwine integration.
 *
 * Usage:
 *   const executor = new LayertwineExecutor({ deployMode: 'remote', address: 'localhost:5000' });
 *   await executor.connect({ address: 'localhost:5000', useTls: false, timeout: 30000 });
 *   const adapter = new LayertwineCheckpointAdapter(executor);
 *   coordinator.setCheckpointDependencies(adapter);
 */

import type { LayertwineExecutor } from "../../../services/executors/remote/implementations/layertwine/index.js";
import type { CheckpointDependencies } from "../types.js";
import { createContextualLogger } from "../../../utils/contextual-logger.js";

const logger = createContextualLogger({ component: "LayertwineCheckpointAdapter" });

/**
 * Layertwine Checkpoint Storage Adapter
 *
 * Bridges the gap between the generic CheckpointDependencies interface
 * and the Layertwine backend service.
 */
export class LayertwineCheckpointAdapter implements CheckpointDependencies<any> {
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
  async saveCheckpoint(checkpoint: any): Promise<string> {
    try {
      const message = checkpoint.metadata?.description || "Checkpoint";
      const author = checkpoint.metadata?.creator || "system";

      const response = await this.executor.commit({
        message,
        author,
      });

      logger.debug("Checkpoint saved to Layertwine", {
        checkpointId: response.checkpointId,
        author,
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
  async getCheckpoint(id: string): Promise<any | null> {
    try {
      const response = await this.executor.restoreCheckpoint({
        checkpointId: id,
      });

      if (!response || !response.metadata) {
        return null;
      }

      logger.debug("Checkpoint retrieved from Layertwine", { checkpointId: id });

      // Reconstruct checkpoint object from Layertwine response
      return {
        id: response.checkpointId,
        metadata: response.metadata,
        // Note: Actual state data needs to be fetched separately if needed
      };
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
