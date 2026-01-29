/**
 * Tool节点处理函数
 * 负责执行TOOL节点，调用工具服务，处理工具响应
 */

import type { Node, ToolNodeConfig } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';
import { now } from '../../../../utils';

/**
 * 验证Tool节点配置
 */
function validate(node: Node): void {
  if (node.type !== NodeType.TOOL) {
    throw new ValidationError(`Invalid node type for tool handler: ${node.type}`, `node.${node.id}`);
  }

  const config = node.config as ToolNodeConfig;

  if (!config.toolName || typeof config.toolName !== 'string') {
    throw new ValidationError('Tool node must have a valid toolName', `node.${node.id}`);
  }

  if (!config.parameters || typeof config.parameters !== 'object') {
    throw new ValidationError('Tool node must have parameters object', `node.${node.id}`);
  }

  if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
    throw new ValidationError('Tool node timeout must be a positive number', `node.${node.id}`);
  }

  if (config.retries !== undefined && (typeof config.retries !== 'number' || config.retries < 0)) {
    throw new ValidationError('Tool node retries must be a non-negative number', `node.${node.id}`);
  }

  if (config.retryDelay !== undefined && (typeof config.retryDelay !== 'number' || config.retryDelay < 0)) {
    throw new ValidationError('Tool node retryDelay must be a non-negative number', `node.${node.id}`);
  }
}

/**
 * 检查节点是否可以执行
 */
function canExecute(thread: Thread, node: Node): boolean {
  if (thread.status !== 'RUNNING') {
    return false;
  }
  return true;
}

/**
 * 解析参数中的变量引用
 */
function resolveVariableReferences(parameters: Record<string, any>, thread: Thread): Record<string, any> {
  const resolved: Record<string, any> = {};

  for (const [key, value] of Object.entries(parameters)) {
    if (typeof value === 'string') {
      resolved[key] = resolveStringVariables(value, thread);
    } else if (typeof value === 'object' && value !== null) {
      resolved[key] = resolveVariableReferences(value, thread);
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}

/**
 * 解析字符串中的变量引用
 */
function resolveStringVariables(str: string, thread: Thread): string {
  const variablePattern = /\{\{(\w+(?:\.\w+)*)\}\}/g;

  return str.replace(variablePattern, (match, varPath) => {
    const parts = varPath.split('.');
    // 首先尝试从 local 变量中获取
    let value: any = thread.variableValues || {};
    
    // 如果第一部分在 local 变量中不存在，尝试从 global 变量中获取
    if (parts.length > 0 && !(parts[0] in value) && thread.globalVariableValues) {
      value = thread.globalVariableValues;
    }

    for (const part of parts) {
      if (value === null || value === undefined) {
        return `{{${varPath}}}`;
      }
      value = value[part];
    }

    if (typeof value === 'string') {
      return value;
    } else if (typeof value === 'object') {
      return JSON.stringify(value);
    } else {
      return String(value);
    }
  });
}

/**
 * 执行工具
 */
async function executeTool(
  toolName: string,
  parameters: Record<string, any>,
  timeout: number
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Tool execution timeout after ${timeout}ms`));
    }, timeout);

    try {
      setTimeout(() => {
        clearTimeout(timer);

        resolve({
          success: true,
          toolName,
          parameters,
          result: { message: `Mock result for tool: ${toolName}` },
          executionTime: 100
        });
      }, 100);
    } catch (error) {
      clearTimeout(timer);
      reject(error);
    }
  });
}

/**
 * 睡眠指定时间
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Tool节点处理函数
 * @param thread Thread实例
 * @param node 节点定义
 * @returns 执行结果
 */
export async function toolHandler(thread: Thread, node: Node): Promise<any> {
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

  const config = node.config as ToolNodeConfig;
  const timeout = config.timeout || 30000;
  const retries = config.retries || 0;
  const retryDelay = config.retryDelay || 1000;

  // 解析参数中的变量引用
  const resolvedParameters = resolveVariableReferences(config.parameters, thread);

  // 执行工具（带重试）
  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      const result = await executeTool(config.toolName, resolvedParameters, timeout);

      // 记录执行历史
      thread.nodeResults.push({
        step: thread.nodeResults.length + 1,
        nodeId: node.id,
        nodeType: node.type,
        status: 'COMPLETED',
        timestamp: now(),
        data: result
      });

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries) {
        await sleep(retryDelay);
        attempt++;
      } else {
        throw lastError;
      }
    }
  }

  throw lastError || new Error('Tool execution failed');
}