/**
 * Evaluation Module
 * Provides unified condition evaluation with support for multiple condition types
 */

export { ConditionEvaluator, conditionEvaluator } from "./condition-evaluator.js";
export { CacheManager, cacheManager } from "./cache-manager.js";
export type { CompiledUnit, ICompiler } from "./types/index.js";
export type { IExecutor } from "./types/index.js";
export { BaseExecutor } from "./base-executor.js";

// Shared utilities
export {
  validateExpression,
  validatePath,
  validateArrayIndex,
  validateValueType,
  SECURITY_CONFIG,
  resolvePath,
  pathExists,
  setPath,
  setArrayItemByKey,
} from "./shared/index.js";

// DSL
export {
  dslParse,
  dslParseWithErrors,
  dslValidate,
  parseToCst,
  cstToAst,
  tokenizeExpression,
} from "./dsl/index.js";

export type {
  Expression,
  LiteralExpr,
  IdentifierExpr,
  MemberAccessExpr,
  UnaryMinusExpr,
  BinaryExpr,
  NotExpr,
  TernaryExpr,
  CallExpr,
  ArrayLiteralExpr,
  NodeMetadata,
  BinaryOperator,
} from "./dsl/types.js";

export type { EvaluationContext } from "@wf-agent/types";

// Compilers (lazy imports to avoid circular deps)
import { expressionCompiler } from "./compilers/expression-compiler.js";
import { cacheManager } from "./cache-manager.js";
import { conditionEvaluator } from "./condition-evaluator.js";
import type { EvaluationContext } from "@wf-agent/types";

// Legacy backward compatibility
export class DependencyManager {
  register(key: string, expression: string, context: Record<string, unknown>) {
    const compiled = expressionCompiler.compile(expression);
    cacheManager.setCachedResult(key, undefined, compiled.dependencies ?? [], context as EvaluationContext);
    return { expression, compiled, dependencies: compiled.dependencies ?? [], lastResult: undefined };
  }

  getTrackedExpression(key: string) {
    const result = cacheManager.getCachedResult(key);
    if (result !== null) {
      return { lastResult: result };
    }
    return null;
  }

  evaluateIfChanged(key: string, context: Record<string, unknown>) {
    return conditionEvaluator.evaluate({ type: "expression", expression: key } as Record<string, unknown>, context as EvaluationContext, key);
  }

  clear() {
    cacheManager.clear();
  }
}

export function createDependencyManager() {
  return new DependencyManager();
}

// ExpressionEvaluator compatibility
export const expressionEvaluator = {
  evaluate: (expr: string, context: Record<string, unknown>) => {
    return conditionEvaluator.evaluate({ type: "expression", expression: expr } as Record<string, unknown>, context as EvaluationContext);
  },
  evaluateAST: (_ast: unknown, context: Record<string, unknown>) => {
    // For backward compatibility, evaluate as expression
    // Note: AST parameter ignored, evaluates expression directly
    return conditionEvaluator.evaluate({ type: "expression", expression: "" } as Record<string, unknown>, context as EvaluationContext);
  },
};
