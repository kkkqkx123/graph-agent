/**
 * 配置验证和转换工具函数
 * 提供LLM相关节点的配置验证和转换功能
 */

import type { LLMNodeConfig, ToolNodeConfig, ContextProcessorNodeConfig, UserInteractionNodeConfig } from '../../../../types/node';
import type { LLMExecutionRequestData } from '../../llm-executor';

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
    parameters: {
      temperature: config.parameters?.temperature,
      maxTokens: config.parameters?.maxTokens,
      ...config.parameters
    },
    tools: config.tools
  };
}

/**
 * 验证工具节点配置
 */
export function validateToolNodeConfig(config: any): config is ToolNodeConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }
  
  if (!config.toolName || typeof config.toolName !== 'string') {
    return false;
  }
  
  if (!config.parameters || typeof config.parameters !== 'object') {
    return false;
  }
  
  // 验证超时配置
  if (config.timeout !== undefined && config.timeout <= 0) {
    return false;
  }
  
  // 验证重试配置
  if (config.retries !== undefined && config.retries < 0) {
    return false;
  }
  
  if (config.retryDelay !== undefined && config.retryDelay < 0) {
    return false;
  }
  
  return true;
}

/**
 * 转换工具节点配置为LLM请求数据
 */
export function transformToolNodeConfig(config: ToolNodeConfig): LLMExecutionRequestData {
  return {
    prompt: `Execute tool: ${config.toolName}`,
    profileId: 'default',
    tools: [{
      name: config.toolName,
      description: `Tool: ${config.toolName}`,
      parameters: config.parameters
    }]
  };
}

/**
 * 验证上下文处理器节点配置
 */
export function validateContextProcessorNodeConfig(config: any): config is ContextProcessorNodeConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }
  
  const validTypes = ['transform', 'filter', 'merge', 'split'];
  
  if (!config.processorType || !validTypes.includes(config.processorType)) {
    return false;
  }
  
  if (!config.rules || !Array.isArray(config.rules) || config.rules.length === 0) {
    return false;
  }
  
  // 验证规则
  for (const rule of config.rules) {
    if (!rule.sourcePath || typeof rule.sourcePath !== 'string') {
      return false;
    }
    if (!rule.targetPath || typeof rule.targetPath !== 'string') {
      return false;
    }
  }
  
  return true;
}

/**
 * 转换上下文处理器节点配置为LLM请求数据
 */
export function transformContextProcessorNodeConfig(config: ContextProcessorNodeConfig): LLMExecutionRequestData {
  const rulesDescription = config.rules
    .map(rule => `- ${rule.sourcePath} -> ${rule.targetPath}${rule.transform ? ` (transform: ${rule.transform})` : ''}`)
    .join('\n');

  return {
    prompt: `Process context with type: ${config.processorType}\nRules:\n${rulesDescription}`,
    profileId: 'default'
  };
}

/**
 * 验证用户交互节点配置
 */
export function validateUserInteractionNodeConfig(config: any): config is UserInteractionNodeConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }
  
  const validTypes = ['ask_for_approval', 'ask_for_input', 'ask_for_selection', 'show_message'];
  
  if (!config.userInteractionType || !validTypes.includes(config.userInteractionType)) {
    return false;
  }
  
  return true;
}

/**
 * 转换用户交互节点配置为LLM请求数据
 */
export function transformUserInteractionNodeConfig(config: UserInteractionNodeConfig): LLMExecutionRequestData {
  let prompt: string;
  
  switch (config.userInteractionType) {
    case 'ask_for_approval':
      prompt = `Ask for approval: ${config.showMessage || 'Please approve this action'}`;
      break;
    case 'ask_for_input':
      prompt = `Ask for input: ${config.showMessage || 'Please provide input'}`;
      break;
    case 'ask_for_selection':
      prompt = `Ask for selection: ${config.showMessage || 'Please make a selection'}`;
      break;
    case 'show_message':
      prompt = config.showMessage || 'Show message';
      break;
    default:
      prompt = 'User interaction';
  }
  
  return {
    prompt,
    profileId: 'default'
  };
}