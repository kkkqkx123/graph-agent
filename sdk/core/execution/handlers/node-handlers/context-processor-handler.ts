/**
 * 上下文处理器节点处理器
 * 负责执行CONTEXT_PROCESSOR节点，处理对话消息的截断、插入、替换、清空、过滤操作
 *
 * 设计原则：
 * - 只包含核心执行逻辑
 * - 集成所有操作函数，不依赖外部operations
 * - 返回执行结果
 */

import type { Node, ContextProcessorNodeConfig } from '@modular-agent/types/node';
import type { Thread } from '@modular-agent/types/thread';
import { ValidationError, ExecutionError } from '@modular-agent/types/errors';
import { now } from '@modular-agent/common-utils';
import type { LLMMessage } from '@modular-agent/types/llm';

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
    /** 按类型过滤（可选） */
    role?: 'system' | 'user' | 'assistant' | 'tool';
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
 * 上下文处理器执行结果
 */
export interface ContextProcessorExecutionResult {
  /** 操作类型 */
  operation: string;
  /** 处理后的消息数量 */
  messageCount: number;
  /** 执行时间（毫秒） */
  executionTime: number;
}

/**
 * 上下文处理器执行上下文
 */
export interface ContextProcessorHandlerContext {
  /** 对话管理器 */
  conversationManager: any; // 简化类型，实际应该使用具体的ConversationManager类型
}

/**
 * 处理截断操作
 * @param conversationManager 会话管理器
 * @param config 截断配置
 */
function handleTruncateOperation(
  conversationManager: any,
  config: any
): void {
  if (!config) {
    throw new ValidationError('Truncate configuration is required', 'config');
  }

  // 如果指定了角色，使用类型索引
  if (config.role) {
    const typeIndices = conversationManager.getTypeIndexManager().getIndicesByRole(config.role);
    
    // 基于类型索引进行截断操作
    let filteredIndices = [...typeIndices];
    
    if (config.keepFirst !== undefined) {
      filteredIndices = filteredIndices.slice(0, config.keepFirst);
    }
    
    if (config.keepLast !== undefined) {
      filteredIndices = filteredIndices.slice(-config.keepLast);
    }
    
    if (config.removeFirst !== undefined) {
      filteredIndices = filteredIndices.slice(config.removeFirst);
    }
    
    if (config.removeLast !== undefined) {
      filteredIndices = filteredIndices.slice(0, -config.removeLast || undefined);
    }
    
    if (config.range) {
      filteredIndices = filteredIndices.slice(config.range.start, config.range.end);
    }
    
    // 更新索引管理器（只保留指定类型的消息）
    conversationManager.setOriginalIndices(filteredIndices);
    
    // 同步更新类型索引
    conversationManager.keepMessageIndices(filteredIndices);
    
    // 开始新批次
    if (filteredIndices.length > 0) {
      const boundaryIndex = Math.min(...filteredIndices);
      conversationManager.getIndexManager().startNewBatch(boundaryIndex);
    } else {
      conversationManager.getIndexManager().reset();
    }
  } else {
    // 原有逻辑：基于当前可见消息
    const currentIndices = conversationManager.getMarkMap().originalIndices;

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
    
    // 同步更新类型索引
    conversationManager.keepMessageIndices(newIndices);

    // 开始新批次，记录边界
    if (newIndices.length > 0) {
      const boundaryIndex = Math.min(...newIndices);
      conversationManager.getIndexManager().startNewBatch(boundaryIndex);
    } else {
      // 如果没有消息了，重置索引管理器
      conversationManager.getIndexManager().reset();
    }
  }
}

/**
 * 处理插入操作
 * @param conversationManager 会话管理器
 * @param config 插入配置
 */
function handleInsertOperation(
  conversationManager: any,
  config: any
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
function handleReplaceOperation(
  conversationManager: any,
  config: any
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
function handleClearOperation(
  conversationManager: any,
  config: any
): void {
  const keepSystemMessage = config?.keepSystemMessage ?? true;
  const allMessages = conversationManager.getAllMessages();

  if (keepSystemMessage) {
    // 找到所有的系统消息（包括工具描述）
    const systemMessageIndices = allMessages
      .map((msg: any, index: number) => msg.role === 'system' ? index : -1)
      .filter((index: number) => index !== -1);
    
    if (systemMessageIndices.length > 0) {
      // 保留所有系统消息
      conversationManager.setOriginalIndices(systemMessageIndices);
      // 开始新批次（工具描述如果存在就保留，不存在就添加）
      conversationManager.startNewBatchWithInitialTools(Math.min(...systemMessageIndices));
    } else {
      // 清空所有消息，重新添加初始工具描述
      conversationManager.getIndexManager().reset();
      conversationManager.startNewBatchWithInitialTools(0);
    }
  } else {
    // 清空所有消息，重新添加初始工具描述
    conversationManager.getIndexManager().reset();
    conversationManager.startNewBatchWithInitialTools(0);
  }
}

/**
 * 处理过滤操作
 * @param conversationManager 会话管理器
 * @param config 过滤配置
 */
function handleFilterOperation(
  conversationManager: any,
  config: any
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
      if (!config.contentContains.some((keyword: string) => content.includes(keyword))) {
        return false;
      }
    }

    // 按内容关键词过滤（排除）
    if (config.contentExcludes && config.contentExcludes.length > 0) {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      if (config.contentExcludes.some((keyword: string) => content.includes(keyword))) {
        return false;
      }
    }

    return true;
  });

  // 更新索引管理器
  conversationManager.setOriginalIndices(filteredIndices);
  
  // 同步更新类型索引
  conversationManager.keepMessageIndices(filteredIndices);

  // 开始新批次
  if (filteredIndices.length > 0) {
    const boundaryIndex = Math.min(...filteredIndices);
    conversationManager.getIndexManager().startNewBatch(boundaryIndex);
  } else {
    // 如果没有消息了，重置索引管理器
    conversationManager.getIndexManager().reset();
  }
}

/**
 * 上下文处理器节点处理器
 * @param thread Thread实例
 * @param node 节点定义
 * @param context 处理器上下文
 * @returns 执行结果
 */
export async function contextProcessorHandler(
  thread: Thread,
  node: Node,
  context: ContextProcessorHandlerContext
): Promise<ContextProcessorExecutionResult> {
  const config = node.config as ContextProcessorNodeConfig;
  const startTime = now();

  try {
    // 1. 转换配置为执行数据（配置已在工作流注册时通过静态验证）
    const executionData = {
      operation: config.operation,
      truncate: config.truncate,
      insert: config.insert,
      replace: config.replace,
      filter: config.filter,
      clear: config.clear
    };

    // 2. 获取ConversationManager
    const conversationManager = context.conversationManager;

    // 3. 根据操作类型执行相应的操作
    switch (executionData.operation) {
      case 'truncate':
        handleTruncateOperation(conversationManager, executionData.truncate!);
        break;
      case 'insert':
        handleInsertOperation(conversationManager, executionData.insert!);
        break;
      case 'replace':
        handleReplaceOperation(conversationManager, executionData.replace!);
        break;
      case 'clear':
        handleClearOperation(conversationManager, executionData.clear!);
        break;
      case 'filter':
        handleFilterOperation(conversationManager, executionData.filter!);
        break;
      default:
        throw new ExecutionError(`Unsupported operation: ${executionData.operation}`, node.id);
    }

    // 4. 获取处理后的消息数量
    const messageCount = conversationManager.getMessages().length;

    const executionTime = now() - startTime;

    return {
      operation: executionData.operation,
      messageCount,
      executionTime
    };
  } catch (error) {
    throw error;
  }
}