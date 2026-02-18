/**
 * ExpressionParser - 表达式解析器
 * 提供表达式解析功能，支持构建抽象语法树（AST）
 *
 * 支持的表达式格式：
 * - 比较操作：user.age == 18, score > 60, name contains 'admin'
 * - 逻辑操作：age >= 18 && age <= 65, status == 'active' || status == 'pending'
 * - NOT 操作：!user.isActive, !(age < 18)
 * - 算术运算：user.age + 1, price * 0.9, count % 2
 * - 字符串方法：user.name.startsWith('J'), user.email.endsWith('@example.com')
 * - 三元运算符：age >= 18 ? 'adult' : 'minor'
 */

import { validateExpression } from './security-validator.js';
import { RuntimeValidationError } from '@modular-agent/types';
import type { ASTNode } from './ast-types.js';
import {
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

/**
 * 解析表达式字符串（向后兼容）
 * @param expression 表达式字符串
 * @returns 解析结果 { variablePath, operator, value }
 * @deprecated 使用 parseAST 代替
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
 * 解析复合表达式（向后兼容）
 * @param expression 表达式字符串
 * @returns 解析后的子表达式列表
 * @deprecated 使用 parseAST 代替
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
      if (trimmed.substring(i, i + 2) === '&&') {
        if (current.trim()) {
          result.push({ expression: current.trim(), operator: lastOperator });
        }
        lastOperator = '&&';
        current = '';
        i += 1; // 跳过第二个 &
      } else if (trimmed.substring(i, i + 2) === '||') {
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
 * 解析表达式为 AST（抽象语法树）
 * @param expression 表达式字符串
 * @returns AST 节点
 */
export function parseAST(expression: string): ASTNode {
  // 验证表达式安全性
  validateExpression(expression);

  const trimmed = expression.trim();

  // 处理三元运算符（优先级最低）
  const ternaryIndex = findTernaryOperator(trimmed);
  if (ternaryIndex !== -1) {
    const condition = trimmed.slice(0, ternaryIndex).trim();
    const afterQuestion = trimmed.slice(ternaryIndex + 1).trim();
    const colonIndex = findColonInTernary(afterQuestion);
    
    if (colonIndex !== -1) {
      const consequent = afterQuestion.slice(0, colonIndex).trim();
      const alternate = afterQuestion.slice(colonIndex + 1).trim();
      
      return {
        type: 'ternary',
        condition: parseAST(condition),
        consequent: parseAST(consequent),
        alternate: parseAST(alternate)
      } as TernaryNode;
    }
  }

  // 处理 NOT 操作
  if (trimmed.startsWith('!')) {
    const operand = trimmed.slice(1).trim();
    return {
      type: 'not',
      operand: parseAST(operand)
    } as NotNode;
  }

  // 处理括号表达式
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    // 检查括号是否匹配
    let depth = 0;
    for (let i = 0; i < trimmed.length; i++) {
      if (trimmed[i] === '(') depth++;
      if (trimmed[i] === ')') depth--;
      if (depth === 0 && i < trimmed.length - 1) {
        // 括号不匹配，不是完整的括号表达式
        break;
      }
    }
    if (depth === 0) {
      // 去掉外层括号，递归解析
      return parseAST(trimmed.slice(1, -1));
    }
  }

  // 处理字面量
  if (trimmed === 'true') {
    return { type: 'boolean', value: true } as BooleanLiteralNode;
  }
  if (trimmed === 'false') {
    return { type: 'boolean', value: false } as BooleanLiteralNode;
  }
  if (trimmed === 'null') {
    return { type: 'null', value: null } as NullLiteralNode;
  }
  if (/^-?\d+\.?\d*$/.test(trimmed)) {
    return { type: 'number', value: parseFloat(trimmed) } as NumberLiteralNode;
  }
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return { type: 'string', value: trimmed.slice(1, -1) } as StringLiteralNode;
  }

  // 处理字符串方法
  const stringMethodMatch = trimmed.match(/^(.+?)\.(startsWith|endsWith|length|toLowerCase|toUpperCase|trim)(?:\((.*?)\))?$/);
  if (stringMethodMatch && stringMethodMatch[1] && stringMethodMatch[2]) {
    const variablePath = stringMethodMatch[1].trim();
    const method = stringMethodMatch[2] as any;
    const argument = stringMethodMatch[3] ? parseValue(stringMethodMatch[3].trim()) : undefined;
    
    return {
      type: 'stringMethod',
      variablePath,
      method,
      argument
    } as StringMethodNode;
  }

  // 查找最外层的逻辑运算符（|| 优先级低于 &&）
  const orIndex = findTopLevelOperator(trimmed, '||');
  if (orIndex !== -1) {
    const left = trimmed.slice(0, orIndex).trim();
    const right = trimmed.slice(orIndex + 2).trim();
    return {
      type: 'logical',
      operator: '||',
      left: parseAST(left),
      right: parseAST(right)
    } as LogicalNode;
  }

  const andIndex = findTopLevelOperator(trimmed, '&&');
  if (andIndex !== -1) {
    const left = trimmed.slice(0, andIndex).trim();
    const right = trimmed.slice(andIndex + 2).trim();
    return {
      type: 'logical',
      operator: '&&',
      left: parseAST(left),
      right: parseAST(right)
    } as LogicalNode;
  }

  // 解析比较表达式（优先级高于算术运算）
  const parsed = parseExpression(trimmed);
  if (parsed && parsed.variablePath) {
    return {
      type: 'comparison',
      variablePath: parsed.variablePath,
      operator: parsed.operator as any,
      value: parsed.value
    } as ComparisonNode;
  }

  // 查找算术运算符（优先级：* / % > + -）
  const mulDivModIndex = findTopLevelOperator(trimmed, ['*', '/', '%']);
  if (mulDivModIndex !== -1) {
    const operator = trimmed.substring(mulDivModIndex, mulDivModIndex + 1) as '*' | '/' | '%';
    const left = trimmed.slice(0, mulDivModIndex).trim();
    const right = trimmed.slice(mulDivModIndex + 1).trim();
    return {
      type: 'arithmetic',
      operator,
      left: parseAST(left),
      right: parseAST(right)
    } as ArithmeticNode;
  }

  const addSubIndex = findTopLevelOperator(trimmed, ['+', '-']);
  if (addSubIndex !== -1) {
    const operator = trimmed.substring(addSubIndex, addSubIndex + 1) as '+' | '-';
    const left = trimmed.slice(0, addSubIndex).trim();
    const right = trimmed.slice(addSubIndex + 1).trim();
    return {
      type: 'arithmetic',
      operator,
      left: parseAST(left),
      right: parseAST(right)
    } as ArithmeticNode;
  }

  // 如果都不是，可能是变量引用，当作比较表达式处理
  if (trimmed && !trimmed.includes(' ')) {
    return {
      type: 'comparison',
      variablePath: trimmed,
      operator: '==',
      value: true
    } as ComparisonNode;
  }

  throw new RuntimeValidationError(
    `Failed to parse expression: "${trimmed}"`,
    {
      operation: 'parse_expression',
      field: 'expression',
      value: trimmed
    }
  );
}

/**
 * 查找最外层的逻辑运算符位置
 * @param expression 表达式字符串
 * @param operator 运算符或运算符数组
 * @returns 运算符位置，如果不存在返回 -1
 */
function findTopLevelOperator(expression: string, operator: string | string[]): number {
  let depth = 0;
  const operators = Array.isArray(operator) ? operator : [operator];
  
  for (let i = 0; i < expression.length; i++) {
    if (expression[i] === '(') depth++;
    if (expression[i] === ')') depth--;
    
    if (depth === 0) {
      for (const op of operators) {
        if (expression.substring(i, i + op.length) === op) {
          return i;
        }
      }
    }
  }
  return -1;
}

/**
 * 查找三元运算符的问号位置
 * @param expression 表达式字符串
 * @returns 问号位置，如果不存在返回 -1
 */
function findTernaryOperator(expression: string): number {
  let depth = 0;
  for (let i = 0; i < expression.length; i++) {
    if (expression[i] === '(') depth++;
    if (expression[i] === ')') depth--;
    if (depth === 0 && expression[i] === '?') {
      return i;
    }
  }
  return -1;
}

/**
 * 在三元运算符的问号后查找冒号位置
 * @param expression 问号后的表达式
 * @returns 冒号位置，如果不存在返回 -1
 */
function findColonInTernary(expression: string): number {
  let depth = 0;
  for (let i = 0; i < expression.length; i++) {
    if (expression[i] === '(') depth++;
    if (expression[i] === ')') depth--;
    if (depth === 0 && expression[i] === ':') {
      return i;
    }
  }
  return -1;
}