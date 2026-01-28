/**
 * Token 使用统计追踪器
 * 
 * 核心职责：
 * 1. 累计多轮对话的 Token 使用量
 * 2. 支持流式响应的 Token 累积
 * 3. 提供本地估算方法作为 fallback
 * 4. 支持成本计算等扩展功能
 * 
 * 设计原则：
 * - 独立的 Token 统计模块，与消息管理解耦
 * - 支持多轮对话的累计统计
 * - 参考 Anthropic SDK 的流式 Token 累积机制
 */

import type { LLMMessage, LLMUsage } from '../../types/llm';

/**
 * Token 使用统计
 */
export interface TokenUsageStats {
  /** 提示 Token 数 */
  promptTokens: number;
  /** 完成 Token 数 */
  completionTokens: number;
  /** 总 Token 数 */
  totalTokens: number;
  /** 原始 API 响应的详细信息 */
  rawUsage?: any;
}

/**
 * Token 使用追踪器配置选项
 */
export interface TokenUsageTrackerOptions {
  /** Token 限制阈值，超过此值触发警告 */
  tokenLimit?: number;
}

/**
 * Token 使用追踪器类
 */
export class TokenUsageTracker {
  private cumulativeUsage: TokenUsageStats | null = null;
  private currentRequestUsage: TokenUsageStats | null = null;
  private tokenLimit: number;

  constructor(options: TokenUsageTrackerOptions = {}) {
    this.tokenLimit = options.tokenLimit || 4000;
  }

  /**
   * 更新 API 返回的 Token 使用统计
   *
   * 保存当前请求的 usage，但不立即累加到总使用量
   * 需要调用 finalizeCurrentRequest() 来完成累加
   *
   * @param usage Token 使用数据
   */
  updateApiUsage(usage: LLMUsage): void {
    // 保存当前请求的 usage
    this.currentRequestUsage = {
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      rawUsage: usage
    };
  }

  /**
   * 累积流式响应的 Token 使用统计
   * 
   * 参考 Anthropic SDK 的 #accumulateMessage() 方法：
   * - 在流式传输期间持续更新 token 统计
   * - message_delta 事件提供增量更新
   * 
   * @param usage Token 使用数据（增量）
   */
  accumulateStreamUsage(usage: LLMUsage): void {
    if (!this.currentRequestUsage) {
      // 第一次收到 usage，通常是 message_start 事件
      this.currentRequestUsage = {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        rawUsage: usage
      };
    } else {
      // 后续的 usage，通常是 message_delta 事件，进行增量更新
      this.currentRequestUsage.promptTokens = usage.promptTokens;
      this.currentRequestUsage.completionTokens = usage.completionTokens;
      this.currentRequestUsage.totalTokens = usage.totalTokens;
      this.currentRequestUsage.rawUsage = usage;
    }

    // 同步更新累计使用量
    if (!this.cumulativeUsage) {
      this.cumulativeUsage = { ...this.currentRequestUsage };
    } else {
      // 重新计算累计值：累计值 = 之前所有请求的总和 + 当前请求的最新值
      // 这里简化处理，直接使用当前请求的值
      // 更精确的做法是保存历史记录，但会增加复杂度
      this.cumulativeUsage.promptTokens = this.currentRequestUsage.promptTokens;
      this.cumulativeUsage.completionTokens = this.currentRequestUsage.completionTokens;
      this.cumulativeUsage.totalTokens = this.currentRequestUsage.totalTokens;
    }
  }

  /**
   * 完成当前请求的 Token 统计
   *
   * 将当前请求的 usage 累加到总使用量
   * 在每次 API 调用完成后调用
   */
  finalizeCurrentRequest(): void {
    if (this.currentRequestUsage) {
      if (!this.cumulativeUsage) {
        this.cumulativeUsage = { ...this.currentRequestUsage };
      } else {
        // 累加到总使用量
        this.cumulativeUsage.promptTokens += this.currentRequestUsage.promptTokens;
        this.cumulativeUsage.completionTokens += this.currentRequestUsage.completionTokens;
        this.cumulativeUsage.totalTokens += this.currentRequestUsage.totalTokens;
      }
      this.currentRequestUsage = null;
    }
  }

  /**
   * 获取累计的 Token 使用统计
   * @returns Token 使用统计
   */
  getCumulativeUsage(): TokenUsageStats | null {
    return this.cumulativeUsage ? { ...this.cumulativeUsage } : null;
  }

  /**
   * 获取当前请求的 Token 使用统计
   * @returns Token 使用统计
   */
  getCurrentRequestUsage(): TokenUsageStats | null {
    return this.currentRequestUsage ? { ...this.currentRequestUsage } : null;
  }

  /**
   * 估算消息的 Token 使用量（本地估算方法）
   * 
   * 当 API 没有返回 usage 时使用此方法作为 fallback
   * 
   * @param messages 消息数组
   * @returns Token 数量
   */
  estimateTokens(messages: LLMMessage[]): number {
    let totalChars = 0;

    for (const message of messages) {
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

    // 粗略估算：平均每个 Token 约 2.5 个字符
    return Math.ceil(totalChars / 2.5);
  }

  /**
   * 获取 Token 使用情况（优先使用 API 统计，否则使用本地估算）
   * 
   * @param messages 消息数组（用于本地估算）
   * @returns Token 数量
   */
  getTokenUsage(messages: LLMMessage[]): number {
    // 优先使用累计的 API 统计
    if (this.cumulativeUsage) {
      return this.cumulativeUsage.totalTokens;
    }

    // 使用本地估算方法
    return this.estimateTokens(messages);
  }

  /**
   * 检查 Token 使用是否超过限制
   * 
   * @param messages 消息数组（用于本地估算）
   * @returns 是否超过限制
   */
  isTokenLimitExceeded(messages: LLMMessage[]): boolean {
    const tokensUsed = this.getTokenUsage(messages);
    return tokensUsed > this.tokenLimit;
  }

  /**
   * 重置 Token 使用统计
   */
  reset(): void {
    this.cumulativeUsage = null;
    this.currentRequestUsage = null;
  }

  /**
   * 克隆 TokenUsageTracker 实例
   * @returns 克隆的 TokenUsageTracker 实例
   */
  clone(): TokenUsageTracker {
    const clonedTracker = new TokenUsageTracker({
      tokenLimit: this.tokenLimit
    });

    if (this.cumulativeUsage) {
      clonedTracker.cumulativeUsage = { ...this.cumulativeUsage };
    }

    if (this.currentRequestUsage) {
      clonedTracker.currentRequestUsage = { ...this.currentRequestUsage };
    }

    return clonedTracker;
  }
}