/**
 * ExpressionEvaluator - 表达式求值器
 * 提供表达式求值功能，支持 AST 节点的递归求值
 */

import type { EvaluationContext } from '@modular-agent/types';
import { RuntimeValidationError } from '@modular-agent/types';
import { validatePath } from './security-validator.js';
import { resolvePath } from './path-resolver.js';
import { getGlobalLogger } from '../logger/logger.js';
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
import { parseAST } from './expression-parser.js';

/**
 * 表达式求值器
 */
export class ExpressionEvaluator {
  private logger = getGlobalLogger().child('ExpressionEvaluator', { pkg: 'common-utils' });

  /**
   * 求值表达式
   * @param expression 表达式字符串
   * @param context 评估上下文
   * @returns 求值结果
   */
  evaluate(expression: string, context: EvaluationContext): any {
    // 解析为 AST
    const ast = parseAST(expression);
    
    // 评估 AST
    return this.evaluateAST(ast, context);
  }

  /**
   * 评估 AST 节点
   * @param node AST 节点
   * @param context 评估上下文
   * @returns 求值结果
   */
  evaluateAST(node: ASTNode, context: EvaluationContext): any {
    switch (node.type) {
      case 'boolean':
        return this.evaluateBooleanLiteral(node as BooleanLiteralNode);
      
      case 'number':
        return this.evaluateNumberLiteral(node as NumberLiteralNode);
      
      case 'string':
        return this.evaluateStringLiteral(node as StringLiteralNode);
      
      case 'null':
        return this.evaluateNullLiteral(node as NullLiteralNode);
      
      case 'comparison':
        return this.evaluateComparison(node as ComparisonNode, context);
      
      case 'logical':
        return this.evaluateLogical(node as LogicalNode, context);
      
      case 'not':
        return this.evaluateNot(node as NotNode, context);
      
      case 'arithmetic':
        return this.evaluateArithmetic(node as ArithmeticNode, context);
      
      case 'stringMethod':
        return this.evaluateStringMethod(node as StringMethodNode, context);
      
      case 'ternary':
        return this.evaluateTernary(node as TernaryNode, context);
      
      default:
        throw new RuntimeValidationError(
          `Unknown AST node type: ${(node as any).type}`,
          {
            operation: 'ast_evaluation',
            field: 'node',
            value: node
          }
        );
    }
  }

  /**
   * 评估布尔字面量
   */
  private evaluateBooleanLiteral(node: BooleanLiteralNode): boolean {
    return node.value;
  }

  /**
   * 评估数字字面量
   */
  private evaluateNumberLiteral(node: NumberLiteralNode): number {
    return node.value;
  }

  /**
   * 评估字符串字面量
   */
  private evaluateStringLiteral(node: StringLiteralNode): string {
    return node.value;
  }

  /**
   * 评估 null 字面量
   */
  private evaluateNullLiteral(node: NullLiteralNode): null {
    return node.value;
  }

  /**
   * 评估比较操作
   */
  private evaluateComparison(node: ComparisonNode, context: EvaluationContext): boolean {
    const variableValue = this.getVariableValue(node.variablePath, context);

    // 处理变量引用
    let compareValue = node.value;
    if (compareValue && typeof compareValue === 'object' && compareValue.__isVariableRef) {
      compareValue = this.getVariableValue(compareValue.path, context);
    }

    // 如果变量不存在，记录警告日志但不返回 false，让比较操作符正常处理
    if (variableValue === undefined) {
      this.logger.warn(
        `Variable not found in condition evaluation: ${node.variablePath}`,
        { variablePath: node.variablePath, operator: node.operator, compareValue }
      );
    }

    switch (node.operator) {
      case '==':
        return variableValue === compareValue;
      case '!=':
        return variableValue !== compareValue;
      case '>':
        if (typeof variableValue !== 'number' || typeof compareValue !== 'number') {
          this.logger.warn(
            `Type mismatch in comparison: ${node.variablePath} (${typeof variableValue}) > ${typeof compareValue}`,
            { variablePath: node.variablePath, variableValue, compareValue }
          );
          return false;
        }
        return variableValue > compareValue;
      case '<':
        if (typeof variableValue !== 'number' || typeof compareValue !== 'number') {
          this.logger.warn(
            `Type mismatch in comparison: ${node.variablePath} (${typeof variableValue}) < ${typeof compareValue}`,
            { variablePath: node.variablePath, variableValue, compareValue }
          );
          return false;
        }
        return variableValue < compareValue;
      case '>=':
        if (typeof variableValue !== 'number' || typeof compareValue !== 'number') {
          this.logger.warn(
            `Type mismatch in comparison: ${node.variablePath} (${typeof variableValue}) >= ${typeof compareValue}`,
            { variablePath: node.variablePath, variableValue, compareValue }
          );
          return false;
        }
        return variableValue >= compareValue;
      case '<=':
        if (typeof variableValue !== 'number' || typeof compareValue !== 'number') {
          this.logger.warn(
            `Type mismatch in comparison: ${node.variablePath} (${typeof variableValue}) <= ${typeof compareValue}`,
            { variablePath: node.variablePath, variableValue, compareValue }
          );
          return false;
        }
        return variableValue <= compareValue;
      case 'contains':
        return String(variableValue).includes(String(compareValue));
      case 'in':
        if (!Array.isArray(compareValue)) {
          this.logger.warn(
            `Right operand of 'in' operator must be an array: ${typeof compareValue}`,
            { variablePath: node.variablePath, compareValue }
          );
          return false;
        }
        return compareValue.includes(variableValue);
      default:
        throw new RuntimeValidationError(
          `Unknown operator "${node.operator}"`,
          {
            operation: 'comparison_evaluation',
            field: 'operator',
            value: node.operator,
            context: {
              variablePath: node.variablePath,
              variableValue,
              compareValue
            }
          }
        );
    }
  }

  /**
   * 评估逻辑操作
   */
  private evaluateLogical(node: LogicalNode, context: EvaluationContext): boolean {
    const leftResult = this.evaluateAST(node.left, context);
    
    // 短路求值
    if (node.operator === '&&' && !leftResult) {
      return false;
    }
    if (node.operator === '||' && leftResult) {
      return true;
    }
    
    const rightResult = this.evaluateAST(node.right, context);
    
    if (node.operator === '&&') {
      return leftResult && rightResult;
    } else {
      return leftResult || rightResult;
    }
  }

  /**
   * 评估 NOT 操作
   */
  private evaluateNot(node: NotNode, context: EvaluationContext): boolean {
    const operandResult = this.evaluateAST(node.operand, context);
    return !operandResult;
  }

  /**
   * 评估算术运算
   */
  private evaluateArithmetic(node: ArithmeticNode, context: EvaluationContext): number {
    const leftValue = this.evaluateAST(node.left, context);
    const rightValue = this.evaluateAST(node.right, context);

    if (typeof leftValue !== 'number' || typeof rightValue !== 'number') {
      this.logger.warn(
        `Type mismatch in arithmetic operation: ${typeof leftValue} ${node.operator} ${typeof rightValue}`,
        { leftValue, rightValue, operator: node.operator }
      );
      return NaN;
    }

    switch (node.operator) {
      case '+':
        return leftValue + rightValue;
      case '-':
        return leftValue - rightValue;
      case '*':
        return leftValue * rightValue;
      case '/':
        if (rightValue === 0) {
          this.logger.warn('Division by zero', { leftValue, rightValue });
          return NaN;
        }
        return leftValue / rightValue;
      case '%':
        return leftValue % rightValue;
      default:
        throw new RuntimeValidationError(
          `Unknown arithmetic operator: ${node.operator}`,
          {
            operation: 'arithmetic_evaluation',
            field: 'operator',
            value: node.operator
          }
        );
    }
  }

  /**
   * 评估字符串方法
   */
  private evaluateStringMethod(node: StringMethodNode, context: EvaluationContext): any {
    const stringValue = this.getVariableValue(node.variablePath, context);
    
    if (typeof stringValue !== 'string') {
      this.logger.warn(
        `String method called on non-string value: ${typeof stringValue}`,
        { variablePath: node.variablePath, value: stringValue, method: node.method }
      );
      return false;
    }

    switch (node.method) {
      case 'startsWith':
        return stringValue.startsWith(String(node.argument || ''));
      case 'endsWith':
        return stringValue.endsWith(String(node.argument || ''));
      case 'length':
        return stringValue.length;
      case 'toLowerCase':
        return stringValue.toLowerCase();
      case 'toUpperCase':
        return stringValue.toUpperCase();
      case 'trim':
        return stringValue.trim();
      default:
        throw new RuntimeValidationError(
          `Unknown string method: ${node.method}`,
          {
            operation: 'string_method_evaluation',
            field: 'method',
            value: node.method
          }
        );
    }
  }

  /**
   * 评估三元运算符
   */
  private evaluateTernary(node: TernaryNode, context: EvaluationContext): any {
    const conditionResult = this.evaluateAST(node.condition, context);
    
    if (conditionResult) {
      return this.evaluateAST(node.consequent, context);
    } else {
      return this.evaluateAST(node.alternate, context);
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

// 导出单例实例
export const expressionEvaluator = new ExpressionEvaluator();