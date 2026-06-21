/**
 * RunAgentLoopCommand - Run Agent Loop Command
 *
 * Category: Execution
 * Executes an agent loop with configuration and optional parameters
 */

import {
  ExecutionCommand,
  CommandValidationResult,
  validationSuccess,
  validationFailure,
  type CommandMetadataDefinition,
} from "../../shared/types/command.js";
import {
  validateRequiredEntity,
  validateOptionalPositiveInt,
  combineErrors,
} from "../../shared/operations/validation-utils.js";
import type { AgentLoopRuntimeConfig, AgentLoopResult } from "@wf-agent/types";
import type { AgentLoopCoordinator } from "../../../agent/execution/coordinators/agent-loop-coordinator.js";
import type { AgentLoopEntityOptions } from "../../../agent/execution/factories/agent-loop-factory.js";

/**
 * Run Agent Loop Command Parameters
 */
export interface RunAgentLoopParams {
  /** Agent Loop configuration */
  config: AgentLoopRuntimeConfig;
  /** Implementation options */
  options?: AgentLoopEntityOptions;
}

/**
 * Run Agent Loop Command
 * Executes an agent loop and returns the result
 */
export class RunAgentLoopCommand extends ExecutionCommand<AgentLoopResult> {
  constructor(
    private readonly params: RunAgentLoopParams,
    private readonly coordinator: AgentLoopCoordinator,
  ) {
    super();
  }

  protected override getMetadataDefinition(): CommandMetadataDefinition {
    return {
      name: "RunAgentLoopCommand",
      description: "Execute an agent loop with configuration",
      category: "execution",
      requiresAuth: false,
      version: "1.0.0",
      supportCancellation: true,
      idempotent: false,
    };
  }

  protected async executeInternal(): Promise<AgentLoopResult> {
    return this.coordinator.execute(this.params.config, this.params.options);
  }

  validate(): CommandValidationResult {
    const errors = combineErrors(
      validateRequiredEntity(this.params.config, "Config"),
      validateOptionalPositiveInt(this.params.config?.maxIterations, "maxIterations"),
    );

    // Validate profileId if provided (must be non-empty string)
    if (
      this.params.config?.profileId !== undefined &&
      typeof this.params.config.profileId === "string" &&
      this.params.config.profileId.trim().length === 0
    ) {
      errors.push("`profileId` cannot be an empty string.");
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }
}
