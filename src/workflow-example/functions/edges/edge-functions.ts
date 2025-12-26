/**
 * 边函数实现
 * 
 * 本文件实现了图工作流中的各种边函数
 */

import {
  EdgeFunction,
  EdgeInput,
  EdgeConfig,
  EdgeOutput,
  ExecutionContext
} from '../../types/workflow-types';

// ============================================================================
// 直接边函数
// ============================================================================

/**
 * 直接边函数
 * 直接边总是允许执行，无条件限制
 * 
 * @param input 边输入
 * @param config 边配置
 * @param context 执行上下文
 * @returns 边输出
 */
export const directEdgeFunction: EdgeFunction = async (
  input: EdgeInput,
  config: EdgeConfig,
  context: ExecutionContext
): Promise<EdgeOutput> => {
  return {
    canTraverse: true,
    reason: '直接边，无条件限制'
  };
};

// ============================================================================
// 条件边函数
// ============================================================================

/**
 * 条件边函数
 * 根据条件表达式评估结果决定是否可以遍历
 * 
 * @param input 边输入
 * @param config 边配置
 * @param context 执行上下文
 * @returns 边输出
 */
export const conditionalEdgeFunction: EdgeFunction = async (
  input: EdgeInput,
  config: EdgeConfig,
  context: ExecutionContext
): Promise<EdgeOutput> => {
  try {
    // 提取配置参数
    const expression = config.expression || '';
    const operator = config.operator || 'equals';
    const expectedValue = config.expectedValue;

    // 评估表达式
    const result = evaluateExpression(expression, context.getAllData());

    // 根据运算符进行比较
    const canTraverse = compareWithOperator(result, operator, expectedValue);

    return {
      canTraverse,
      reason: canTraverse
        ? `条件满足: ${expression} = ${result}`
        : `条件不满足: ${expression} = ${result}, 期望: ${expectedValue}`
    };
  } catch (error) {
    return {
      canTraverse: false,
      reason: `条件评估失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

/**
 * 评估表达式
 * 
 * @param expression 表达式字符串
 * @param data 上下文数据
 * @returns 评估结果
 */
function evaluateExpression(expression: string, data: Record<string, any>): any {
  // 替换变量占位符 {{variable.path}}
  const processedExpr = replacePlaceholders(expression, data);

  // 简单表达式求值
  return safeEvaluate(processedExpr);
}

/**
 * 替换变量占位符
 * 
 * @param expression 表达式
 * @param data 数据
 * @returns 替换后的表达式
 */
function replacePlaceholders(expression: string, data: Record<string, any>): string {
  // 匹配 {{path}} 格式的占位符
  const placeholderRegex = /\{\{([^}]+)\}\}/g;

  return expression.replace(placeholderRegex, (match, path) => {
    const value = getValueByPath(data, path.trim());
    return valueToString(value);
  });
}

/**
 * 根据路径获取值
 * 
 * @param data 数据对象
 * @param path 路径，如 "node.result.success"
 * @returns 路径对应的值
 */
function getValueByPath(data: Record<string, any>, path: string): any {
  const parts = path.split('.');
  let current: any = data;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * 将值转换为字符串
 * 
 * @param value 值
 * @returns 字符串表示
 */
function valueToString(value: any): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'string') {
    return `'${value}'`;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * 安全求值
 * 只支持简单的比较表达式，不支持任意代码执行
 * 
 * @param expression 表达式
 * @returns 求值结果
 */
function safeEvaluate(expression: string): any {
  // 移除所有空白字符
  const trimmed = expression.trim();

  // 如果是布尔值
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;

  // 如果是数字
  if (/^-?\d+\.?\d*$/.test(trimmed)) {
    return Number(trimmed);
  }

  // 如果是字符串（带引号）
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed.slice(1, -1);
  }

  // 如果是简单的比较表达式
  const comparisonRegex = /^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/;
  const match = trimmed.match(comparisonRegex);

  if (match) {
    const [, left, operator = '', right] = match;
    const leftValue = parseValue(left);
    const rightValue = parseValue(right);

    switch (operator) {
      case '==':
        return leftValue == rightValue;
      case '!=':
        return leftValue != rightValue;
      case '>=':
        return leftValue >= rightValue;
      case '<=':
        return leftValue <= rightValue;
      case '>':
        return leftValue > rightValue;
      case '<':
        return leftValue < rightValue;
      default:
        return false;
    }
  }

  // 默认返回原始值
  return trimmed;
}

/**
 * 解析值
 * 
 * @param str 字符串
 * @returns 解析后的值
 */
function parseValue(str?: string): any {
  if (!str) return undefined;
  
  const trimmed = str.trim();

  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;

  if (/^-?\d+\.?\d*$/.test(trimmed)) {
    return Number(trimmed);
  }

  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

/**
 * 使用运算符比较值
 * 
 * @param actual 实际值
 * @param operator 运算符
 * @param expected 期望值
 * @returns 比较结果
 */
function compareWithOperator(
  actual: any,
  operator: string,
  expected?: any
): boolean {
  switch (operator) {
    case 'equals':
      return actual == expected;

    case 'not_equals':
      return actual != expected;

    case 'greater_than':
      return actual > expected;

    case 'less_than':
      return actual < expected;

    case 'greater_equals':
      return actual >= expected;

    case 'less_equals':
      return actual <= expected;

    case 'exists':
      return actual !== null && actual !== undefined;

    case 'not_exists':
      return actual === null || actual === undefined;

    default:
      return false;
  }
}

// ============================================================================
// 权重边函数
// ============================================================================

/**
 * 权重边函数
 * 基于权重决定执行优先级，权重高的边优先执行
 * 
 * @param input 边输入
 * @param config 边配置
 * @param context 执行上下文
 * @returns 边输出
 */
export const weightedEdgeFunction: EdgeFunction = async (
  input: EdgeInput,
  config: EdgeConfig,
  context: ExecutionContext
): Promise<EdgeOutput> => {
  const weight = config.weight || 1;
  
  return {
    canTraverse: true,
    reason: `权重边，权重值: ${weight}`,
    metadata: { weight }
  };
};

// ============================================================================
// 边函数注册表
// ============================================================================

/**
 * 边函数注册表
 */
export const edgeFunctionRegistry: Record<string, EdgeFunction> = {
  direct: directEdgeFunction,
  conditional: conditionalEdgeFunction,
  weighted: weightedEdgeFunction
};

/**
 * 获取边函数
 * 
 * @param edgeType 边类型
 * @returns 边函数
 */
export function getEdgeFunction(edgeType: string): EdgeFunction | undefined {
  return edgeFunctionRegistry[edgeType];
}

/**
 * 注册边函数
 * 
 * @param edgeType 边类型
 * @param func 边函数
 */
export function registerEdgeFunction(edgeType: string, func: EdgeFunction): void {
  edgeFunctionRegistry[edgeType] = func;
}