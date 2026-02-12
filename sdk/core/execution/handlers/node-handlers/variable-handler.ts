/**
 * Variable节点处理函数
 * 负责执行VARIABLE节点，执行变量表达式，更新变量值
 */

import type { Node, VariableNodeConfig } from '@modular-agent/types/node';
import type { Thread } from '@modular-agent/types/thread';
import { ValidationError } from '@modular-agent/types/errors';
import { now } from '@modular-agent/common-utils';
import { resolvePath } from '@modular-agent/common-utils';

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
 * 使用统一的路径解析逻辑
 */
function resolveVariableReferences(expression: string, thread: Thread): string {
  const variablePattern = /\{\{(\w+(?:\.\w+)*)\}\}/g;

  return expression.replace(variablePattern, (match, varPath) => {
    // 提取根变量名
    const rootVarName = varPath.split('.')[0];

    // 首先尝试从 thread 变量中获取
    let value: any = thread.variableScopes.thread?.[rootVarName];

    // 如果第一部分在 thread 变量中不存在，尝试从 global 变量中获取
    if (value === undefined && thread.variableScopes) {
      value = thread.variableScopes.global[rootVarName];
    }

    // 如果根变量不存在，返回 undefined
    if (value === undefined) {
      return 'undefined';
    }

    // 如果路径包含嵌套，使用 resolvePath 解析剩余路径
    const pathParts = varPath.split('.');
    if (pathParts.length > 1) {
      const remainingPath = pathParts.slice(1).join('.');
      value = resolvePath(remainingPath, value);
    }

    // 格式化值
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
function evaluateExpression(expression: string, variableType: string, thread: Thread): any {
  try {
    // 处理空字符串表达式
    if (!expression.trim()) {
      return '';
    }

    // 创建函数作用域，包含thread作用域的变量
    const threadScope = thread.variableScopes.thread || {};
    const globalScope = thread.variableScopes.global || {};

    const func = new Function(
      ...Object.keys({ ...threadScope, ...globalScope }),
      `return (${expression})`
    );

    const result = func(...Object.values({ ...threadScope, ...globalScope }));
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
      // 对于字符串"not a number"这样的无效转换，应该抛出错误
      if (typeof value === 'string' && value.trim() && isNaN(num)) {
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
      if (value === null) {
        return null;
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
 * @param context 处理器上下文（可选）
 * @returns 执行结果
 */
export async function variableHandler(thread: Thread, node: Node, context?: any): Promise<any> {
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
  const result = evaluateExpression(evaluatedExpression, config.variableType, thread);

  // 验证求值结果类型
  const typedResult = convertType(result, config.variableType);

  // 更新变量
  const variable = thread.variables.find(v => v.name === config.variableName);
  const variableScope = config.scope || 'thread';

  if (variable) {
    variable.value = typedResult;
  } else {
    thread.variables.push({
      name: config.variableName,
      value: typedResult,
      type: config.variableType,
      scope: variableScope,
      readonly: config.readonly || false
    });
  }

  // 根据作用域更新变量值
  switch (variableScope) {
    case 'global':
      thread.variableScopes.global[config.variableName] = typedResult;
      break;
    case 'thread':
      thread.variableScopes.thread[config.variableName] = typedResult;
      break;
    case 'local':
      if (thread.variableScopes.local.length > 0) {
        thread.variableScopes.local[thread.variableScopes.local.length - 1]![config.variableName] = typedResult;
      }
      break;
    case 'loop':
      if (thread.variableScopes.loop.length > 0) {
        thread.variableScopes.loop[thread.variableScopes.loop.length - 1]![config.variableName] = typedResult;
      }
      break;
  }

  // 记录执行历史
  thread.nodeResults.push({
    step: thread.nodeResults.length + 1,
    nodeId: node.id,
    nodeType: node.type,
    status: 'COMPLETED',
    timestamp: now()
  });

  // 返回执行结果
  return {
    variableName: config.variableName,
    value: typedResult,
    type: config.variableType
  };
}