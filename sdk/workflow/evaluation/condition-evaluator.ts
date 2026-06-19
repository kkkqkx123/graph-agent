/**
 * Condition Evaluator - Unified Condition Dispatch and Evaluation
 * Routes conditions to appropriate evaluators and manages caching
 */

import type { Condition, EvaluationContext } from "@wf-agent/types";
import { ExpressionSecurityError } from "@wf-agent/types";
import { getGlobalLogger } from "@wf-agent/common-utils";
import { cacheManager } from "./cache-manager.js";
import { expressionCompiler } from "./compilers/expression-compiler.js";
import { expressionConditionExecutor } from "./executors/expression-condition-executor.js";
import { predicateCompiler } from "./compilers/predicate-compiler.js";
import { predicateExecutor } from "./executors/predicate-executor.js";
import { schemaCompiler } from "./compilers/schema-compiler.js";
import { schemaExecutor } from "./executors/schema-executor.js";
import { scriptCompiler } from "./compilers/script-compiler.js";
import { scriptExecutor } from "./executors/script-executor.js";

/**
 * Unified Condition Evaluator
 * Handles all condition types through a dispatcher pattern
 */
export class ConditionEvaluator {
  private logger = getGlobalLogger().child("ConditionEvaluator", { pkg: "sdk/workflow" });

  /**
   * Evaluate a condition against a context
   * Routes to appropriate compiler/executor based on condition type
   * Integrates with unified cache manager
   *
   * @param condition Condition to evaluate
   * @param context Evaluation context
   * @param cacheKey Optional cache key for result caching
   * @returns Evaluation result as boolean
   */
  evaluate(condition: Condition | Record<string, unknown>, context: EvaluationContext, cacheKey?: string): boolean {
    const conditionType = (condition as Record<string, unknown>).type ?? "expression";

    // Check result cache if key provided
    if (cacheKey) {
      if (!cacheManager.hasDependenciesChanged(cacheKey, context)) {
        const cached = cacheManager.getCachedResult(cacheKey);
        if (cached !== null) {
          return Boolean(cached);
        }
      }
    }

    try {
      let result: boolean;

      switch (conditionType) {
        case "expression": {
          const expr = condition as Record<string, unknown>;
          const compileCacheKey = `expr:${expr.expression}`;
          let compiled = cacheManager.getCompiled(compileCacheKey);
          if (!compiled) {
            compiled = expressionCompiler.compile(expr.expression as string);
            cacheManager.setCompiled(compileCacheKey, compiled);
          }

          const execResult = expressionConditionExecutor.execute(compiled, context);
          result = Boolean(execResult);
          break;
        }

        case "predicate": {
          const pred = condition as Record<string, unknown>;
          const compileCacheKey = `pred:${pred.predicateType}:${pred.variable}`;
          let compiled = cacheManager.getCompiled(compileCacheKey);
          if (!compiled) {
            compiled = predicateCompiler.compile({
              type: pred.predicateType as string,
              variable: pred.variable as string,
            });
            cacheManager.setCompiled(compileCacheKey, compiled);
          }

          const execResult = predicateExecutor.execute(compiled, context);
          result = Boolean(execResult);
          break;
        }

        case "schema": {
          const sch = condition as Record<string, unknown>;
          const compileCacheKey = `schema:${sch.variable}:${JSON.stringify(sch.schema)}`;
          let compiled = cacheManager.getCompiled(compileCacheKey);
          if (!compiled) {
            compiled = schemaCompiler.compile(sch.schema);
            cacheManager.setCompiled(compileCacheKey, compiled);
          }

          const execResult = schemaExecutor.execute(compiled, context, sch.variable as string);
          result = Boolean(execResult);
          break;
        }

        case "script": {
          const scr = condition as Record<string, unknown>;
          const compileCacheKey = `script:${scr.script}`;
          let compiled = cacheManager.getCompiled(compileCacheKey);
          if (!compiled) {
            compiled = scriptCompiler.compile(scr.script as string);
            cacheManager.setCompiled(compileCacheKey, compiled);
          }

          const execResult = scriptExecutor.execute(compiled, context);
          result = Boolean(execResult);
          break;
        }

        default:
          throw new Error(`Unknown condition type: ${conditionType}`);
      }

      // Cache result if key provided
      if (cacheKey) {
        const deps = this.extractDependencies(condition as Record<string, unknown>);
        cacheManager.setCachedResult(cacheKey, result, deps, context);
      }

      return result;
    } catch (error) {
      this.logger.warn(`Condition evaluation failed: ${conditionType}`, {
        type: conditionType,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof ExpressionSecurityError) {
        throw error;
      }

      return false;
    }
  }

  /**
   * Extract dependencies from a condition for caching
   */
  private extractDependencies(condition: Record<string, unknown>): string[] {
    const type = condition.type ?? "expression";

    switch (type) {
      case "expression": {
        try {
          const compiled = expressionCompiler.compile(condition.expression as string);
          return compiled.dependencies ?? [];
        } catch {
          return [];
        }
      }

      case "predicate": {
        return [condition.variable as string].filter(Boolean);
      }

      case "schema": {
        return [condition.variable as string].filter(Boolean);
      }

      case "script":
        return [];

      default:
        return [];
    }
  }
}

export const conditionEvaluator = new ConditionEvaluator();
