/**
 * MessageManagerAPI - 消息管理API
 * 封装ConversationManager，提供消息查询、搜索、过滤和导出功能
 */

import { threadRegistry, type ThreadRegistry } from '../../core/services/thread-registry';
import type { LLMMessage, LLMMessageRole } from '../../types/llm';
import { NotFoundError } from '../../types/errors';

/**
 * 消息查询选项
 */
export interface MessageQueryOptions {
  /** 返回数量限制 */
  limit?: number;
  /** 偏移量（用于分页） */
  offset?: number;
  /** 排序方式 */
  orderBy?: 'asc' | 'desc';
}

/**
 * 消息过滤条件
 */
export interface MessageFilter {
  /** 消息角色 */
  role?: LLMMessageRole;
  /** 开始时间戳 */
  startTime?: number;
  /** 结束时间戳 */
  endTime?: number;
  /** 关键词搜索 */
  keyword?: string;
}

/**
 * 消息统计信息
 */
export interface MessageStats {
  /** 总消息数 */
  totalMessages: number;
  /** 用户消息数 */
  userMessages: number;
  /** 助手消息数 */
  assistantMessages: number;
  /** 系统消息数 */
  systemMessages: number;
  /** 工具消息数 */
  toolMessages: number;
}

/**
 * Token使用统计
 */
export interface TokenUsageStats {
  /** 总Token数 */
  totalTokens: number;
  /** 提示Token数 */
  promptTokens: number;
  /** 完成Token数 */
  completionTokens: number;
}

/**
 * MessageManagerAPI - 消息管理API
 */
export class MessageManagerAPI {
  private threadRegistry: ThreadRegistry;

  constructor(threadRegistryParam?: ThreadRegistry) {
    this.threadRegistry = threadRegistryParam || threadRegistry;
  }

  /**
   * 获取线程的消息列表
   * @param threadId 线程ID
   * @param options 查询选项
   * @returns 消息数组
   */
  async getMessages(threadId: string, options?: MessageQueryOptions): Promise<LLMMessage[]> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'Thread', threadId);
    }

    const messages = threadContext.conversationManager.getMessages();

    // 应用排序
    let sortedMessages = [...messages];
    if (options?.orderBy === 'desc') {
      sortedMessages.reverse();
    }

    // 应用分页
    if (options?.offset !== undefined || options?.limit !== undefined) {
      const start = options.offset || 0;
      const end = options.limit !== undefined ? start + options.limit : undefined;
      sortedMessages = sortedMessages.slice(start, end);
    }

    return sortedMessages;
  }

  /**
   * 获取线程的所有消息（包括压缩的）
   * @param threadId 线程ID
   * @param options 查询选项
   * @returns 消息数组
   */
  async getAllMessages(threadId: string, options?: MessageQueryOptions): Promise<LLMMessage[]> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'Thread', threadId);
    }

    const messages = threadContext.conversationManager.getAllMessages();

    // 应用排序
    let sortedMessages = [...messages];
    if (options?.orderBy === 'desc') {
      sortedMessages.reverse();
    }

    // 应用分页
    if (options?.offset !== undefined || options?.limit !== undefined) {
      const start = options.offset || 0;
      const end = options.limit !== undefined ? start + options.limit : undefined;
      sortedMessages = sortedMessages.slice(start, end);
    }

    return sortedMessages;
  }

  /**
   * 搜索消息
   * @param threadId 线程ID
   * @param query 搜索关键词
   * @returns 匹配的消息数组
   */
  async searchMessages(threadId: string, query: string): Promise<LLMMessage[]> {
    const messages = await this.getMessages(threadId);

    return messages.filter(message => {
      const content = typeof message.content === 'string'
        ? message.content
        : JSON.stringify(message.content);
      return content.toLowerCase().includes(query.toLowerCase());
    });
  }

  /**
   * 过滤消息
   * @param threadId 线程ID
   * @param filter 过滤条件
   * @returns 过滤后的消息数组
   */
  async filterMessages(threadId: string, filter: MessageFilter): Promise<LLMMessage[]> {
    const messages = await this.getMessages(threadId);

    return messages.filter(message => {
      // 按角色过滤
      if (filter.role && message.role !== filter.role) {
        return false;
      }

      // 按时间范围过滤（假设消息有timestamp字段）
      // 注意：LLMMessage类型定义中没有timestamp，这里需要根据实际情况调整
      // 如果消息没有timestamp，这个过滤条件会被忽略

      // 按关键词过滤
      if (filter.keyword) {
        const content = typeof message.content === 'string'
          ? message.content
          : JSON.stringify(message.content);
        if (!content.toLowerCase().includes(filter.keyword.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 获取消息统计
   * @param threadId 线程ID
   * @returns 消息统计信息
   */
  async getMessageStats(threadId: string): Promise<MessageStats> {
    const messages = await this.getMessages(threadId);

    const stats: MessageStats = {
      totalMessages: messages.length,
      userMessages: 0,
      assistantMessages: 0,
      systemMessages: 0,
      toolMessages: 0
    };

    for (const message of messages) {
      switch (message.role) {
        case 'user':
          stats.userMessages++;
          break;
        case 'assistant':
          stats.assistantMessages++;
          break;
        case 'system':
          stats.systemMessages++;
          break;
        case 'tool':
          stats.toolMessages++;
          break;
      }
    }

    return stats;
  }

  /**
   * 获取Token使用统计
   * @param threadId 线程ID
   * @returns Token使用统计
   */
  async getTokenUsage(threadId: string): Promise<TokenUsageStats> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'Thread', threadId);
    }

    const usage = threadContext.conversationManager.getTokenUsage();

    if (!usage) {
      return {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0
      };
    }

    return {
      totalTokens: usage.totalTokens,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens
    };
  }

  /**
   * 导出消息
   * @param threadId 线程ID
   * @param format 导出格式（json或csv）
   * @returns 导出的字符串
   */
  async exportMessages(threadId: string, format: 'json' | 'csv'): Promise<string> {
    const messages = await this.getMessages(threadId);

    if (format === 'json') {
      return JSON.stringify(messages, null, 2);
    } else if (format === 'csv') {
      // CSV格式：role,content
      const headers = 'role,content\n';
      const rows = messages.map(message => {
        const content = typeof message.content === 'string'
          ? message.content
          : JSON.stringify(message.content);
        // 转义CSV中的特殊字符
        const escapedContent = content.replace(/"/g, '""');
        return `${message.role},"${escapedContent}"`;
      }).join('\n');
      return headers + rows;
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * 删除消息
   * @param threadId 线程ID
   * @param messageIds 要删除的消息索引数组
   */
  async deleteMessages(threadId: string, messageIds: number[]): Promise<void> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'Thread', threadId);
    }

    // 注意：ConversationManager没有直接删除指定索引消息的方法
    // 这里需要根据实际需求实现
    // 如果需要删除消息，可能需要扩展ConversationManager的功能
    throw new Error('Delete messages is not currently supported');
  }

  /**
   * 清空消息
   * @param threadId 线程ID
   * @param keepSystemMessage 是否保留系统消息
   */
  async clearMessages(threadId: string, keepSystemMessage: boolean = true): Promise<void> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'Thread', threadId);
    }

    threadContext.conversationManager.clearMessages(keepSystemMessage);
  }

  /**
   * 获取最近N条消息
   * @param threadId 线程ID
   * @param n 消息数量
   * @returns 消息数组
   */
  async getRecentMessages(threadId: string, n: number): Promise<LLMMessage[]> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'Thread', threadId);
    }

    return threadContext.conversationManager.getRecentMessages(n);
  }

  /**
   * 按角色获取消息
   * @param threadId 线程ID
   * @param role 消息角色
   * @returns 消息数组
   */
  async getMessagesByRole(threadId: string, role: LLMMessageRole): Promise<LLMMessage[]> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'Thread', threadId);
    }

    return threadContext.conversationManager.filterMessagesByRole(role);
  }

  /**
   * 获取指定索引范围的消息
   * @param threadId 线程ID
   * @param start 起始索引
   * @param end 结束索引
   * @returns 消息数组
   */
  async getMessagesByRange(threadId: string, start: number, end: number): Promise<LLMMessage[]> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'Thread', threadId);
    }

    return threadContext.conversationManager.getMessagesByRange(start, end);
  }

  /**
   * 获取底层ThreadRegistry实例
   * @returns ThreadRegistry实例
   */
  getThreadRegistry(): ThreadRegistry {
    return this.threadRegistry;
  }
}