/**
 * ExpressionParser - 表达式解析器
 * 提供简易的条件表达式解析功能，支持直观的表达式语法
 *
 * 支持的表达式格式：
 * - 等于：user.age == 18
 * - 不等于：status != 'active'
 * - 大于：score > 60
 * - 小于：score < 100
 * - 大于等于：age >= 18
 * - 小于等于：age <= 65
 * - 包含：name contains 'admin'
 * - 在数组中：role in ['admin', 'user']
 * - 逻辑与：age >= 18 && age <= 65
 * - 逻辑或：status == 'active' || status == 'pending'
 *
 * 数据源访问规则：
 * - 显式前缀（推荐）：input.xxx、output.xxx、variables.xxx - 从指定数据源获取
 * - 简单变量名：xxx - 仅从 variables 获取（语法糖，等价于 variables.xxx）
 * - 嵌套路径：user.name - 从 variables 获取（等价于 variables.user.name）
 *
 * 使用示例：
 * - evaluate("user.age > 18", context) - 判断用户年龄是否大于18（从 variables 获取）
 * - evaluate("input.status == 'active'", context) - 判断输入状态是否为active
 * - evaluate("output.result.success == true", context) - 判断输出结果是否成功
 * - evaluate("variables.tags in ['admin', 'user']", context) - 判断标签是否在数组中
 *
 * 注意事项：
 * - 为避免数据源冲突，建议使用显式前缀（input.、output.、variables.）
 * - 简单变量名只会从 variables 数据源查找，不会从 input 或 output 查找
 * - 嵌套路径默认从 variables 数据源查找，除非使用显式前缀
 */

import type { EvaluationContext } from '../../types/condition';
import { validateExpression, validatePath } from './security-validator';
import { resolvePath } from './path-resolver';

/**
 * 解析表达式字符串
 * @param expression 表达式字符串
 * @returns 解析结果 { variablePath, operator, value }
 */
export function parseExpression(expression: string): { variablePath: string; operator: string; value: any } | null {
  // 验证表达式安全性
  validateExpression(expression);

  const trimmed = expression.trim();

  // 处理纯布尔值表达式（true 或 false）
  if (trimmed === 'true' || trimmed === 'false') {
    return {
      variablePath: '',
      operator: '==',
      value: trimmed === 'true'
    };
  }

  // 尝试匹配各种运算符
  const operators = [
    { pattern: /(.+?)\s*===\s*(.+)/, op: '==' },
    { pattern: /(.+?)\s*!==\s*(.+)/, op: '!=' },
    { pattern: /(.+?)\s*==\s*(.+)/, op: '==' },
    { pattern: /(.+?)\s*!=\s*(.+)/, op: '!=' },
    { pattern: /(.+?)\s*>=\s*(.+)/, op: '>=' },
    { pattern: /(.+?)\s*<=\s*(.+)/, op: '<=' },
    { pattern: /(.+?)\s*>\s*(.+)/, op: '>' },
    { pattern: /(.+?)\s*<\s*(.+)/, op: '<' },
    { pattern: /(.+?)\s+contains\s+(.+)/i, op: 'contains' },
    { pattern: /(.+?)\s+in\s+(.+)/i, op: 'in' }
  ];

  for (const { pattern, op } of operators) {
    const match = trimmed.match(pattern);
    if (match && match[1] && match[2]) {
      const variablePath = match[1].trim();
      const valueStr = match[2].trim();

      const value = parseValue(valueStr);
      return { variablePath, operator: op, value };
    }
  }

  return null;
}

/**
 * 解析值字符串
 * @param valueStr 值字符串
 * @returns 解析后的值
 */
export function parseValue(valueStr: string): any {
  // 数组：['admin', 'user']
  if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
    const arrayContent = valueStr.slice(1, -1).trim();
    if (!arrayContent) {
      return [];
    }
    return arrayContent.split(',').map(item => parseValue(item.trim()));
  }

  // 字符串：'active' 或 "active"
  if ((valueStr.startsWith("'") && valueStr.endsWith("'")) ||
    (valueStr.startsWith('"') && valueStr.endsWith('"'))) {
    return valueStr.slice(1, -1);
  }

  // 布尔值：true 或 false
  if (valueStr === 'true') {
    return true;
  }
  if (valueStr === 'false') {
    return false;
  }

  // null
  if (valueStr === 'null') {
    return null;
  }

  // 数字
  if (/^-?\d+\.?\d*$/.test(valueStr)) {
    return parseFloat(valueStr);
  }

  // 变量引用（不以引号开头且不是关键字/数字的值）
  // 返回特殊标记，表示这是一个变量引用
  return { __isVariableRef: true, path: valueStr };
}

/**
 * 解析复合表达式（包含逻辑运算符）
 * @param expression 表达式字符串
 * @returns 解析后的子表达式列表
 */
export function parseCompoundExpression(expression: string): Array<{ expression: string; operator: '&&' | '||' }> {
  const result: Array<{ expression: string; operator: '&&' | '||' }> = [];
  const trimmed = expression.trim();

  // 按逻辑运算符分割（注意：需要处理嵌套的括号）
  let current = '';
  let depth = 0;
  let lastOperator: '&&' | '||' = '&&';

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth--;
      current += char;
    } else if (depth === 0) {
      // 检查是否遇到逻辑运算符
      if (trimmed.substr(i, 2) === '&&') {
        if (current.trim()) {
          result.push({ expression: current.trim(), operator: lastOperator });
        }
        lastOperator = '&&';
        current = '';
        i += 1; // 跳过第二个 &
      } else if (trimmed.substr(i, 2) === '||') {
        if (current.trim()) {
          result.push({ expression: current.trim(), operator: lastOperator });
        }
        lastOperator = '||';
        current = '';
        i += 1; // 跳过第二个 |
      } else {
        current += char;
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    result.push({ expression: current.trim(), operator: lastOperator });
  }

  return result;
}

/**
 * 表达式求值器
 */
export class ExpressionEvaluator {
  /**
   * 求值表达式
   * @param expression 表达式字符串
   * @param context 评估上下文
   * @returns 求值结果
   */
  evaluate(expression: string, context: EvaluationContext): boolean {
    try {
      // 检查是否为复合表达式（包含逻辑运算符）
      if (expression.includes('&&') || expression.includes('||')) {
        return this.evaluateCompoundExpression(expression, context);
      }

      // 简单表达式
      const parsed = parseExpression(expression);
      if (!parsed) {
        console.error(`Failed to parse expression: ${expression}`);
        return false;
      }

      return this.evaluateCondition(parsed, context);
    } catch (error) {
      console.error(`Failed to evaluate expression: ${expression}`, error);
      return false;
    }
  }

  /**
   * 求值复合表达式
   */
  private evaluateCompoundExpression(expression: string, context: EvaluationContext): boolean {
    const subExpressions = parseCompoundExpression(expression);

    if (subExpressions.length === 0) {
      return false;
    }

    const first = subExpressions[0];
    if (!first) {
      return false;
    }

    let result = this.evaluate(first.expression, context);

    for (let i = 1; i < subExpressions.length; i++) {
      const subExpr = subExpressions[i];
      if (!subExpr) {
        continue;
      }

      const subResult = this.evaluate(subExpr.expression, context);

      if (subExpr.operator === '&&') {
        result = result && subResult;
      } else {
        result = result || subResult;
      }
    }

    return result;
  }

  /**
   * 求值单个条件
   */
  private evaluateCondition(
    condition: { variablePath: string; operator: string; value: any },
    context: EvaluationContext
  ): boolean {
    // 处理纯布尔值表达式（variablePath 为空）
    if (!condition.variablePath) {
      return condition.value === true;
    }

    const variableValue = this.getVariableValue(condition.variablePath, context);

    // 处理变量引用
    let compareValue = condition.value;
    if (compareValue && typeof compareValue === 'object' && compareValue.__isVariableRef) {
      compareValue = this.getVariableValue(compareValue.path, context);
    }

    switch (condition.operator) {
      case '==':
        return variableValue === compareValue;
      case '!=':
        return variableValue !== compareValue;
      case '>':
        return typeof variableValue === 'number' && typeof compareValue === 'number' && variableValue > compareValue;
      case '<':
        return typeof variableValue === 'number' && typeof compareValue === 'number' && variableValue < compareValue;
      case '>=':
        return typeof variableValue === 'number' && typeof compareValue === 'number' && variableValue >= compareValue;
      case '<=':
        return typeof variableValue === 'number' && typeof compareValue === 'number' && variableValue <= compareValue;
      case 'contains':
        return String(variableValue).includes(String(compareValue));
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(variableValue);
      default:
        console.error(`Unknown operator: ${condition.operator}`);
        return false;
    }
  }

  /**
   * 获取变量值
   *
   * 数据源访问规则：
   * - 显式前缀：input.xxx、output.xxx、variables.xxx - 从指定数据源获取
   * - 简单变量名：xxx - 仅从 variables 获取（语法糖，等价于 variables.xxx）
   * - 其他嵌套路径：user.name - 从 variables 获取（等价于 variables.user.name）
   *
   * @param variablePath 变量路径
   * @param context 评估上下文
   * @returns 变量值
   */
  private getVariableValue(variablePath: string, context: EvaluationContext): any {
    // 验证路径安全性
    validatePath(variablePath);

    // 判断是否为嵌套路径
    const isNestedPath = variablePath.includes('.') || variablePath.includes('[');

    if (isNestedPath) {
      // 检查是否以 input. 开头
      if (variablePath.startsWith('input.')) {
        const subPath = variablePath.substring(6); // 移除 'input.'
        return resolvePath(subPath, context.input);
      }

      // 检查是否以 output. 开头
      if (variablePath.startsWith('output.')) {
        const subPath = variablePath.substring(7); // 移除 'output.'
        return resolvePath(subPath, context.output);
      }

      // 检查是否以 variables. 开头
      if (variablePath.startsWith('variables.')) {
        const subPath = variablePath.substring(10); // 移除 'variables.'
        return resolvePath(subPath, context.variables);
      }

      // 其他嵌套路径：从 variables 获取（等价于 variables.xxx）
      return resolvePath(variablePath, context.variables);
    } else {
      // 简单变量名：仅从 variables 获取（语法糖，等价于 variables.xxx）
      return context.variables[variablePath];
    }
  }
}