/**
 * 上下文裁剪服务
 *
 * 核心职责：
 * 1. 智能裁剪对话历史以控制 Token 使用量
 * 2. 支持多种裁剪策略
 * 3. 检测是否需要自动总结
 * 4. 保留关键消息（如系统消息）
 *
 * 设计原则：
 * - 策略模式：支持多种裁剪策略
 * - 可配置：通过配置控制裁剪行为
 * - 通用性：可被 Graph 模块和 Agent 模块共享
 */

import type { LLMMessage, MessageRole } from '@modular-agent/types';
import { estimateTokens } from './token-utils.js';

/**
 * 上下文裁剪配置
 */
export interface ContextTrimConfig {
  /** 最大 Token 数 */
  maxTokens: number;
  /** 裁剪策略 */
  strategy: 'oldest_first' | 'preserve_system' | 'smart';
  /** 保留最近 N 条消息 */
  preserveRecentCount?: number;
  /** 是否启用自动总结检测 */
  enableAutoSummarize?: boolean;
  /** 触发自动总结的消息数量阈值 */
  autoSummarizeThreshold?: number;
}

/**
 * 上下文裁剪结果
 */
export interface ContextTrimResult {
  /** 裁剪后的消息列表 */
  trimmedMessages: LLMMessage[];
  /** 裁剪起始索引 */
  trimStartIndex: number;
  /** 是否需要自动总结 */
  needsAutoSummarize: boolean;
  /** 移除的 Token 数量 */
  tokensRemoved: number;
  /** 移除的消息数量 */
  messagesRemoved: number;
}

/**
 * 上下文裁剪服务
 *
 * 通用上下文裁剪组件，支持 Graph 模块和 Agent 模块共享使用。
 */
export class ContextTrimService {
  private config: ContextTrimConfig;

  /**
   * 构造函数
   * @param config 裁剪配置
   */
  constructor(config: ContextTrimConfig) {
    this.config = {
      preserveRecentCount: 5,
      autoSummarizeThreshold: 20,
      enableAutoSummarize: false,
      ...config
    };
  }

  /**
   * 执行上下文裁剪
   *
   * @param messages 原始消息列表
   * @returns 裁剪结果
   */
  trim(messages: LLMMessage[]): ContextTrimResult {
    const currentTokens = estimateTokens(messages);

    // 如果未超过限制，无需裁剪
    if (currentTokens <= this.config.maxTokens) {
      return {
        trimmedMessages: messages,
        trimStartIndex: 0,
        needsAutoSummarize: false,
        tokensRemoved: 0,
        messagesRemoved: 0
      };
    }

    // 根据策略执行裁剪
    switch (this.config.strategy) {
      case 'oldest_first':
        return this.trimOldestFirst(messages);
      case 'preserve_system':
        return this.trimPreserveSystem(messages);
      case 'smart':
        return this.trimSmart(messages);
      default:
        return this.trimOldestFirst(messages);
    }
  }

  /**
   * 检查是否需要裁剪
   *
   * @param messages 消息列表
   * @returns 是否需要裁剪
   */
  needsTrim(messages: LLMMessage[]): boolean {
    const currentTokens = estimateTokens(messages);
    return currentTokens > this.config.maxTokens;
  }

  /**
   * 获取当前 Token 使用量
   *
   * @param messages 消息列表
   * @returns Token 数量
   */
  getTokenCount(messages: LLMMessage[]): number {
    return estimateTokens(messages);
  }

  /**
   * 获取配置
   * @returns 当前配置
   */
  getConfig(): ContextTrimConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   * @param config 新配置（部分）
   */
  updateConfig(config: Partial<ContextTrimConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 策略：最旧优先裁剪
   *
   * 从最旧的消息开始移除，直到满足 Token 限制
   *
   * @param messages 消息列表
   * @returns 裁剪结果
   */
  private trimOldestFirst(messages: LLMMessage[]): ContextTrimResult {
    const preserveCount = this.config.preserveRecentCount ?? 5;
    const minPreserve = Math.min(preserveCount, messages.length);

    // 从旧到新遍历，找到需要保留的起始索引
    let trimStartIndex = 0;
    let currentTokens = estimateTokens(messages);

    while (currentTokens > this.config.maxTokens && trimStartIndex < messages.length - minPreserve) {
      const removedMessage = messages[trimStartIndex];
      if (removedMessage) {
        currentTokens -= estimateTokens([removedMessage]);
      }
      trimStartIndex++;
    }

    const trimmedMessages = messages.slice(trimStartIndex);
    const tokensRemoved = estimateTokens(messages) - estimateTokens(trimmedMessages);

    return {
      trimmedMessages,
      trimStartIndex,
      needsAutoSummarize: this.checkAutoSummarize(messages.length, trimmedMessages.length),
      tokensRemoved,
      messagesRemoved: trimStartIndex
    };
  }

  /**
   * 策略：保留系统消息裁剪
   *
   * 保留所有系统消息，裁剪其他消息
   *
   * @param messages 消息列表
   * @returns 裁剪结果
   */
  private trimPreserveSystem(messages: LLMMessage[]): ContextTrimResult {
    // 分离系统消息和其他消息
    const systemMessages: LLMMessage[] = [];
    const otherMessages: LLMMessage[] = [];

    for (const message of messages) {
      if (message.role === 'system') {
        systemMessages.push(message);
      } else {
        otherMessages.push(message);
      }
    }

    const systemTokens = estimateTokens(systemMessages);
    const availableTokens = this.config.maxTokens - systemTokens;

    // 如果系统消息已经超过限制，只保留系统消息
    if (availableTokens <= 0) {
      return {
        trimmedMessages: systemMessages,
        trimStartIndex: messages.length - systemMessages.length,
        needsAutoSummarize: true,
        tokensRemoved: estimateTokens(messages) - systemTokens,
        messagesRemoved: messages.length - systemMessages.length
      };
    }

    // 从其他消息中裁剪
    const preserveCount = this.config.preserveRecentCount ?? 5;
    const minPreserve = Math.min(preserveCount, otherMessages.length);

    let trimStartIndex = 0;
    let currentTokens = estimateTokens(otherMessages);

    while (currentTokens > availableTokens && trimStartIndex < otherMessages.length - minPreserve) {
      const removedMessage = otherMessages[trimStartIndex];
      if (removedMessage) {
        currentTokens -= estimateTokens([removedMessage]);
      }
      trimStartIndex++;
    }

    const trimmedOtherMessages = otherMessages.slice(trimStartIndex);
    const trimmedMessages = [...systemMessages, ...trimmedOtherMessages];

    // 计算原始索引
    const originalTrimStartIndex = messages.findIndex(m => m === otherMessages[trimStartIndex]);
    const tokensRemoved = estimateTokens(messages) - estimateTokens(trimmedMessages);

    return {
      trimmedMessages,
      trimStartIndex: originalTrimStartIndex >= 0 ? originalTrimStartIndex : 0,
      needsAutoSummarize: this.checkAutoSummarize(messages.length, trimmedMessages.length),
      tokensRemoved,
      messagesRemoved: messages.length - trimmedMessages.length
    };
  }

  /**
   * 策略：智能裁剪
   *
   * 综合考虑消息重要性、时间距离等因素进行裁剪
   *
   * @param messages 消息列表
   * @returns 裁剪结果
   */
  private trimSmart(messages: LLMMessage[]): ContextTrimResult {
    // 计算每条消息的重要性分数
    const scoredMessages = messages.map((message, index) => ({
      message,
      index,
      score: this.calculateMessageScore(message, index, messages.length)
    }));

    // 按分数排序（低分优先移除）
    scoredMessages.sort((a, b) => a.score - b.score);

    // 计算需要移除的消息数量
    let currentTokens = estimateTokens(messages);
    const toRemove: Set<number> = new Set();
    const preserveCount = this.config.preserveRecentCount ?? 5;

    for (const item of scoredMessages) {
      // 保留最近的消息
      if (item.index >= messages.length - preserveCount) {
        continue;
      }

      // 保留系统消息
      if (item.message.role === 'system') {
        continue;
      }

      if (currentTokens <= this.config.maxTokens) {
        break;
      }

      currentTokens -= estimateTokens([item.message]);
      toRemove.add(item.index);
    }

    // 构建裁剪后的消息列表
    const trimmedMessages = messages.filter((_, index) => !toRemove.has(index));
    const tokensRemoved = estimateTokens(messages) - estimateTokens(trimmedMessages);

    // 找到裁剪起始索引（第一个被移除的消息索引）
    const removedIndices = Array.from(toRemove).sort((a, b) => a - b);
    const trimStartIndex = removedIndices.length > 0 ? removedIndices[0]! : 0;

    return {
      trimmedMessages,
      trimStartIndex,
      needsAutoSummarize: this.checkAutoSummarize(messages.length, trimmedMessages.length),
      tokensRemoved,
      messagesRemoved: toRemove.size
    };
  }

  /**
   * 计算消息重要性分数
   *
   * 分数越高越重要，越不容易被裁剪
   *
   * @param message 消息
   * @param index 消息索引
   * @param total 总消息数
   * @returns 重要性分数（0-100）
   */
  private calculateMessageScore(message: LLMMessage, index: number, total: number): number {
    let score = 50; // 基础分数

    // 系统消息最重要
    if (message.role === 'system') {
      score += 50;
    }

    // 最近的消息更重要
    const recencyBonus = (index / total) * 30;
    score += recencyBonus;

    // 包含工具调用的消息较重要
    if (message.toolCalls && message.toolCalls.length > 0) {
      score += 10;
    }

    // 工具响应消息较重要
    if (message.role === 'tool') {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * 检查是否需要自动总结
   *
   * @param originalCount 原始消息数量
   * @param trimmedCount 裁剪后消息数量
   * @returns 是否需要自动总结
   */
  private checkAutoSummarize(originalCount: number, trimmedCount: number): boolean {
    if (!this.config.enableAutoSummarize) {
      return false;
    }

    const threshold = this.config.autoSummarizeThreshold ?? 20;
    return originalCount >= threshold || trimmedCount >= threshold;
  }
}
