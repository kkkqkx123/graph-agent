/**
 * 对话管理器
 * 扩展 MessageHistory，增加 Graph 特有功能
 *
 * Graph 特有功能：
 * 1. Token 统计和事件触发
 * 2. 工具描述消息管理
 * 3. 与 Graph 执行层的集成
 *
 * 继承自 MessageHistory 的功能：
 * - 消息历史管理
 * - 批次可见性控制
 * - 快照/恢复
 */

import type { LLMMessage, TokenUsageStats } from '@modular-agent/types';
import { MessageHistory, type MessageHistoryState } from '../messages/message-history.js';
import { TokenUsageTracker } from '../utils/token/token-usage-tracker.js';
import type { EventManager } from '../services/event-manager.js';
import type { LifecycleCapable } from './lifecycle-capable.js';
import { createContextualLogger } from '../../utils/contextual-logger.js';
import { emit } from '../utils/event/event-emitter.js';
import { now } from '@modular-agent/common-utils';
import {
  buildTokenLimitExceededEvent,
  buildContextCompressionRequestedEvent,
  buildContextCompressionCompletedEvent
} from '../../graph/execution/utils/event/event-builder.js';
import { generateToolListDescription } from '../utils/tools/tool-description-generator.js';
import { executeOperation } from '../utils/messages/message-operation-utils.js';
import type { MessageOperationConfig, MessageOperationResult } from '@modular-agent/types';

const logger = createContextualLogger();

/**
 * 对话管理器配置
 */
export interface ConversationManagerConfig {
  /** 事件管理器 */
  eventManager?: EventManager;
  /** 线程 ID */
  threadId?: string;
  /** 工作流 ID */
  workflowId?: string;
  /** Token 限制 */
  tokenLimit?: number;
  /** 初始消息 */
  initialMessages?: LLMMessage[];
}

/** @deprecated Use ConversationManagerConfig instead */
export type ConversationManagerOptions = ConversationManagerConfig;

/**
 * 对话状态（用于检查点）
 */
export interface ConversationState extends MessageHistoryState {
  /** Token 使用情况 */
  tokenUsage?: TokenUsageStats | null;
  /** 当前请求的 Token 使用情况 */
  currentRequestUsage?: TokenUsageStats | null;
}

/**
 * 对话管理器
 */
export class ConversationManager extends MessageHistory implements LifecycleCapable {
  protected tokenUsageTracker: TokenUsageTracker;
  protected eventManager?: EventManager;
  protected threadId?: string;
  protected workflowId?: string;

  /**
   * 构造函数
   * @param config 配置选项
   */
  constructor(config: ConversationManagerConfig = {}) {
    super({ initialMessages: config.initialMessages });
    this.eventManager = config.eventManager;
    this.threadId = config.threadId;
    this.workflowId = config.workflowId;

    this.tokenUsageTracker = new TokenUsageTracker({
      tokenLimit: config.tokenLimit
    });
  }

  /**
   * 初始化资源
   */
  async initialize(): Promise<void> {
    // 可以在这里加载历史记录等
  }

  /**
   * 设置上下文信息
   * @param workflowId 工作流 ID
   * @param threadId 线程 ID
   */
  setContext(workflowId: string, threadId: string): void {
    this.workflowId = workflowId;
    this.threadId = threadId;
  }

  /**
   * 获取线程 ID
   * @returns 线程 ID
   */
  getThreadId(): string | undefined {
    return this.threadId;
  }

  /**
   * 获取 Token 使用情况
   * @returns Token 使用情况统计
   */
  getTokenUsage(): TokenUsageStats {
    const messages = this.getAllMessages();
    const tokenCount = this.tokenUsageTracker.getTokenUsage(messages);
    return this.tokenUsageTracker.getCumulativeUsage() || {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: tokenCount
    };
  }

  /**
   * 检查 Token 使用情况并触发事件
   */
  async checkTokenUsage(): Promise<void> {
    const tokensUsed = this.getTokenUsage().totalTokens;

    // 如果超过限制，触发 Token 限制事件和压缩请求事件
    if (this.tokenUsageTracker.isTokenLimitExceeded(this.getAllMessages())) {
      await this.triggerTokenLimitEvent(tokensUsed);
      await this.triggerCompressionRequestedEvent(tokensUsed);
    }
  }

  /**
   * 触发 Token 限制事件
   * @param tokensUsed 当前使用的 Token 数量
   */
  private async triggerTokenLimitEvent(tokensUsed: number): Promise<void> {
    // 1. 通过 EventManager 发送事件
    if (this.eventManager && this.workflowId && this.threadId) {
      const event = buildTokenLimitExceededEvent({
        threadId: this.threadId,
        tokensUsed,
        tokenLimit: this.tokenUsageTracker['tokenLimit'],
        workflowId: this.workflowId
      });
      await emit(this.eventManager, event);
    }

    // 2. 记录警告日志
    logger.warn(
      `Token limit exceeded: ${tokensUsed} > ${this.tokenUsageTracker['tokenLimit']}`,
      {
        tokensUsed,
        tokenLimit: this.tokenUsageTracker['tokenLimit'],
        workflowId: this.workflowId,
        threadId: this.threadId,
        operation: 'token_usage_check'
      }
    );
  }

  /**
   * 触发上下文压缩请求事件
   * @param tokensUsed 当前使用的 Token 数量
   */
  private async triggerCompressionRequestedEvent(tokensUsed: number): Promise<void> {
    if (this.eventManager && this.workflowId && this.threadId) {
      const event = buildContextCompressionRequestedEvent({
        threadId: this.threadId,
        tokensUsed,
        tokenLimit: this.tokenUsageTracker['tokenLimit'],
        workflowId: this.workflowId,
        stats: {
          messageCount: this.getAllMessages().length,
          lastMessageAt: now()
        }
      });
      await emit(this.eventManager, event);
    }
  }

  /**
   * 执行消息操作并触发完成事件
   * @param operation 消息操作配置
   * @returns 操作结果
   */
  async executeMessageOperation(
    operation: MessageOperationConfig,
    onAfterOperation?: (result: MessageOperationResult) => Promise<void>
  ): Promise<MessageOperationResult> {
    const allMessages = this.getAllMessages();
    const markMap = this.getMarkMap();

    const result = await executeOperation(
      { messages: allMessages, markMap },
      operation,
      onAfterOperation
    );

    // 更新内部状态
    this.clear();
    for (const msg of result.messages) {
      this.addMessage(msg);
    }
    this.setMarkMap(result.markMap);

    // 触发完成事件
    if (this.eventManager && this.workflowId && this.threadId) {
      const event = buildContextCompressionCompletedEvent({
        threadId: this.threadId,
        workflowId: this.workflowId,
        tokensAfter: this.getTokenUsage().totalTokens
      });
      await emit(this.eventManager, event);
    }

    return result;
  }

  /**
   * 获取工具列表描述（基于当前可用工具）
   * @param tools 工具列表
   * @returns 工具描述消息
   */
  getToolDescriptionMessage(tools: any[]): LLMMessage {
    return {
      role: 'system',
      content: generateToolListDescription(tools, 'list')
    };
  }

  /**
   * 获取当前请求的 Token 使用情况
   * @returns 当前请求的 Token 使用情况
   */
  getCurrentRequestUsage(): TokenUsageStats {
    return this.tokenUsageTracker.getCurrentRequestUsage() || {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    };
  }

  /**
   * 设置 Token 使用统计状态
   * 用于从检查点恢复状态
   * @param cumulativeUsage 累计 Token 使用统计
   * @param currentRequestUsage 当前请求 Token 使用统计（可选）
   */
  setTokenUsageState(
    cumulativeUsage: TokenUsageStats | null,
    currentRequestUsage?: TokenUsageStats | null
  ): void {
    this.tokenUsageTracker.setState(cumulativeUsage, currentRequestUsage);
  }

  /**
   * 更新 API 返回的 Token 使用统计
   * @param usage Token 使用数据
   */
  updateTokenUsage(usage: any): void {
    this.tokenUsageTracker.updateApiUsage(usage);
  }

  /**
   * 完成当前请求的 Token 统计
   */
  finalizeCurrentRequest(): void {
    this.tokenUsageTracker.finalizeCurrentRequest();
  }

  // ============================================================
  // 重写父类方法
  // ============================================================

  /**
   * 克隆 ConversationManager 实例
   * @returns 克隆的 ConversationManager 实例
   */
  override clone(): ConversationManager {
    const cloned = new ConversationManager({
      eventManager: this.eventManager,
      threadId: this.threadId,
      workflowId: this.workflowId,
      tokenLimit: this.tokenUsageTracker['tokenLimit']
    });
    cloned.initializeFromHistory(this);
    return cloned;
  }

  /**
   * 从另一个管理器初始化历史
   * @param other 另一个管理器
   */
  initializeFromHistory(other: ConversationManager): void {
    this.initializeManagedMessages(other.getAllMessages());
    this.setMarkMap(other.getMarkMap());
  }

  /**
   * 初始化管理器消息
   * @param messages 消息列表
   */
  private initializeManagedMessages(messages: LLMMessage[]): void {
    super.clear();
    for (const msg of messages) {
      super.addMessage(msg);
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    super.clear();
    this.tokenUsageTracker = new TokenUsageTracker({
      tokenLimit: this.tokenUsageTracker['tokenLimit']
    });
  }
}
