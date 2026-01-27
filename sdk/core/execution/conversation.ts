/**
 * 对话管理器
 * 管理消息历史、Token统计
 * 
 * 核心职责：
 * 1. 消息历史管理
 * 2. Token统计和压缩事件触发
 * 
 * 重要说明：
 * - ConversationManager只管理状态，不负责执行逻辑
 * - 执行逻辑由LLMExecutor负责
 */

import type { LLMMessage, LLMUsage } from '../../types/llm';

/**
 * ConversationManager事件回调
 */
export interface ConversationManagerEventCallbacks {
  /** Token超过限制时的回调 */
  onTokenLimitExceeded?: (tokensUsed: number, tokenLimit: number) => void | Promise<void>;
}

/**
 * ConversationManager配置选项
 */
export interface ConversationManagerOptions {
  /** Token限制阈值，超过此值触发压缩事件 */
  tokenLimit?: number;
  /** 事件回调 */
  eventCallbacks?: ConversationManagerEventCallbacks;
}

/**
 * Token使用统计
 */
interface TokenUsageStats {
  /** 提示Token数 */
  promptTokens: number;
  /** 完成Token数 */
  completionTokens: number;
  /** 总Token数 */
  totalTokens: number;
  /** 原始API响应的详细信息 */
  rawUsage?: any;
}

/**
 * 对话管理器类
 */
export class ConversationManager {
  private messages: LLMMessage[] = [];
  private tokenLimit: number;
  private tokenUsage: TokenUsageStats | null = null;
  private eventCallbacks?: ConversationManagerEventCallbacks;

  /**
   * 构造函数
   * @param options 配置选项
   */
  constructor(options: ConversationManagerOptions = {}) {
    this.tokenLimit = options.tokenLimit || 4000;
    this.eventCallbacks = options.eventCallbacks;
  }

  /**
   * 添加消息
   * @param message 消息对象
   * @returns 添加后的消息数组长度
   */
  addMessage(message: LLMMessage): number {
    // 验证消息格式
    if (!message.role || !message.content) {
      throw new Error('Invalid message format: role and content are required');
    }

    // 将消息追加到数组末尾
    this.messages.push({ ...message });

    return this.messages.length;
  }

  /**
   * 批量添加消息
   * @param messages 消息数组
   * @returns 添加后的消息数组长度
   */
  addMessages(...messages: LLMMessage[]): number {
    for (const message of messages) {
      this.addMessage(message);
    }
    return this.messages.length;
  }

  /**
   * 获取当前消息历史
   * @returns 消息数组的副本
   */
  getMessages(): LLMMessage[] {
    return [...this.messages];
  }

  /**
   * 清空消息历史
   * @param keepSystemMessage 是否保留系统消息
   */
  clearMessages(keepSystemMessage: boolean = true): void {
    if (keepSystemMessage && this.messages.length > 0) {
      const firstMessage = this.messages[0]!;
      if (firstMessage.role === 'system') {
        // 保留系统消息
        this.messages = [firstMessage];
      } else {
        // 清空所有消息
        this.messages = [];
      }
    } else {
      // 清空所有消息
      this.messages = [];
    }
  }

  /**
   * 检查Token使用情况，触发压缩事件
   */
  async checkTokenUsage(): Promise<void> {
    const tokensUsed = this.estimateTokenUsage();

    // 如果超过限制，触发Token限制事件
    if (tokensUsed > this.tokenLimit) {
      await this.triggerTokenLimitEvent(tokensUsed);
    }
  }

  /**
   * 估算Token使用情况
   * @returns Token数量
   */
  private estimateTokenUsage(): number {
    // 优先使用API响应的Token统计
    if (this.tokenUsage) {
      return this.tokenUsage.totalTokens;
    }

    // 使用本地估算方法
    return this.estimateTokensLocally();
  }

  /**
   * 本地估算Token数量
   * @returns Token数量
   */
  private estimateTokensLocally(): number {
    let totalChars = 0;

    for (const message of this.messages) {
      if (typeof message.content === 'string') {
        totalChars += message.content.length;
      } else if (Array.isArray(message.content)) {
        // 处理数组内容
        for (const item of message.content) {
          if (typeof item === 'string') {
            totalChars += item.length;
          } else if (typeof item === 'object' && item !== null) {
            totalChars += JSON.stringify(item).length;
          }
        }
      }
    }

    // 粗略估算：平均每个Token约2.5个字符
    return Math.ceil(totalChars / 2.5);
  }

  /**
   * 更新Token使用统计
   * @param usage Token使用数据
   */
  updateTokenUsage(usage?: LLMUsage): void {
    if (!usage) {
      return;
    }

    this.tokenUsage = {
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      rawUsage: usage
    };
  }

  /**
   * 获取Token使用统计
   * @returns Token使用统计
   */
  getTokenUsage(): TokenUsageStats | null {
    return this.tokenUsage ? { ...this.tokenUsage } : null;
  }

  /**
   * 获取最近N条消息
   * @param n 消息数量
   * @returns 消息数组
   */
  getRecentMessages(n: number): LLMMessage[] {
    if (n >= this.messages.length) {
      return this.getMessages();
    }

    return this.messages.slice(-n).map(msg => ({ ...msg }));
  }

  /**
   * 按角色过滤消息
   * @param role 消息角色
   * @returns 消息数组
   */
  filterMessagesByRole(role: string): LLMMessage[] {
    return this.messages
      .filter(msg => msg.role === role)
      .map(msg => ({ ...msg }));
  }

  /**
   * 触发Token限制事件
   * @param tokensUsed 当前使用的Token数量
   */
  private async triggerTokenLimitEvent(tokensUsed: number): Promise<void> {
    if (this.eventCallbacks?.onTokenLimitExceeded) {
      try {
        await this.eventCallbacks.onTokenLimitExceeded(tokensUsed, this.tokenLimit);
      } catch (error) {
        console.error('Error in onTokenLimitExceeded callback:', error);
      }
    } else {
      // 如果没有回调，记录警告
      console.warn(`Token limit exceeded: ${tokensUsed} > ${this.tokenLimit}`);
    }
  }

  /**
   * 克隆 ConversationManager 实例
   * 创建一个包含相同消息历史和配置的新 ConversationManager 实例
   * @returns 克隆的 ConversationManager 实例
   */
  clone(): ConversationManager {
    // 创建新的 ConversationManager 实例
    const clonedManager = new ConversationManager({
      tokenLimit: this.tokenLimit,
      eventCallbacks: this.eventCallbacks
    });

    // 复制所有消息历史
    clonedManager.messages = this.messages.map(msg => ({ ...msg }));

    // 复制 token 使用统计
    if (this.tokenUsage) {
      clonedManager.tokenUsage = { ...this.tokenUsage };
    }

    return clonedManager;
  }
}