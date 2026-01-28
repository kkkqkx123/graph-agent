/**
 * ContextProcessor节点处理函数
 * 负责执行CONTEXT_PROCESSOR节点，处理和转换上下文数据
 */

import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';

/**
 * ContextProcessor节点配置
 */
interface ContextProcessorNodeConfig {
  /** 处理类型 */
  processorType: 'transform' | 'filter' | 'merge' | 'split';
  /** 处理规则 */
  rules: Array<{
    /** 源路径 */
    sourcePath: string;
    /** 目标路径 */
    targetPath: string;
    /** 转换函数 */
    transform?: string;
  }>;
}

/**
 * 验证ContextProcessor节点配置
 */
function validate(node: Node): void {
  if (node.type !== NodeType.CONTEXT_PROCESSOR) {
    throw new ValidationError(`Invalid node type for context processor handler: ${node.type}`, `node.${node.id}`);
  }

  const config = node.config as ContextProcessorNodeConfig;

  if (!config.processorType || !['transform', 'filter', 'merge', 'split'].includes(config.processorType)) {
    throw new ValidationError('ContextProcessor node must have a valid processorType (transform, filter, merge, or split)', `node.${node.id}`);
  }

  if (!config.rules || !Array.isArray(config.rules) || config.rules.length === 0) {
    throw new ValidationError('ContextProcessor node must have at least one rule', `node.${node.id}`);
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
 * 获取嵌套属性值
 */
function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let value = obj;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (value === null || value === undefined || !part) {
      return undefined;
    }
    value = value[part];
  }
  return value;
}

/**
 * 设置嵌套属性值
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (part === undefined) {
      return;
    }
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }
  const lastPart = parts[parts.length - 1];
  if (lastPart !== undefined) {
    current[lastPart] = value;
  }
}

/**
 * ContextProcessor节点处理函数
 * @param thread Thread实例
 * @param node 节点定义
 * @returns 执行结果
 */
export async function contextProcessorHandler(thread: Thread, node: Node): Promise<any> {
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

  const config = node.config as ContextProcessorNodeConfig;
  const results: any[] = [];

  // 根据处理类型执行不同的处理逻辑
  switch (config.processorType) {
    case 'transform':
      for (const rule of config.rules) {
        const sourceValue = getNestedValue(thread.variableValues, rule.sourcePath);
        let targetValue = sourceValue;

        if (rule.transform) {
          try {
            const transformFunc = new Function('value', `return ${rule.transform}`);
            targetValue = transformFunc(sourceValue);
          } catch (error) {
            console.error(`Failed to apply transform: ${rule.transform}`, error);
          }
        }

        setNestedValue(thread.variableValues, rule.targetPath, targetValue);
        results.push({ sourcePath: rule.sourcePath, targetPath: rule.targetPath, value: targetValue });
      }
      break;

    case 'filter':
      // 过滤逻辑
      break;

    case 'merge':
      // 合并逻辑
      break;

    case 'split':
      // 分割逻辑
      break;
  }

  return {
    processorType: config.processorType,
    results
  };
}