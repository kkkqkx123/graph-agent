/**
 * 表达式求值器模块
 * 提供条件表达式解析、求值和路径解析功能
 */

// 条件评估器
export { ConditionEvaluator, conditionEvaluator } from './condition-evaluator.js';

// 表达式解析器
export { ExpressionEvaluator, parseExpression, parseValue, parseCompoundExpression } from './expression-parser.js';

// 路径解析器
export { resolvePath, pathExists, setPath } from './path-resolver.js';

// 安全验证器
export { validateExpression, validatePath, validateArrayIndex, validateValueType, SECURITY_CONFIG } from './security-validator.js';