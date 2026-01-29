/**
 * Variable节点处理函数
 * 负责执行VARIABLE节点，执行变量表达式，更新变量值
 */

import type { Node, VariableNodeConfig } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';
import { now } from '../../../../utils';

/**
 * 验证Variable节点配置
 */
function validate(node: Node): void {
  if (node.type !== NodeType.VARIABLE) {
    throw new ValidationError(`Invalid node type for variable handler: ${node.type}`, `node.${node.id}`);
  }

  const config = node.config as VariableNodeConfig;

  if (!config.variableName || typeof config.variableName !== 'string') {
    throw new ValidationError('Variable node must have a valid variableName', `node.${node.id}`);
  }

  if (!config.variableType || !['number', 'string', 'boolean', 'array', 'object'].includes(config.variableType)) {
    throw new ValidationError('Variable node must have a valid variableType (number, string, boolean, array, or object)', `node.${node.id}`);
  }

  if (!config.expression || typeof config.expression !== 'string') {
    throw new ValidationError('Variable node must have a valid expression', `node.${node.id}`);
  }
}

/**
 * 检查节点是否可以执行
 */
function canExecute(thread: Thread, node: Node): boolean {
  if (thread.status !== 'RUNNING') {
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
 * 解析表达式中的变量引用
 */
function resolveVariableReferences(expression: string, thread: Thread): string {
  const variablePattern = /\{\{(\w+(?:\.\w+)*)\}\}/g;

  return expression.replace(variablePattern, (match, varPath) => {
    const parts = varPath.split('.');
    // 首先尝试从 local 变量中获取
    let value: any = thread.variableValues?.[parts[0]];
    
    // 如果第一部分在 local 变量中不存在，尝试从 global 变量中获取
    if (value === undefined && thread.globalVariableValues) {
      value = thread.globalVariableValues[parts[0]];
    }

    for (let i = 1; i < parts.length; i++) {
      if (value === null || value === undefined) {
        return 'undefined';
      }
      value = value[parts[i]];
    }

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
 */
function evaluateExpression(expression: string, variableType: string): any {
  try {
    const result = new Function(`return (${expression})`)();
    return result;
  } catch (error) {
    throw new ValidationError(`Failed to evaluate expression: ${expression}`, 'variable.expression');
  }
}

/**
 * 类型转换
 */
function convertType(value: any, targetType: string): any {
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

/**
 * Variable节点处理函数
 * @param thread Thread实例
 * @param node 节点定义
 * @returns 执行结果
 */
export async function variableHandler(thread: Thread, node: Node): Promise<any> {
  // 验证节点配置
  validate(node);

  // 检查是否可以执行
  if (!canExecute(thread, node)) {
    return {
      nodeId: node.id,
      nodeType: node.type,
      status: 'SKIPPED',
      step: thread.nodeResults.length + 1,
      executionTime: 0
    };
  }

  const config = node.config as VariableNodeConfig;

  // 解析表达式中的变量引用
  const evaluatedExpression = resolveVariableReferences(config.expression, thread);

  // 执行表达式求值
  const result = evaluateExpression(evaluatedExpression, config.variableType);

  // 验证求值结果类型
  const typedResult = convertType(result, config.variableType);

  // 更新变量
  const variable = thread.variables.find(v => v.name === config.variableName);
  if (variable) {
    variable.value = typedResult;
  } else {
    thread.variables.push({
      name: config.variableName,
      value: typedResult,
      type: config.variableType,
      scope: config.scope || 'local',
      readonly: config.readonly || false
    });
  }
  thread.variableValues[config.variableName] = typedResult;

  // 记录执行历史
  thread.nodeResults.push({
    step: thread.nodeResults.length + 1,
    nodeId: node.id,
    nodeType: node.type,
    status: 'COMPLETED',
    timestamp: now(),
    data: {
      variableName: config.variableName,
      value: typedResult,
      type: config.variableType
    }
  });

  // 返回执行结果
  return {
    variableName: config.variableName,
    value: typedResult,
    type: config.variableType
  };
}