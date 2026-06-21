/**
 * PauseAgentLoopCommand - Pause Agent Loop Command
 *
 * Category: Management
 * Pauses a running agent loop execution
 */

import {
  ManagementCommand,
  CommandValidationResult,
  validationSuccess,
  validationFailure,
  type CommandMetadataDefinition,
} from "../../shared/types/command.js";
import type { ID } from "@wf-agent/types";
import type { APIDependencyManager } from "@sdk/api/shared/core/sdk-dependencies.js";

/**
 * Pause Agent Loop command parameters
 */
export interface PauseAgentLoopParams {
  /** Agent Loop ID to pause */
  agentLoopId: ID;
}

/**
 * Pause Agent Loop Command
 */
export class PauseAgentLoopCommand extends ManagementCommand<void> {
  constructor(
    private readonly params: PauseAgentLoopParams,
    private readonly dependencies: APIDependencyManager,
  ) {
    super();
  }

  protected override getMetadataDefinition(): CommandMetadataDefinition {
    return {
      name: "PauseAgentLoopCommand",
      description: "Pause a running agent loop",
      category: "management",
      requiresAuth: false,
      version: "1.0.0",
      supportUndo: true,
      idempotent: false,
    };
  }

  protected async executeInternal(): Promise<void> {
    const registry = this.dependencies.getAgentLoopRegistry();

    // Getting the Agent Loop Entity
    const entity = await registry.get(this.params.agentLoopId);
    if (!entity) {
      throw new Error(`Agent Loop not found: ${this.params.agentLoopId}`);
    }

    // Check if you can pause
    if (!entity.isRunning()) {
      throw new Error(`Agent Loop is not running, cannot pause`);
    }

    // Perform a pause operation
    entity.pause();
  }

  validate(): CommandValidationResult {
    const errors: string[] = [];

    // Validation: agentLoopId must be provided
    if (!this.params.agentLoopId) {
      errors.push("agentLoopId must be provided");
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }
}
