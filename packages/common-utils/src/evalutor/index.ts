/**
 * 表达式求值器模块
 * 提供条件表达式解析、求值和路径解析功能
 */

// AST 类型定义
export type {
  ASTNode,
  BooleanLiteralNode,
  NumberLiteralNode,
  StringLiteralNode,
  NullLiteralNode,
  ComparisonNode,
  LogicalNode,
  NotNode,
  ArithmeticNode,
  StringMethodNode,
  TernaryNode
} from './ast-types.js';

// 表达式解析器
export {
  parseExpression,
  parseValue,
  parseCompoundExpression,
  parseAST
} from './expression-parser.js';

// 表达式求值器
export {
  ExpressionEvaluator,
  expressionEvaluator
} from './expression-evaluator.js';

// 条件评估器
export { ConditionEvaluator, conditionEvaluator } from './condition-evaluator.js';

// 路径解析器
export { resolvePath, pathExists, setPath } from './path-resolver.js';

// 安全验证器
export { validateExpression, validatePath, validateArrayIndex, validateValueType, SECURITY_CONFIG } from './security-validator.js';