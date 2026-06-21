/**
 * CreateCheckpointCommand - Create Agent Loop Checkpoint Command
 *
 * Category: Management
 * Creates a checkpoint of the current agent loop execution state
 */

import {
  ManagementCommand,
  CommandValidationResult,
  validationSuccess,
  validationFailure,
  type CommandMetadataDefinition,
} from "../../../shared/types/command.js";
import type { ID, CheckpointMetadata } from "@wf-agent/types";
import { AgentLoopCheckpointResourceAPI } from "../../resources/checkpoint-resource-api.js";
import type { APIDependencyManager } from "../../../shared/core/sdk-dependencies.js";

/**
 * Create Checkpoint Command Parameters
 */
export interface CreateCheckpointParams {
  /** Agent Loop ID */
  agentLoopId: ID;
  /** Checkpoint metadata */
  metadata?: CheckpointMetadata;
}

/**
 * Create Checkpoint Command
 */
export class CreateCheckpointCommand extends ManagementCommand<string> {
  private checkpointAPI: AgentLoopCheckpointResourceAPI;

  constructor(
    private readonly params: CreateCheckpointParams,
    private readonly dependencies: APIDependencyManager,
    checkpointAPI?: AgentLoopCheckpointResourceAPI,
  ) {
    super();
    this.checkpointAPI = checkpointAPI ?? new AgentLoopCheckpointResourceAPI();
  }

  protected override getMetadataDefinition(): CommandMetadataDefinition {
    return {
      name: "CreateCheckpointCommand",
      description: "Create a checkpoint of agent loop execution state",
      category: "management",
      requiresAuth: false,
      version: "1.0.0",
      supportUndo: false,
      idempotent: false,
    };
  }

  protected async executeInternal(): Promise<string> {
    const registry = this.dependencies.getAgentLoopRegistry();

    // Getting the Agent Loop Entity
    const entity = await registry.get(this.params.agentLoopId);
    if (!entity) {
      throw new Error(`Agent Loop not found: ${this.params.agentLoopId}`);
    }

    // Creating Checkpoints
    const checkpointId = await this.checkpointAPI.createCheckpoint(entity, this.params.metadata);

    return checkpointId;
  }

  validate(): CommandValidationResult {
    const errors: string[] = [];

    // Validation: agentLoopId must be provided
    if (!this.params.agentLoopId) {
      errors.push("Must provide agentLoopId");
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }
}
