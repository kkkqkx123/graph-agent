/**
 * 配置验证和转换工具函数
 * 提供LLM相关节点的配置验证和转换功能
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
 * 验证LLM节点配置
 */
export function validateLLMNodeConfig(config: any): config is LLMNodeConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }

  if (!config.profileId || typeof config.profileId !== 'string') {
    return false;
  }

  // 验证参数
  if (config.parameters) {
    if (typeof config.parameters !== 'object') {
      return false;
    }

    if (config.parameters.temperature !== undefined) {
      if (typeof config.parameters.temperature !== 'number' ||
        config.parameters.temperature < 0 ||
        config.parameters.temperature > 2) {
        return false;
      }
    }

    if (config.parameters.maxTokens !== undefined) {
      if (typeof config.parameters.maxTokens !== 'number' ||
        config.parameters.maxTokens <= 0) {
        return false;
      }
    }
  }

  return true;
}

/**
 * 转换LLM节点配置为LLM请求数据
 */
export function transformLLMNodeConfig(config: LLMNodeConfig): LLMExecutionRequestData {
  return {
    prompt: config.prompt || '',
    profileId: config.profileId,
    parameters: config.parameters || {},
    // maxToolCalls由LLM模块内部使用，不传递给LLM执行器
    dynamicTools: config.dynamicTools,
    stream: false
  };
}

/**
 * 验证上下文处理器节点配置
 */
export function validateContextProcessorNodeConfig(config: any): config is ContextProcessorNodeConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const validOperations = ['truncate', 'insert', 'replace', 'clear', 'filter'];
  if (!config.operation || !validOperations.includes(config.operation)) {
    return false;
  }

  // 验证必需的配置字段
  const requiredFieldMap: Record<string, string> = {
    'truncate': 'truncate',
    'insert': 'insert',
    'replace': 'replace',
    'clear': 'clear',
    'filter': 'filter'
  };

  const requiredField = requiredFieldMap[config.operation];
  if (!requiredField || !config[requiredField]) {
    return false;
  }

  // 验证具体配置
  switch (config.operation) {
    case 'truncate':
      return validateTruncateConfig(config.truncate);
    case 'insert':
      return validateInsertConfig(config.insert);
    case 'replace':
      return validateReplaceConfig(config.replace);
    case 'clear':
      return validateClearConfig(config.clear);
    case 'filter':
      return validateFilterConfig(config.filter);
    default:
      return false;
  }
}

/**
 * 验证截断操作配置
 */
function validateTruncateConfig(config: any): boolean {
  if (!config || typeof config !== 'object') {
    return false;
  }

  // 至少需要指定一种截断方式
  const hasKeepFirst = config.keepFirst !== undefined;
  const hasKeepLast = config.keepLast !== undefined;
  const hasRemoveFirst = config.removeFirst !== undefined;
  const hasRemoveLast = config.removeLast !== undefined;
  const hasRange = config.range !== undefined;

  if (!hasKeepFirst && !hasKeepLast && !hasRemoveFirst && !hasRemoveLast && !hasRange) {
    return false;
  }

  // 验证数值参数
  if (hasKeepFirst && (typeof config.keepFirst !== 'number' || config.keepFirst < 0)) {
    return false;
  }
  if (hasKeepLast && (typeof config.keepLast !== 'number' || config.keepLast < 0)) {
    return false;
  }
  if (hasRemoveFirst && (typeof config.removeFirst !== 'number' || config.removeFirst < 0)) {
    return false;
  }
  if (hasRemoveLast && (typeof config.removeLast !== 'number' || config.removeLast < 0)) {
    return false;
  }

  // 验证range参数
  if (hasRange) {
    if (!config.range || typeof config.range !== 'object') {
      return false;
    }
    if (typeof config.range.start !== 'number' || config.range.start < 0) {
      return false;
    }
    if (typeof config.range.end !== 'number' || config.range.end < 0) {
      return false;
    }
    if (config.range.start >= config.range.end) {
      return false;
    }
  }

  return true;
}

/**
 * 验证插入操作配置
 */
function validateInsertConfig(config: any): boolean {
  if (!config || typeof config !== 'object') {
    return false;
  }

  if (typeof config.position !== 'number' || config.position < -1) {
    return false;
  }

  if (!config.messages || !Array.isArray(config.messages) || config.messages.length === 0) {
    return false;
  }

  // 验证每条消息
  for (const msg of config.messages) {
    if (!msg || typeof msg !== 'object') {
      return false;
    }
    if (!msg.role || typeof msg.role !== 'string') {
      return false;
    }
    if (msg.content === undefined) {
      return false;
    }
  }

  return true;
}

/**
 * 验证替换操作配置
 */
function validateReplaceConfig(config: any): boolean {
  if (!config || typeof config !== 'object') {
    return false;
  }

  if (typeof config.index !== 'number' || config.index < 0) {
    return false;
  }

  if (!config.message || typeof config.message !== 'object') {
    return false;
  }

  if (!config.message.role || typeof config.message.role !== 'string') {
    return false;
  }

  if (config.message.content === undefined) {
    return false;
  }

  return true;
}

/**
 * 验证清空操作配置
 */
function validateClearConfig(config: any): boolean {
  if (!config || typeof config !== 'object') {
    return false;
  }

  // keepSystemMessage是可选的，默认为true
  if (config.keepSystemMessage !== undefined && typeof config.keepSystemMessage !== 'boolean') {
    return false;
  }

  return true;
}

/**
 * 验证过滤操作配置
 */
function validateFilterConfig(config: any): boolean {
  if (!config || typeof config !== 'object') {
    return false;
  }

  // 至少需要指定一种过滤条件
  const hasRoles = config.roles !== undefined;
  const hasContentContains = config.contentContains !== undefined;
  const hasContentExcludes = config.contentExcludes !== undefined;

  if (!hasRoles && !hasContentContains && !hasContentExcludes) {
    return false;
  }

  // 验证roles参数
  if (hasRoles) {
    if (!Array.isArray(config.roles) || config.roles.length === 0) {
      return false;
    }
    const validRoles = ['system', 'user', 'assistant', 'tool'];
    for (const role of config.roles) {
      if (!validRoles.includes(role)) {
        return false;
      }
    }
  }

  // 验证contentContains参数
  if (hasContentContains) {
    if (!Array.isArray(config.contentContains) || config.contentContains.length === 0) {
      return false;
    }
    for (const keyword of config.contentContains) {
      if (typeof keyword !== 'string') {
        return false;
      }
    }
  }

  // 验证contentExcludes参数
  if (hasContentExcludes) {
    if (!Array.isArray(config.contentExcludes) || config.contentExcludes.length === 0) {
      return false;
    }
    for (const keyword of config.contentExcludes) {
      if (typeof keyword !== 'string') {
        return false;
      }
    }
  }

  return true;
}

/**
 * 验证用户交互节点配置
 */
export function validateUserInteractionNodeConfig(config: any): config is UserInteractionNodeConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }

  // 验证 operationType
  const validOperationTypes = ['UPDATE_VARIABLES', 'ADD_MESSAGE'];
  if (!config.operationType || !validOperationTypes.includes(config.operationType)) {
    return false;
  }

  // 验证 prompt
  if (!config.prompt || typeof config.prompt !== 'string') {
    return false;
  }

  // 根据 operationType 验证相应的配置
  if (config.operationType === 'UPDATE_VARIABLES') {
    if (!config.variables || !Array.isArray(config.variables) || config.variables.length === 0) {
      return false;
    }
    // 验证每个变量配置
    for (const variable of config.variables) {
      if (!variable.variableName || !variable.expression || !variable.scope) {
        return false;
      }
    }
  } else if (config.operationType === 'ADD_MESSAGE') {
    if (!config.message || !config.message.role || !config.message.contentTemplate) {
      return false;
    }
  }

  return true;
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