/**
 * 配置转换工具函数
 * 提供LLM相关节点的配置转换功能
 *
 * 注意：验证逻辑已移至 validation/node-validation/ 目录
 */

import type { LLMNodeConfig, ContextProcessorNodeConfig, UserInteractionNodeConfig } from '../../../../types/node';
import type { LLMExecutionRequestData } from '../../executors/llm-executor';
import type { LLMMessage } from '../../../../types/llm';

/**
 * 上下文处理器执行数据
 */
export interface ContextProcessorExecutionData {
  /** 操作类型 */
  operation: 'truncate' | 'insert' | 'replace' | 'clear' | 'filter';
  /** 截断操作配置 */
  truncate?: {
    keepFirst?: number;
    keepLast?: number;
    removeFirst?: number;
    removeLast?: number;
    range?: { start: number; end: number };
  };
  /** 插入操作配置 */
  insert?: {
    position: number;
    messages: LLMMessage[];
  };
  /** 替换操作配置 */
  replace?: {
    index: number;
    message: LLMMessage;
  };
  /** 过滤操作配置 */
  filter?: {
    roles?: ('system' | 'user' | 'assistant' | 'tool')[];
    contentContains?: string[];
    contentExcludes?: string[];
  };
  /** 清空操作配置 */
  clear?: {
    keepSystemMessage?: boolean;
  };
}


/**
 * 转换LLM节点配置为LLM请求数据
 */
export function transformLLMNodeConfig(config: LLMNodeConfig): LLMExecutionRequestData {
  return {
    prompt: config.prompt || '',
    profileId: config.profileId,
    parameters: config.parameters || {},
    dynamicTools: config.dynamicTools,
    maxToolCallsPerRequest: config.maxToolCallsPerRequest,
    stream: false
  };
}



/**
 * 转换上下文处理器节点配置为执行数据
 */
export function transformContextProcessorNodeConfig(config: ContextProcessorNodeConfig): ContextProcessorExecutionData {
  return {
    operation: config.operation,
    truncate: config.truncate,
    insert: config.insert,
    replace: config.replace,
    filter: config.filter,
    clear: config.clear
  };
}