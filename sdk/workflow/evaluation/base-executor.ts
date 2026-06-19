/**
 * Base Executor
 * Abstract base class for all condition executors
 * Provides common utilities and validation
 */

import type { EvaluationContext } from "@wf-agent/types";
import type { CompiledUnit, IExecutor } from "./types/index.js";

export abstract class BaseExecutor implements IExecutor {
  protected logger = require("@wf-agent/common-utils").getGlobalLogger().child(
    this.constructor.name,
    { pkg: "sdk/workflow" },
  );

  /**
   * Execute compiled unit
   */
  abstract execute(compiled: CompiledUnit, context: EvaluationContext): unknown;

  /**
   * Validate that context has required structure
   */
  protected validateContext(context: EvaluationContext): void {
    if (!context || typeof context !== "object") {
      throw new Error("Invalid evaluation context");
    }
    if (!context.variables || typeof context.variables !== "object") {
      throw new Error("Context must have variables field");
    }
    if (!context.input || typeof context.input !== "object") {
      throw new Error("Context must have input field");
    }
    if (!context.output || typeof context.output !== "object") {
      throw new Error("Context must have output field");
    }
  }

  /**
   * Get variable value from context
   */
  protected getVariableValue(path: string, context: EvaluationContext): unknown {
    const parts = path.split(".");
    const firstPart = parts[0];
    if (!firstPart) return undefined;

    let current: unknown = (context.variables as Record<string, unknown>)[firstPart];

    for (let i = 1; i < parts.length; i++) {
      if (current == null || typeof current !== "object") {
        return undefined;
      }
      const part = parts[i];
      if (!part) return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }
}
