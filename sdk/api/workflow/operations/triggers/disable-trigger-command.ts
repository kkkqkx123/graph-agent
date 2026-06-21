/**
 * DisableTriggerCommand - Disable Trigger Command
 *
 * Category: Management
 * Disables a trigger for a workflow execution
 */

import {
  ManagementCommand,
  CommandValidationResult,
  validationFailure,
  validationSuccess,
  type CommandMetadataDefinition,
} from "../../../shared/types/command.js";
import { WorkflowExecutionNotFoundError } from "@wf-agent/types";
import type { APIDependencyManager } from "../../../shared/core/sdk-dependencies.js";

/**
 * Disable trigger command parameters
 */
export interface DisableTriggerParams {
  /** Workflow execution ID */
  executionId: string;
  /** Trigger ID to disable */
  triggerId: string;
}

/**
 * DisableTriggerCommand - Disable Trigger
 */
export class DisableTriggerCommand extends ManagementCommand<void> {
  constructor(
    private readonly params: DisableTriggerParams,
    private readonly dependencies: APIDependencyManager,
  ) {
    super();
  }

  protected override getMetadataDefinition(): CommandMetadataDefinition {
    return {
      name: "DisableTriggerCommand",
      description: "Disable a trigger for a workflow execution",
      category: "management",
      requiresAuth: false,
      version: "1.0.0",
      supportUndo: true,
      idempotent: false,
    };
  }

  /**
   * Verify command parameters
   */
  validate(): CommandValidationResult {
    const errors: string[] = [];

    if (!this.params.executionId || this.params.executionId.trim() === "") {
      errors.push("Execution ID cannot be null");
    }

    if (!this.params.triggerId || this.params.triggerId.trim() === "") {
      errors.push("Trigger ID cannot be null");
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }

  /**
   * Execute the command
   */
  protected async executeInternal(): Promise<void> {
    const triggerManager = (await this.getTriggerManager(this.params.executionId)) as {
      disable: (triggerId: string) => void;
    };
    triggerManager.disable(this.params.triggerId);
  }

  /**
   * Obtain the Trigger Manager
   */
  private async getTriggerManager(executionId: string) {
    const executionContext = this.dependencies.getWorkflowExecutionRegistry().get(executionId);
    if (!executionContext) {
      throw new WorkflowExecutionNotFoundError(
        `Workflow execution not found: ${executionId}`,
        executionId,
      );
    }
    return executionContext.triggerManager;
  }
}
