/**
 * ExecuteToolCommand - Execute a tool command
 *
 * Category: Execution
 * Validates tool parameters, executes with options, returns execution result
 */

import {
  ExecutionCommand,
  CommandValidationResult,
  validationSuccess,
  validationFailure,
  type CommandMetadataDefinition,
} from "../../types/command.js";
import type { ID, ToolExecutionResult } from "@wf-agent/types";
import type { ToolOptions } from "../../resources/tools/tool-registry-api.js";
import type { APIDependencyManager } from "../../core/sdk-dependencies.js";

/**
 * Tool execution command parameters
 */
export interface ExecuteToolParams {
  /** Tool ID to execute */
  toolId: ID;
  /** Tool input parameters */
  parameters: Record<string, unknown>;
  /** Execution options (timeout, retries, etc.) */
  options?: ToolOptions;
}

/**
 * Execute tool command
 */
export class ExecuteToolCommand extends ExecutionCommand<ToolExecutionResult> {
  constructor(
    private readonly params: ExecuteToolParams,
    private readonly dependencies: APIDependencyManager,
  ) {
    super();
  }

  protected override getMetadataDefinition(): CommandMetadataDefinition {
    return {
      name: "ExecuteToolCommand",
      description: "Execute a tool with parameters and optional execution settings",
      category: "execution",
      requiresAuth: false,
      version: "1.0.0",
      supportCancellation: true,
      idempotent: false,
    };
  }

  protected async executeInternal(): Promise<ToolExecutionResult> {
    const executionOptions = {
      timeout: this.params.options?.timeout,
      maxRetries: this.params.options?.maxRetries,
      retryDelay: this.params.options?.retryDelay,
      enableLogging: this.params.options?.enableLogging ?? true,
    };

    // Verify tool parameters
    const validation = this.dependencies
      .getToolService()
      .validateParameters(this.params.toolId, this.params.parameters);
    if (!validation.valid) {
      throw new Error(`Parameter validation failed: ${validation.errors.join(", ")}`);
    }

    // Execution Tool
    const result = await this.dependencies
      .getToolService()
      .execute(this.params.toolId, this.params.parameters, executionOptions);

    // Handle the Result type, extracting the successful result or throwing an error.
    if (result.isErr()) {
      throw result.error;
    }

    const executionResult: ToolExecutionResult = {
      success: true,
      result: result.value.result,
      executionTime: 0,
      retryCount: 0,
    };

    return executionResult;
  }

  validate(): CommandValidationResult {
    const errors: string[] = [];

    if (!this.params.toolId || this.params.toolId.trim().length === 0) {
      errors.push("The tool ID cannot be empty.");
    }

    if (!this.params.parameters) {
      errors.push("The parameter cannot be null.");
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }
}
