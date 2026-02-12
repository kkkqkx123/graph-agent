/**
 * Token 使用统计追踪器
 *
 * 核心职责：
 * 1. 累计多轮对话的 Token 使用量
 * 2. 支持流式响应的 Token 累积
 * 3. 提供本地估算方法作为 fallback
 * 4. 支持成本计算等扩展功能
 * 5. 记录每次API调用的历史，支持精确回退和历史分析
 *
 * 设计原则：
 * - 独立的 Token 统计模块，与消息管理解耦
 * - 支持多轮对话的累计统计
 * - 参考 Anthropic SDK 的流式 Token 累积机制
 * - 支持历史记录和精确回退
 */

import type { LLMMessage, LLMUsage, TokenUsageHistory, TokenUsageStatistics, TokenUsageStats } from '@modular-agent/types/llm';
import { generateId } from '@modular-agent/common-utils';
import { estimateTokens as estimateTokensUtil, getTokenUsage as getTokenUsageUtil, isTokenLimitExceeded as isTokenLimitExceededUtil } from './utils/token-utils';

/**
 * 完整的 Token 使用统计（包含当前累计和生命周期统计）
 */
export interface FullTokenUsageStats {
  /** 当前累计统计（可回退） */
  current: TokenUsageStats;
  /** 生命周期统计（不可回退，反映真实的总token消耗） */
  lifetime: TokenUsageStats;
}

/**
 * Token 使用追踪器配置选项
 */
export interface TokenUsageTrackerOptions {
  /** Token 限制阈值，超过此值触发警告 */
  tokenLimit?: number;
  /** 是否启用历史记录 */
  enableHistory?: boolean;
  /** 最大历史记录数量 */
  maxHistorySize?: number;
}

/**
 * Token 使用追踪器类
 */
export class TokenUsageTracker {
  private cumulativeUsage: TokenUsageStats | null = null;
  private currentRequestUsage: TokenUsageStats | null = null;
  private totalLifetimeUsage: TokenUsageStats | null = null; // 无视回退的真实总token
  private usageHistory: TokenUsageHistory[] = []; // 历史记录数组
  private tokenLimit: number;
  private enableHistory: boolean;
  private maxHistorySize: number;

  constructor(options: TokenUsageTrackerOptions = {}) {
    this.tokenLimit = options.tokenLimit || 4000;
    this.enableHistory = options.enableHistory ?? true;
    this.maxHistorySize = options.maxHistorySize || 1000;
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
   * 修复说明：
   * - 不再在流式传输期间更新 cumulativeUsage
   * - 只更新 currentRequestUsage，避免统计错误
   * - 在 finalizeCurrentRequest() 中统一累加到 cumulativeUsage
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

    // 注意：不再在流式传输期间更新 cumulativeUsage
    // 避免覆盖之前的累积统计
    // 累积操作将在 finalizeCurrentRequest() 中统一处理
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

      // 同时累加到生命周期总使用量（无视回退）
      if (!this.totalLifetimeUsage) {
        this.totalLifetimeUsage = { ...this.currentRequestUsage };
      } else {
        this.totalLifetimeUsage.promptTokens += this.currentRequestUsage.promptTokens;
        this.totalLifetimeUsage.completionTokens += this.currentRequestUsage.completionTokens;
        this.totalLifetimeUsage.totalTokens += this.currentRequestUsage.totalTokens;
      }

      // 添加到历史记录
      if (this.enableHistory) {
        this.addToHistory(this.currentRequestUsage);
      }

      this.currentRequestUsage = null;
    }
  }

  /**
   * 添加到历史记录
   * @param usage Token使用统计
   */
  private addToHistory(usage: TokenUsageStats): void {
    const historyItem: TokenUsageHistory = {
      requestId: generateId(),
      timestamp: Date.now(),
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      cost: usage.rawUsage?.totalCost,
      model: usage.rawUsage?.model,
      rawUsage: usage.rawUsage
    };

    this.usageHistory.push(historyItem);

    // 限制历史记录数量
    if (this.usageHistory.length > this.maxHistorySize) {
      this.usageHistory.shift();
    }
  }

  /**
   * 获取累计的 Token 使用统计（会随回退恢复）
   * @returns Token 使用统计
   */
  getCumulativeUsage(): TokenUsageStats | null {
    return this.cumulativeUsage ? { ...this.cumulativeUsage } : null;
  }

  /**
   * 获取生命周期总 Token 使用统计（无视回退，反映真实的总token消耗）
   * @returns Token 使用统计
   */
  getTotalLifetimeUsage(): TokenUsageStats | null {
    return this.totalLifetimeUsage ? { ...this.totalLifetimeUsage } : null;
  }

  /**
   * 获取完整的 Token 使用统计（包含当前累计和生命周期统计）
   * @returns 完整的 Token 使用统计
   */
  getFullUsageStats(): FullTokenUsageStats | null {
    if (!this.cumulativeUsage && !this.totalLifetimeUsage) {
      return null;
    }

    return {
      current: {
        promptTokens: this.cumulativeUsage?.promptTokens || 0,
        completionTokens: this.cumulativeUsage?.completionTokens || 0,
        totalTokens: this.cumulativeUsage?.totalTokens || 0,
        rawUsage: this.cumulativeUsage?.rawUsage
      },
      lifetime: {
        promptTokens: this.totalLifetimeUsage?.promptTokens || 0,
        completionTokens: this.totalLifetimeUsage?.completionTokens || 0,
        totalTokens: this.totalLifetimeUsage?.totalTokens || 0,
        rawUsage: this.totalLifetimeUsage?.rawUsage
      }
    };
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
    return estimateTokensUtil(messages);
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
    return getTokenUsageUtil(null, messages);
  }

  /**
   * 检查 Token 使用是否超过限制
   *
   * @param messages 消息数组（用于本地估算）
   * @returns 是否超过限制
   */
  isTokenLimitExceeded(messages: LLMMessage[]): boolean {
    const tokensUsed = this.getTokenUsage(messages);
    return isTokenLimitExceededUtil(tokensUsed, this.tokenLimit);
  }

  /**
   * 重置 Token 使用统计
   * 注意：此方法不会重置 totalLifetimeUsage，因为它是生命周期统计
   */
  reset(): void {
    this.cumulativeUsage = null;
    this.currentRequestUsage = null;
    this.usageHistory = [];
    // 不重置 totalLifetimeUsage，保持生命周期统计
  }

  /**
   * 完全重置 Token 使用统计（包括生命周期统计）
   * 仅在需要完全重置时使用（如线程销毁）
   */
  fullReset(): void {
    this.cumulativeUsage = null;
    this.currentRequestUsage = null;
    this.totalLifetimeUsage = null;
    this.usageHistory = [];
  }

  /**
   * 克隆 TokenUsageTracker 实例（包含历史记录）
   * @returns 克隆的 TokenUsageTracker 实例
   */
  clone(): TokenUsageTracker {
    const clonedTracker = new TokenUsageTracker({
      tokenLimit: this.tokenLimit,
      enableHistory: this.enableHistory,
      maxHistorySize: this.maxHistorySize
    });

    if (this.cumulativeUsage) {
      clonedTracker.cumulativeUsage = { ...this.cumulativeUsage };
    }

    if (this.currentRequestUsage) {
      clonedTracker.currentRequestUsage = { ...this.currentRequestUsage };
    }

    if (this.totalLifetimeUsage) {
      clonedTracker.totalLifetimeUsage = { ...this.totalLifetimeUsage };
    }

    // 克隆历史记录
    clonedTracker.usageHistory = [...this.usageHistory];

    return clonedTracker;
  }

  /**
   * 设置 Token 使用统计状态
   * 用于从检查点恢复状态
   * 注意：此方法不会恢复 totalLifetimeUsage，因为它是生命周期统计
   * @param cumulativeUsage 累计 Token 使用统计
   * @param currentRequestUsage 当前请求 Token 使用统计（可选）
   */
  setState(
    cumulativeUsage: TokenUsageStats | null,
    currentRequestUsage?: TokenUsageStats | null
  ): void {
    if (cumulativeUsage) {
      this.cumulativeUsage = { ...cumulativeUsage };
    } else {
      this.cumulativeUsage = null;
    }

    if (currentRequestUsage !== undefined) {
      if (currentRequestUsage) {
        this.currentRequestUsage = { ...currentRequestUsage };
      } else {
        this.currentRequestUsage = null;
      }
    }
    // 不恢复 totalLifetimeUsage，保持生命周期统计
  }

  /**
   * 获取 Token 使用统计状态
   * 用于保存到检查点
   * @returns Token 使用统计状态
   */
  getState(): {
    cumulativeUsage: TokenUsageStats | null;
    currentRequestUsage: TokenUsageStats | null;
  } {
    return {
      cumulativeUsage: this.cumulativeUsage ? { ...this.cumulativeUsage } : null,
      currentRequestUsage: this.currentRequestUsage ? { ...this.currentRequestUsage } : null
    };
  }

  /**
   * 设置生命周期总 Token 使用统计
   * 用于从持久化存储恢复生命周期统计
   * @param totalLifetimeUsage 生命周期总 Token 使用统计
   */
  setTotalLifetimeUsage(totalLifetimeUsage: TokenUsageStats | null): void {
    if (totalLifetimeUsage) {
      this.totalLifetimeUsage = { ...totalLifetimeUsage };
    } else {
      this.totalLifetimeUsage = null;
    }
  }

  /**
   * 获取生命周期总 Token 使用统计状态
   * 用于保存到持久化存储
   * @returns 生命周期总 Token 使用统计
   */
  getTotalLifetimeUsageState(): TokenUsageStats | null {
    return this.totalLifetimeUsage ? { ...this.totalLifetimeUsage } : null;
  }

  /**
   * 获取历史记录
   * @returns 历史记录数组的副本
   */
  getUsageHistory(): TokenUsageHistory[] {
    return [...this.usageHistory];
  }

  /**
   * 获取最近N条历史记录
   * @param n 记录数量
   * @returns 最近N条历史记录
   */
  getRecentHistory(n: number): TokenUsageHistory[] {
    return this.usageHistory.slice(-n);
  }

  /**
   * 获取统计信息
   * @returns 统计信息
   */
  getStatistics(): TokenUsageStatistics {
    if (this.usageHistory.length === 0) {
      return {
        totalRequests: 0,
        averageTokens: 0,
        maxTokens: 0,
        minTokens: 0,
        totalCost: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0
      };
    }

    const totalTokens = this.usageHistory.reduce((sum, h) => sum + h.totalTokens, 0);
    const totalPromptTokens = this.usageHistory.reduce((sum, h) => sum + h.promptTokens, 0);
    const totalCompletionTokens = this.usageHistory.reduce((sum, h) => sum + h.completionTokens, 0);
    const maxTokens = Math.max(...this.usageHistory.map(h => h.totalTokens));
    const minTokens = Math.min(...this.usageHistory.map(h => h.totalTokens));
    const totalCost = this.usageHistory.reduce((sum, h) => sum + (h.cost || 0), 0);

    return {
      totalRequests: this.usageHistory.length,
      averageTokens: totalTokens / this.usageHistory.length,
      maxTokens,
      minTokens,
      totalCost,
      totalPromptTokens,
      totalCompletionTokens
    };
  }

  /**
   * 回退到指定请求之前
   * @param requestIndex 请求索引（从0开始）
   */
  rollbackToRequest(requestIndex: number): void {
    if (requestIndex < 0 || requestIndex > this.usageHistory.length) {
      throw new Error(`Invalid request index: ${requestIndex}. Valid range: 0-${this.usageHistory.length}`);
    }

    // 重新计算cumulativeUsage
    this.cumulativeUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    };

    for (let i = 0; i < requestIndex; i++) {
      const item = this.usageHistory[i];
      if (item) {
        this.cumulativeUsage.promptTokens += item.promptTokens;
        this.cumulativeUsage.completionTokens += item.completionTokens;
        this.cumulativeUsage.totalTokens += item.totalTokens;
      }
    }

    // 删除回退后的历史记录
    this.usageHistory = this.usageHistory.slice(0, requestIndex);
  }

  /**
   * 回退到指定请求ID之前
   * @param requestId 请求ID
   */
  rollbackToRequestId(requestId: string): void {
    const index = this.usageHistory.findIndex(h => h.requestId === requestId);
    if (index === -1) {
      throw new Error(`Request ID not found: ${requestId}`);
    }
    this.rollbackToRequest(index);
  }

  /**
   * 回退到指定时间戳之前
   * @param timestamp 时间戳
   */
  rollbackToTimestamp(timestamp: number): void {
    const index = this.usageHistory.findIndex(h => h.timestamp >= timestamp);
    if (index === -1) {
      // 所有记录都在时间戳之前，不回退
      return;
    }
    this.rollbackToRequest(index);
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    this.usageHistory = [];
  }
}