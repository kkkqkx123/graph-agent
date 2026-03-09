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

import type { LLMMessage, LLMUsage, TokenUsageHistory, TokenUsageStats } from '@modular-agent/types';
import { MessageHistory, type MessageHistoryState } from '../../messages/message-history.js';
import { TokenUsageTracker } from '../services/token-usage-tracker.js';
import type { EventManager } from '../../services/event-manager.js';
import type { LifecycleCapable } from './lifecycle-capable.js';
import { createContextualLogger } from '../../../utils/contextual-logger.js';
import { emit } from '../../utils/event/event-emitter.js';
import { buildTokenLimitExceededEvent } from '../../../graph/execution/utils/event/event-builder.js';
import { generateToolListDescription } from '../../utils/tools/tool-description-generator.js';

const logger = createContextualLogger();

/**
 * ConversationManager 配置选项
 */
export interface ConversationManagerOptions {
  /** Token 限制阈值，超过此值触发消息操作事件 */
  tokenLimit?: number;
  /** 事件管理器 */
  eventManager?: EventManager;
  /** 工作流 ID（用于事件） */
  workflowId?: string;
  /** 线程 ID（用于事件） */
  threadId?: string;
  /** 工具服务（用于工具描述初始化） */
  toolService?: any;
  /** 可用工具配置 */
  availableTools?: {
    /** 初始可用工具集合 */
    initial: Set<string>;
    /** 动态工具配置 */
    dynamicTools?: {
      toolIds: string[];
      descriptionTemplate?: string;
    };
  };
  /** 初始消息列表 */
  initialMessages?: LLMMessage[];
}

/**
 * 对话状态接口（扩展 MessageHistoryState）
 */
export interface ConversationState extends MessageHistoryState {
  /** 累积的 Token 使用统计 */
  tokenUsage: TokenUsageStats | null;
  /** 当前请求的 Token 使用统计 */
  currentRequestUsage: TokenUsageStats | null;
  /** Token 使用历史记录 */
  usageHistory?: TokenUsageHistory[];
}

/**
 * 对话管理器类
 * 扩展 MessageHistory，增加 Graph 特有功能
 */
export class ConversationManager extends MessageHistory implements LifecycleCapable<ConversationState> {
  private tokenUsageTracker: TokenUsageTracker;
  private eventManager?: EventManager;
  private workflowId?: string;
  private threadId?: string;
  private toolService?: any;
  private availableTools?: ConversationManagerOptions['availableTools'];

  /**
   * 构造函数
   * @param options 配置选项
   */
  constructor(options: ConversationManagerOptions = {}) {
    super({ initialMessages: options.initialMessages });

    this.tokenUsageTracker = new TokenUsageTracker({
      tokenLimit: options.tokenLimit
    });
    this.eventManager = options.eventManager;
    this.workflowId = options.workflowId;
    this.threadId = options.threadId;
    this.toolService = options.toolService;
    this.availableTools = options.availableTools;
  }

  // ============================================================
  // Token 统计功能（Graph 特有）
  // ============================================================

  /**
   * 检查 Token 使用情况，触发消息操作事件
   *
   * 说明：
   * - 当 Token 使用量超过阈值时，触发 TOKEN_LIMIT_EXCEEDED 事件
   * - 应用层监听此事件并执行相应的消息操作（如 truncate, filter, clear）
   * - SDK 不提供默认的消息操作实现，由应用层根据业务需求定义
   */
  async checkTokenUsage(): Promise<void> {
    const tokensUsed = this.tokenUsageTracker.getTokenUsage(this.getAllMessages());

    // 如果超过限制，触发 Token 限制事件
    if (this.tokenUsageTracker.isTokenLimitExceeded(this.getAllMessages())) {
      await this.triggerTokenLimitEvent(tokensUsed);
    }
  }

  /**
   * 更新 Token 使用统计
   * @param usage Token 使用数据
   */
  updateTokenUsage(usage?: LLMUsage): void {
    if (!usage) {
      return;
    }
    this.tokenUsageTracker.updateApiUsage(usage);
  }

  /**
   * 累积流式响应的 Token 使用统计
   * @param usage Token 使用数据（增量）
   */
  accumulateStreamUsage(usage: LLMUsage): void {
    this.tokenUsageTracker.accumulateStreamUsage(usage);
  }

  /**
   * 完成当前请求的 Token 统计
   */
  finalizeCurrentRequest(): void {
    this.tokenUsageTracker.finalizeCurrentRequest();
  }

  /**
   * 获取 Token 使用统计
   * @returns Token 使用统计
   */
  getTokenUsage(): TokenUsageStats | null {
    return this.tokenUsageTracker.getCumulativeUsage();
  }

  /**
   * 获取当前请求的 Token 使用统计
   * @returns Token 使用统计
   */
  getCurrentRequestUsage(): TokenUsageStats | null {
    return this.tokenUsageTracker.getCurrentRequestUsage();
  }

  /**
   * 获取 Token 使用历史记录
   * @returns Token 使用历史记录
   */
  getUsageHistory(): TokenUsageHistory[] {
    return this.tokenUsageTracker.getUsageHistory();
  }

  /**
   * 获取 Token 使用追踪器实例
   * @returns TokenUsageTracker 实例
   */
  getTokenUsageTracker(): TokenUsageTracker {
    return this.tokenUsageTracker;
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

  // ============================================================
  // 工具描述消息管理（Graph 特有）
  // ============================================================

  /**
   * 检查是否已经存在工具描述消息
   * @returns 是否存在工具描述消息
   */
  private hasToolDescriptionMessage(): boolean {
    const allMessages = this.getAllMessages();
    return allMessages.some(msg =>
      msg.role === 'system' &&
      typeof msg.content === 'string' &&
      msg.content.startsWith('可用工具:')
    );
  }

  /**
   * 获取初始可用工具的描述消息（不包含 dynamicTools）
   * @returns 工具描述消息，如果没有初始工具则返回 null
   */
  getInitialToolDescriptionMessage(): LLMMessage | null {
    if (!this.availableTools || !this.toolService) {
      return null;
    }

    // 只使用 initial 工具集合
    const initialToolIds = Array.from(this.availableTools.initial);
    if (initialToolIds.length === 0) {
      return null;
    }

    // 获取工具对象列表
    const tools = initialToolIds
      .map(id => this.toolService!.getTool(id))
      .filter(Boolean);

    // 使用工具描述生成器生成工具列表描述
    const toolDescriptions = generateToolListDescription(tools, 'list');

    if (toolDescriptions.length > 0) {
      return {
        role: 'system',
        content: `可用工具:\n${toolDescriptions}`
      };
    }

    return null;
  }

  /**
   * 在新批次开始时添加初始工具描述（如果不存在）
   * @param boundaryIndex 批次边界索引
   */
  startNewBatchWithInitialTools(boundaryIndex: number): number {
    // 开始新批次
    const newBatch = this.startNewBatch(boundaryIndex);

    // 检查是否已存在工具描述消息
    if (!this.hasToolDescriptionMessage()) {
      // 添加初始工具描述消息
      const toolDescMessage = this.getInitialToolDescriptionMessage();
      if (toolDescMessage) {
        this.addMessage(toolDescMessage);
      }
    }

    return newBatch;
  }

  // ============================================================
  // 重写父类方法
  // ============================================================

  /**
   * 克隆 ConversationManager 实例
   * @returns 克隆的 ConversationManager 实例
   */
  override clone(): ConversationManager {
    const clonedManager = new ConversationManager({
      tokenLimit: this.tokenUsageTracker['tokenLimit'],
      eventManager: this.eventManager,
      workflowId: this.workflowId,
      threadId: this.threadId,
      toolService: this.toolService,
      availableTools: this.availableTools,
      initialMessages: this.getAllMessages()
    });

    // 复制 token 使用统计
    clonedManager.tokenUsageTracker = this.tokenUsageTracker.clone();

    // 复制标记映射
    clonedManager.setMarkMap(this.getMarkMap());

    return clonedManager;
  }

  /**
   * 创建状态快照
   * @returns 对话状态快照
   */
  override createSnapshot(): ConversationState {
    const baseSnapshot = super.createSnapshot();
    return {
      ...baseSnapshot,
      tokenUsage: this.getTokenUsage(),
      currentRequestUsage: this.getCurrentRequestUsage(),
      usageHistory: this.getUsageHistory()
    };
  }

  /**
   * 从快照恢复状态
   * @param snapshot 对话状态快照
   */
  override restoreFromSnapshot(snapshot: ConversationState): void {
    super.restoreFromSnapshot(snapshot);
    // Token 统计不恢复，保持当前状态
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
