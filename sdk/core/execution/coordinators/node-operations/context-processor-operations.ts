/**
 * 上下文处理器操作
 * 提供对 ConversationManager 的各种操作函数
 * 
 * 职责：
 * - 提供可复用的上下文处理操作
 * - 不依赖协调器状态，只依赖传入参数
 * - 支持截断、插入、替换、清空、过滤等操作
 */

import { ValidationError, ExecutionError } from '../../../../types/errors';
import type { ContextProcessorExecutionData } from '../../handlers/node-handlers/config-utils';

/**
 * 处理截断操作
 * @param conversationManager 会话管理器
 * @param config 截断配置
 */
export function handleTruncateOperation(
  conversationManager: any,
  config: ContextProcessorExecutionData['truncate']
): void {
  if (!config) {
    throw new ValidationError('Truncate configuration is required', 'config');
  }

  // 获取当前可见消息的索引
  const currentIndices = conversationManager.getMarkMap().originalIndices;
  const allMessages = conversationManager.getAllMessages();

  // 计算新的索引数组（基于当前可见消息）
  let newIndices = [...currentIndices];

  // 保留前N条消息
  if (config.keepFirst !== undefined) {
    newIndices = newIndices.slice(0, config.keepFirst);
  }

  // 保留后N条消息
  if (config.keepLast !== undefined) {
    newIndices = newIndices.slice(-config.keepLast);
  }

  // 删除前N条消息
  if (config.removeFirst !== undefined) {
    newIndices = newIndices.slice(config.removeFirst);
  }

  // 删除后N条消息
  if (config.removeLast !== undefined) {
    newIndices = newIndices.slice(0, -config.removeLast || undefined);
  }

  // 保留索引范围
  if (config.range) {
    newIndices = newIndices.slice(config.range.start, config.range.end);
  }

  // 更新索引管理器
  conversationManager.setOriginalIndices(newIndices);

  // 开始新批次，记录压缩边界
  if (newIndices.length > 0) {
    const boundaryIndex = Math.min(...newIndices);
    conversationManager.getIndexManager().startNewBatch(boundaryIndex);
  } else {
    // 如果没有消息了，重置索引管理器
    conversationManager.getIndexManager().reset();
  }
}

/**
 * 处理插入操作
 * @param conversationManager 会话管理器
 * @param config 插入配置
 */
export function handleInsertOperation(
  conversationManager: any,
  config: ContextProcessorExecutionData['insert']
): void {
  if (!config) {
    throw new ValidationError('Insert configuration is required', 'config');
  }

  const currentIndices = conversationManager.getMarkMap().originalIndices;
  const position = config.position;

  // -1表示在末尾插入
  if (position === -1) {
    for (const msg of config.messages) {
      conversationManager.addMessage(msg);
    }
    return;
  }

  // 在指定位置插入：追加到末尾，然后更新索引映射
  const insertedIndices: number[] = [];
  for (const msg of config.messages) {
    const newIndex = conversationManager.addMessage(msg) - 1;
    insertedIndices.push(newIndex);
  }
  
  // 重新计算索引顺序
  const newIndices = [...currentIndices];
  // 在指定位置插入新消息的索引
  newIndices.splice(position, 0, ...insertedIndices);
  
  // 更新索引管理器
  conversationManager.setOriginalIndices(newIndices);
}

/**
 * 处理替换操作
 * @param conversationManager 会话管理器
 * @param config 替换配置
 */
export function handleReplaceOperation(
  conversationManager: any,
  config: ContextProcessorExecutionData['replace']
): void {
  if (!config) {
    throw new ValidationError('Replace configuration is required', 'config');
  }

  const allMessages = conversationManager.getAllMessages();
  const currentIndices = conversationManager.getMarkMap().originalIndices;

  // 验证索引有效性
  if (config.index >= currentIndices.length) {
    throw new ExecutionError(`Index ${config.index} is out of bounds`);
  }

  // 获取实际的消息索引
  const actualMessageIndex = currentIndices[config.index];
  allMessages[actualMessageIndex] = config.message;

  // 索引映射不需要改变，因为消息数量没变
}

/**
 * 处理清空操作
 * @param conversationManager 会话管理器
 * @param config 清空配置
 */
export function handleClearOperation(
  conversationManager: any,
  config: ContextProcessorExecutionData['clear']
): void {
  const keepSystemMessage = config?.keepSystemMessage ?? true;
  
  if (keepSystemMessage) {
    const allMessages = conversationManager.getAllMessages();
    if (allMessages.length > 0 && allMessages[0].role === 'system') {
      // 只保留系统消息
      conversationManager.setOriginalIndices([0]);
      conversationManager.getIndexManager().startNewBatch(0);
    } else {
      // 清空所有消息
      conversationManager.getIndexManager().reset();
    }
  } else {
    // 清空所有消息
    conversationManager.getIndexManager().reset();
  }
}

/**
 * 处理过滤操作
 * @param conversationManager 会话管理器
 * @param config 过滤配置
 */
export function handleFilterOperation(
  conversationManager: any,
  config: ContextProcessorExecutionData['filter']
): void {
  if (!config) {
    throw new ValidationError('Filter configuration is required', 'config');
  }

  const allMessages = conversationManager.getAllMessages();
  const currentIndices = conversationManager.getMarkMap().originalIndices;

  // 基于当前可见消息进行过滤
  const filteredIndices = currentIndices.filter((originalIndex: number) => {
    const msg = allMessages[originalIndex];
    
    // 按角色过滤
    if (config.roles && config.roles.length > 0) {
      if (!config.roles.includes(msg.role as any)) {
        return false;
      }
    }

    // 按内容关键词过滤（包含）
    if (config.contentContains && config.contentContains.length > 0) {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      if (!config.contentContains.some(keyword => content.includes(keyword))) {
        return false;
      }
    }

    // 按内容关键词过滤（排除）
    if (config.contentExcludes && config.contentExcludes.length > 0) {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      if (config.contentExcludes.some(keyword => content.includes(keyword))) {
        return false;
      }
    }

    return true;
  });

  // 更新索引管理器
  conversationManager.setOriginalIndices(filteredIndices);

  // 开始新批次
  if (filteredIndices.length > 0) {
    const boundaryIndex = Math.min(...filteredIndices);
    conversationManager.getIndexManager().startNewBatch(boundaryIndex);
  } else {
    // 如果没有消息了，重置索引管理器
    conversationManager.getIndexManager().reset();
  }
}