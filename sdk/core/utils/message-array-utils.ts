/**
 * 消息数组操作工具类
 *
 * 提供纯函数式的消息数组操作方法，所有方法都返回新的数组，不修改原数组
 *
 * 设计原则：
 * - 纯函数设计：无副作用，输入数组返回新数组
 * - 不可变性：基于索引操作，不修改原数组
 * - 可组合性：支持链式调用和组合操作
 * - 类型安全：完整的 TypeScript 类型支持
 * - 职责单一：每个方法只做一件事
 */

import type { LLMMessage } from '@modular-agent/types';
import type { MessageRole } from '@modular-agent/types';

/**
 * 截断选项
 */
export interface TruncateOptions {
  /** 保留前N条消息 */
  keepFirst?: number;
  /** 保留后N条消息 */
  keepLast?: number;
  /** 删除前N条消息 */
  removeFirst?: number;
  /** 删除后N条消息 */
  removeLast?: number;
  /** 按范围截断 */
  range?: { start: number; end: number };
  /** 按角色过滤后截断 */
  role?: MessageRole;
}

/**
 * 内容过滤选项
 */
export interface ContentFilterOptions {
  /** 包含关键词 */
  contains?: string[];
  /** 排除关键词 */
  excludes?: string[];
}

/**
 * 消息快照
 */
export interface MessageSnapshot {
  /** 消息数组 */
  messages: LLMMessage[];
  /** 快照时间戳 */
  timestamp: number;
  /** 线程ID */
  threadId?: string;
  /** 工作流ID */
  workflowId?: string;
  /** 消息数量 */
  messageCount: number;
}

/**
 * 消息验证结果
 */
export interface MessageValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息 */
  errors: string[];
}

/**
 * 消息分组结果
 */
export type MessageGroupByRole = Record<MessageRole, LLMMessage[]>;

/**
 * 消息数组操作工具类
 */
export class MessageArrayUtils {
  /**
   * 截断消息数组
   * @param messages 原始消息数组
   * @param options 截断选项
   * @returns 截断后的新消息数组
   */
  static truncateMessages(
    messages: LLMMessage[],
    options: TruncateOptions
  ): LLMMessage[] {
    let result = [...messages];

    // 如果指定了角色，先按角色过滤
    if (options.role) {
      result = result.filter(msg => msg.role === options.role);
    }

    // 保留前N条消息
    if (options.keepFirst !== undefined) {
      if (options.keepFirst === 0) {
        return [];
      }
      result = result.slice(0, options.keepFirst);
    }

    // 保留后N条消息
    if (options.keepLast !== undefined) {
      if (options.keepLast === 0) {
        return [];
      }
      result = result.slice(-options.keepLast);
    }

    // 删除前N条消息
    if (options.removeFirst !== undefined && options.removeFirst > 0) {
      result = result.slice(options.removeFirst);
    }

    // 删除后N条消息
    if (options.removeLast !== undefined && options.removeLast > 0) {
      result = result.slice(0, -options.removeLast);
    }

    // 按范围截断
    if (options.range) {
      result = result.slice(options.range.start, options.range.end);
    }

    return result;
  }

  /**
   * 在指定位置插入消息
   * @param messages 原始消息数组
   * @param position 插入位置（-1表示末尾）
   * @param newMessages 要插入的消息数组
   * @returns 插入后的新消息数组
   */
  static insertMessages(
    messages: LLMMessage[],
    position: number,
    newMessages: LLMMessage[]
  ): LLMMessage[] {
    if (newMessages.length === 0) {
      return [...messages];
    }

    // -1表示在末尾插入
    if (position === -1) {
      return [...messages, ...newMessages];
    }

    // 处理负数索引
    let insertIndex = position;
    if (insertIndex < 0) {
      insertIndex = messages.length + insertIndex + 1;
    }

    // 边界检查
    if (insertIndex < 0) {
      insertIndex = 0;
    } else if (insertIndex > messages.length) {
      insertIndex = messages.length;
    }

    const result = [...messages];
    result.splice(insertIndex, 0, ...newMessages);
    return result;
  }

  /**
   * 替换指定索引的消息
   * @param messages 原始消息数组
   * @param index 要替换的索引
   * @param newMessage 新消息
   * @returns 替换后的新消息数组
   * @throws Error 当索引越界时抛出异常
   */
  static replaceMessage(
    messages: LLMMessage[],
    index: number,
    newMessage: LLMMessage
  ): LLMMessage[] {
    // 处理负数索引
    let actualIndex = index;
    if (index < 0) {
      actualIndex = messages.length + index;
    }

    // 验证索引有效性
    if (actualIndex < 0 || actualIndex >= messages.length) {
      throw new Error(`Index ${index} is out of bounds. Array length: ${messages.length}`);
    }

    const result = [...messages];
    result[actualIndex] = newMessage;
    return result;
  }

  /**
   * 清空消息数组
   * @param messages 原始消息数组
   * @param keepSystemMessage 是否保留系统消息
   * @returns 清空后的新消息数组
   */
  static clearMessages(
    messages: LLMMessage[],
    keepSystemMessage: boolean = true
  ): LLMMessage[] {
    if (!keepSystemMessage) {
      return [];
    }

    // 只保留系统消息
    return messages.filter(msg => msg.role === 'system');
  }

  /**
   * 按角色过滤消息
   * @param messages 原始消息数组
   * @param roles 要保留的角色数组
   * @returns 过滤后的新消息数组
   */
  static filterMessagesByRole(
    messages: LLMMessage[],
    roles: MessageRole[]
  ): LLMMessage[] {
    return messages.filter(msg => roles.includes(msg.role));
  }

  /**
   * 按内容关键词过滤消息
   * @param messages 原始消息数组
   * @param options 过滤选项
   * @returns 过滤后的新消息数组
   */
  static filterMessagesByContent(
    messages: LLMMessage[],
    options: ContentFilterOptions
  ): LLMMessage[] {
    return messages.filter(msg => {
      const content = typeof msg.content === 'string' 
        ? msg.content 
        : JSON.stringify(msg.content);

      // 按内容关键词过滤（包含）
      if (options.contains && options.contains.length > 0) {
        if (!options.contains.some((keyword: string) => content.includes(keyword))) {
          return false;
        }
      }

      // 按内容关键词过滤（排除）
      if (options.excludes && options.excludes.length > 0) {
        if (options.excludes.some((keyword: string) => content.includes(keyword))) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 合并多个消息数组
   * @param arrays 要合并的消息数组
   * @returns 合并后的新消息数组
   */
  static mergeMessageArrays(...arrays: LLMMessage[][]): LLMMessage[] {
    return arrays.flat();
  }

  /**
   * 去重消息数组
   * @param messages 原始消息数组
   * @param keyFn 用于生成唯一键的函数
   * @returns 去重后的新消息数组
   */
  static deduplicateMessages(
    messages: LLMMessage[],
    keyFn?: (msg: LLMMessage) => string
  ): LLMMessage[] {
    if (keyFn) {
      const seen = new Set<string>();
      return messages.filter(msg => {
        const key = keyFn(msg);
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    }

    // 默认按内容和角色去重
    const seen = new Set<string>();
    return messages.filter(msg => {
      const content = typeof msg.content === 'string' 
        ? msg.content 
        : JSON.stringify(msg.content);
      const key = `${msg.role}:${content}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 提取指定范围的消息
   * @param messages 原始消息数组
   * @param start 起始索引
   * @param end 结束索引（不包含）
   * @returns 提取的新消息数组
   */
  static extractMessagesByRange(
    messages: LLMMessage[],
    start: number,
    end: number
  ): LLMMessage[] {
    return messages.slice(start, end);
  }

  /**
   * 按角色分组消息
   * @param messages 原始消息数组
   * @returns 按角色分组的消息对象
   */
  static splitMessagesByRole(messages: LLMMessage[]): MessageGroupByRole {
    const result: MessageGroupByRole = {
      system: [],
      user: [],
      assistant: [],
      tool: []
    };

    for (const msg of messages) {
      if (result[msg.role]) {
        result[msg.role].push(msg);
      }
    }

    return result;
  }

  /**
   * 验证消息数组的有效性
   * @param messages 要验证的消息数组
   * @returns 验证结果
   */
  static validateMessageArray(messages: LLMMessage[]): MessageValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(messages)) {
      errors.push('Messages must be an array');
      return { valid: false, errors };
    }

    const validRoles: MessageRole[] = ['system', 'user', 'assistant', 'tool'];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      if (!msg) {
        errors.push(`Message at index ${i} is null or undefined`);
        continue;
      }

      // 验证角色
      if (!msg.role || !validRoles.includes(msg.role)) {
        errors.push(`Message at index ${i} has invalid role: ${msg.role}`);
      }

      // 验证内容
      if (msg.content === undefined || msg.content === null) {
        errors.push(`Message at index ${i} has missing content`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 深拷贝消息数组
   * @param messages 原始消息数组
   * @returns 拷贝后的新消息数组
   */
  static cloneMessages(messages: LLMMessage[]): LLMMessage[] {
    return messages.map(msg => ({
      ...msg,
      content: typeof msg.content === 'object' && msg.content !== null
        ? JSON.parse(JSON.stringify(msg.content))
        : msg.content
    }));
  }

  /**
   * 创建消息快照（包含元数据）
   * @param messages 原始消息数组
   * @param metadata 快照元数据
   * @returns 消息快照
   */
  static createMessageSnapshot(
    messages: LLMMessage[],
    metadata?: {
      timestamp?: number;
      threadId?: string;
      workflowId?: string;
    }
  ): MessageSnapshot {
    return {
      messages: this.cloneMessages(messages),
      timestamp: metadata?.timestamp || Date.now(),
      threadId: metadata?.threadId,
      workflowId: metadata?.workflowId,
      messageCount: messages.length
    };
  }

  /**
   * 从快照恢复消息数组
   * @param snapshot 消息快照
   * @returns 消息数组
   */
  static restoreFromSnapshot(snapshot: MessageSnapshot): LLMMessage[] {
    return this.cloneMessages(snapshot.messages);
  }

  /**
   * 获取最近N条消息
   * @param messages 原始消息数组
   * @param count 消息数量
   * @returns 最近N条消息
   */
  static getRecentMessages(messages: LLMMessage[], count: number): LLMMessage[] {
    if (count === 0) {
      return [];
    }
    return messages.slice(-count);
  }

  /**
   * 获取指定角色的最近N条消息
   * @param messages 原始消息数组
   * @param role 消息角色
   * @param count 消息数量
   * @returns 指定角色的最近N条消息
   */
  static getRecentMessagesByRole(
    messages: LLMMessage[],
    role: MessageRole,
    count: number
  ): LLMMessage[] {
    const filtered = this.filterMessagesByRole(messages, [role]);
    return filtered.slice(-count);
  }

  /**
   * 搜索消息
   * @param messages 原始消息数组
   * @param query 搜索关键词
   * @returns 匹配的消息数组
   */
  static searchMessages(messages: LLMMessage[], query: string): LLMMessage[] {
    const lowerQuery = query.toLowerCase();
    return messages.filter(msg => {
      const content = typeof msg.content === 'string' 
        ? msg.content 
        : JSON.stringify(msg.content);
      return content.toLowerCase().includes(lowerQuery);
    });
  }
}