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

// Compilers (lazy imports to avoid circular deps)
import { expressionCompiler } from "./compilers/expression-compiler.js";
import { cacheManager } from "./cache-manager.js";
import { conditionEvaluator } from "./condition-evaluator.js";

// Legacy backward compatibility
export class DependencyManager {
  register(key: string, expression: string, context: any) {
    const compiled = expressionCompiler.compile(expression);
    cacheManager.setCachedResult(key, undefined, compiled.dependencies ?? [], context);
    return { expression, compiled, dependencies: compiled.dependencies ?? [], lastResult: undefined };
  }

  getTrackedExpression(key: string) {
    const result = cacheManager.getCachedResult(key);
    if (result !== null) {
      return { lastResult: result };
    }
    return null;
  }

  evaluateIfChanged(key: string, context: any) {
    return conditionEvaluator.evaluate({ type: "expression", expression: key } as any, context, key);
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
  evaluate: (expr: string, context: any) => {
    return conditionEvaluator.evaluate({ type: "expression", expression: expr } as any, context);
  },
  evaluateAST: (_ast: unknown, context: any) => {
    // For backward compatibility, evaluate as expression
    // Note: AST parameter ignored, evaluates expression directly
    return conditionEvaluator.evaluate({ type: "expression", expression: "" } as any, context);
  },
};
