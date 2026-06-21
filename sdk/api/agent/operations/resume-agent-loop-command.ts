/**
 * ResumeAgentLoopCommand - Resume Agent Loop Command
 *
 * Category: Management
 * Resumes a paused agent loop execution
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
 * Resume Agent Loop command parameters
 */
export interface ResumeAgentLoopParams {
  /** Agent Loop ID to resume */
  agentLoopId: ID;
}

/**
 * Resume Agent Loop Command
 */
export class ResumeAgentLoopCommand extends ManagementCommand<void> {
  constructor(
    private readonly params: ResumeAgentLoopParams,
    private readonly dependencies: APIDependencyManager,
  ) {
    super();
  }

  protected override getMetadataDefinition(): CommandMetadataDefinition {
    return {
      name: "ResumeAgentLoopCommand",
      description: "Resume a paused agent loop",
      category: "management",
      requiresAuth: false,
      version: "1.0.0",
      supportUndo: true,
      idempotent: false,
    };
  }

  protected async executeInternal(): Promise<void> {
    const registry = this.dependencies.getAgentLoopRegistry();

    // Obtain the Agent Loop entity
    const entity = await registry.get(this.params.agentLoopId);
    if (!entity) {
      throw new Error(`Agent Loop not found: ${this.params.agentLoopId}`);
    }

    // Check if it is possible to restore.
    if (!entity.isPaused()) {
      throw new Error(`Agent Loop is not paused, cannot resume`);
    }

    // Perform the recovery operation.
    entity.resume();
  }

  validate(): CommandValidationResult {
    const errors: string[] = [];

    // Verification: The `agentLoopId` must be provided.
    if (!this.params.agentLoopId) {
      errors.push("Must provide agentLoopId");
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }
}
