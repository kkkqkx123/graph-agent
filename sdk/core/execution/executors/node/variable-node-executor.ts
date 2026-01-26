/**
 * Variable节点执行器
 * 负责执行VARIABLE节点，执行变量表达式，更新变量值
 */

import { NodeExecutor } from './base-node-executor';
import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';

/**
 * Variable节点配置
 */
interface VariableNodeConfig {
  /** 变量名称 */
  variableName: string;
  /** 变量类型 */
  variableType: 'number' | 'string' | 'boolean' | 'array' | 'object';
  /** 变量表达式 */
  expression: string;
  /** 变量作用域 */
  scope?: 'local' | 'global';
  /** 是否只读 */
  readonly?: boolean;
}

/**
 * Variable节点执行器
 */
export class VariableNodeExecutor extends NodeExecutor {
  /**
   * 验证节点配置
   */
  protected override validate(node: Node): boolean {
    // 检查节点类型
    if (node.type !== NodeType.VARIABLE) {
      return false;
    }

    const config = node.config as VariableNodeConfig;

    // 检查必需的配置项
    if (!config.variableName || typeof config.variableName !== 'string') {
      throw new ValidationError('Variable node must have a valid variableName', `node.${node.id}`);
    }

    if (!config.variableType || !['number', 'string', 'boolean', 'array', 'object'].includes(config.variableType)) {
      throw new ValidationError('Variable node must have a valid variableType (number, string, boolean, array, or object)', `node.${node.id}`);
    }

    if (!config.expression || typeof config.expression !== 'string') {
      throw new ValidationError('Variable node must have a valid expression', `node.${node.id}`);
    }

    return true;
  }

  /**
   * 检查节点是否可以执行
   */
  protected override canExecute(thread: Thread, node: Node): boolean {
    // 调用父类检查
    if (!super.canExecute(thread, node)) {
      return false;
    }

    const config = node.config as VariableNodeConfig;

    // 检查变量是否只读
    const existingVariable = thread.variables?.find(v => v.name === config.variableName);
    if (existingVariable && existingVariable.readonly) {
      return false;
    }

    return true;
  }

  /**
   * 执行节点的具体逻辑
   */
  protected override async doExecute(thread: Thread, node: Node): Promise<any> {
    const config = node.config as VariableNodeConfig;

    // 步骤1：解析表达式中的变量引用
    const evaluatedExpression = this.resolveVariableReferences(config.expression, thread);

    // 步骤2：执行表达式求值
    const result = this.evaluateExpression(evaluatedExpression, config.variableType);

    // 步骤3：验证求值结果类型
    const typedResult = this.convertType(result, config.variableType);

    // 步骤4：更新变量值
    if (!thread.variableValues) {
      thread.variableValues = {};
    }
    thread.variableValues[config.variableName] = typedResult;

    // 更新variables数组
    if (!thread.variables) {
      thread.variables = [];
    }
    const existingIndex = thread.variables.findIndex(v => v.name === config.variableName);
    const variableData = {
      name: config.variableName,
      value: typedResult,
      type: config.variableType,
      scope: config.scope || 'local',
      readonly: config.readonly || false,
      metadata: {
        updatedAt: Date.now()
      }
    };

    if (existingIndex >= 0) {
      thread.variables[existingIndex] = variableData;
    } else {
      thread.variables.push(variableData);
    }

    // 步骤5：记录执行历史
    thread.nodeResults.push({
      step: thread.nodeResults.length + 1,
      nodeId: node.id,
      nodeType: node.type,
      status: 'COMPLETED',
      timestamp: Date.now(),
      action: 'variable',
      details: {
        variableName: config.variableName,
        variableType: config.variableType,
        expression: config.expression,
        result: typedResult
      }
    });

    // 步骤6：返回执行结果
    return {
      variableName: config.variableName,
      value: typedResult,
      type: config.variableType
    };
  }

  /**
   * 解析表达式中的变量引用
   * @param expression 表达式
   * @param thread Thread实例
   * @returns 解析后的表达式
   */
  private resolveVariableReferences(expression: string, thread: Thread): string {
    const variablePattern = /\{\{(\w+(?:\.\w+)*)\}\}/g;

    return expression.replace(variablePattern, (match, varPath) => {
      // 从variableValues获取变量值
      const parts = varPath.split('.');
      let value: any = thread.variableValues || {};

      for (const part of parts) {
        if (value === null || value === undefined) {
          return 'undefined';
        }
        value = value[part];
      }

      // 根据值的类型返回字符串表示
      if (typeof value === 'string') {
        return `'${value}'`;
      } else if (typeof value === 'object') {
        return JSON.stringify(value);
      } else {
        return String(value);
      }
    });
  }

  /**
   * 执行表达式求值
   * @param expression 表达式
   * @param variableType 变量类型
   * @returns 求值结果
   */
  private evaluateExpression(expression: string, variableType: string): any {
    try {
      // 使用安全的表达式求值
      // 注意：这里使用Function构造函数，实际生产环境应该使用更安全的表达式求值器
      const result = new Function(`return (${expression})`)();
      return result;
    } catch (error) {
      throw new ValidationError(`Failed to evaluate expression: ${expression}`, 'variable.expression');
    }
  }

  /**
   * 类型转换
   * @param value 值
   * @param targetType 目标类型
   * @returns 转换后的值
   */
  private convertType(value: any, targetType: string): any {
    switch (targetType) {
      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          throw new ValidationError(`Failed to convert value to number: ${value}`, 'variable.type');
        }
        return num;

      case 'string':
        return String(value);

      case 'boolean':
        return Boolean(value);

      case 'array':
        if (Array.isArray(value)) {
          return value;
        }
        try {
          return Array.from(value);
        } catch (error) {
          throw new ValidationError(`Failed to convert value to array: ${value}`, 'variable.type');
        }

      case 'object':
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return value;
        }
        try {
          return Object(value);
        } catch (error) {
          throw new ValidationError(`Failed to convert value to object: ${value}`, 'variable.type');
        }

      default:
        throw new ValidationError(`Invalid variable type: ${targetType}`, 'variable.type');
    }
  }
}
