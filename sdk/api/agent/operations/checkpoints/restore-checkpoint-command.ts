/**
 * RestoreCheckpointCommand - Restore Agent Loop From Checkpoint Command
 *
 * Category: Management
 * Restores an agent loop execution state from a previously created checkpoint
 */

import {
  ManagementCommand,
  CommandValidationResult,
  validationSuccess,
  validationFailure,
  type CommandMetadataDefinition,
} from "../../../shared/types/command.js";
import type { AgentLoopEntity } from "../../../../agent/entities/agent-loop-entity.js";
import { AgentLoopCheckpointResourceAPI } from "../../resources/checkpoint-resource-api.js";

/**
 * Restore checkpoint command parameters
 */
export interface RestoreCheckpointParams {
  /** Checkpoint ID to restore from */
  checkpointId: string;
}

/**
 * Restore Checkpoint Command
 * Restores agent loop execution state from a checkpoint
 */
export class RestoreCheckpointCommand extends ManagementCommand<AgentLoopEntity> {
  private checkpointAPI: AgentLoopCheckpointResourceAPI;

  constructor(
    private readonly params: RestoreCheckpointParams,
    checkpointAPI?: AgentLoopCheckpointResourceAPI,
  ) {
    super();
    this.checkpointAPI = checkpointAPI ?? new AgentLoopCheckpointResourceAPI();
  }

  protected override getMetadataDefinition(): CommandMetadataDefinition {
    return {
      name: "RestoreCheckpointCommand",
      description: "Restore agent loop execution state from a checkpoint",
      category: "management",
      requiresAuth: false,
      version: "1.0.0",
      supportUndo: false,
      idempotent: false,
    };
  }

  protected async executeInternal(): Promise<AgentLoopEntity> {
    // Restore from a checkpoint
    const entity = await this.checkpointAPI.restoreFromCheckpoint(this.params.checkpointId);
    return entity;
  }

  validate(): CommandValidationResult {
    const errors: string[] = [];

    // Verification: The checkpointId must be provided.
    if (!this.params.checkpointId || this.params.checkpointId.trim() === "") {
      errors.push("The checkpoint ID cannot be empty.");
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }
}
