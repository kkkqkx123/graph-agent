/**
 * 工具确认服务
 *
 * 核心职责：
 * 1. 管理工具调用的确认流程
 * 2. 支持自动批准和人工确认
 * 3. 提供确认结果回调机制
 * 4. 支持参数修改和拒绝操作
 *
 * 设计原则：
 * - 策略模式：支持多种确认策略
 * - 可配置：通过配置控制确认行为
 * - 通用性：可被 Graph 模块和 Agent 模块共享
 */

import type { LLMToolCall } from '@modular-agent/types';

/**
 * 工具确认结果
 */
export interface ToolConfirmationResult {
  /** 是否批准执行 */
  approved: boolean;
  /** 修改后的参数（可选） */
  modifiedArgs?: Record<string, unknown>;
  /** 拒绝原因（可选） */
  rejectionReason?: string;
  /** 用户额外指令（可选） */
  userInstruction?: string;
}

/**
 * 工具确认配置
 */
export interface ToolConfirmationConfig {
  /** 自动批准的工具 ID 列表 */
  autoApprovedTools?: string[];
  /** 需要确认的工具 ID 列表（优先级高于 autoApprovedTools） */
  requiresConfirmationTools?: string[];
  /** 确认超时时间（毫秒），0 表示无限等待 */
  confirmationTimeout?: number;
  /** 确认请求回调 */
  requestConfirmation?: (toolCall: LLMToolCall) => Promise<ToolConfirmationResult>;
  /** 默认批准行为（当没有配置时） */
  defaultApproved?: boolean;
}

/**
 * 工具确认服务
 *
 * 通用工具确认组件，支持 Graph 模块和 Agent 模块共享使用。
 */
export class ToolConfirmationService {
  private config: ToolConfirmationConfig;

  /**
   * 构造函数
   * @param config 确认配置
   */
  constructor(config: ToolConfirmationConfig = {}) {
    this.config = {
      autoApprovedTools: [],
      requiresConfirmationTools: [],
      confirmationTimeout: 0,
      defaultApproved: true,
      ...config
    };
  }

  /**
   * 确认工具调用
   *
   * @param toolCall 工具调用
   * @returns 确认结果
   */
  async confirm(toolCall: LLMToolCall): Promise<ToolConfirmationResult> {
    // 检查是否需要确认
    if (!this.needsConfirmation(toolCall)) {
      return { approved: true };
    }

    // 如果有自定义确认回调，使用回调
    if (this.config.requestConfirmation) {
      return this.config.requestConfirmation(toolCall);
    }

    // 默认行为
    return { approved: this.config.defaultApproved ?? true };
  }

  /**
   * 检查工具是否需要确认
   *
   * @param toolCall 工具调用
   * @returns 是否需要确认
   */
  needsConfirmation(toolCall: LLMToolCall): boolean {
    const toolId = toolCall.function.name;

    // 如果在需要确认列表中，必须确认
    if (this.config.requiresConfirmationTools?.includes(toolId)) {
      return true;
    }

    // 如果在自动批准列表中，不需要确认
    if (this.config.autoApprovedTools?.includes(toolId)) {
      return false;
    }

    // 使用默认行为
    return !this.config.defaultApproved;
  }

  /**
   * 检查工具是否自动批准
   *
   * @param toolId 工具 ID
   * @returns 是否自动批准
   */
  isAutoApproved(toolId: string): boolean {
    // 如果在需要确认列表中，不自动批准
    if (this.config.requiresConfirmationTools?.includes(toolId)) {
      return false;
    }

    // 如果在自动批准列表中，自动批准
    if (this.config.autoApprovedTools?.includes(toolId)) {
      return true;
    }

    // 使用默认行为
    return this.config.defaultApproved ?? true;
  }

  /**
   * 添加自动批准工具
   *
   * @param toolId 工具 ID
   */
  addAutoApprovedTool(toolId: string): void {
    if (!this.config.autoApprovedTools) {
      this.config.autoApprovedTools = [];
    }
    if (!this.config.autoApprovedTools.includes(toolId)) {
      this.config.autoApprovedTools.push(toolId);
    }
  }

  /**
   * 移除自动批准工具
   *
   * @param toolId 工具 ID
   */
  removeAutoApprovedTool(toolId: string): void {
    if (this.config.autoApprovedTools) {
      this.config.autoApprovedTools = this.config.autoApprovedTools.filter(id => id !== toolId);
    }
  }

  /**
   * 添加需要确认的工具
   *
   * @param toolId 工具 ID
   */
  addRequiresConfirmationTool(toolId: string): void {
    if (!this.config.requiresConfirmationTools) {
      this.config.requiresConfirmationTools = [];
    }
    if (!this.config.requiresConfirmationTools.includes(toolId)) {
      this.config.requiresConfirmationTools.push(toolId);
    }
  }

  /**
   * 移除需要确认的工具
   *
   * @param toolId 工具 ID
   */
  removeRequiresConfirmationTool(toolId: string): void {
    if (this.config.requiresConfirmationTools) {
      this.config.requiresConfirmationTools = this.config.requiresConfirmationTools.filter(id => id !== toolId);
    }
  }

  /**
   * 获取配置
   * @returns 当前配置
   */
  getConfig(): ToolConfirmationConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   * @param config 新配置（部分）
   */
  updateConfig(config: Partial<ToolConfirmationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 设置确认回调
   *
   * @param callback 确认回调函数
   */
  setConfirmationCallback(callback: (toolCall: LLMToolCall) => Promise<ToolConfirmationResult>): void {
    this.config.requestConfirmation = callback;
  }

  /**
   * 设置确认超时
   *
   * @param timeout 超时时间（毫秒）
   */
  setConfirmationTimeout(timeout: number): void {
    this.config.confirmationTimeout = timeout;
  }

  /**
   * 获取确认超时
   *
   * @returns 超时时间（毫秒）
   */
  getConfirmationTimeout(): number {
    return this.config.confirmationTimeout ?? 0;
  }

  /**
   * 批量确认工具调用
   *
   * @param toolCalls 工具调用列表
   * @returns 确认结果列表
   */
  async confirmBatch(toolCalls: LLMToolCall[]): Promise<ToolConfirmationResult[]> {
    const results: ToolConfirmationResult[] = [];

    for (const toolCall of toolCalls) {
      const result = await this.confirm(toolCall);
      results.push(result);

      // 如果有一个被拒绝，可以选择停止后续确认
      if (!result.approved) {
        // 继续确认其他工具调用，但记录拒绝
      }
    }

    return results;
  }

  /**
   * 创建批准结果
   *
   * @param modifiedArgs 修改后的参数（可选）
   * @returns 批准结果
   */
  static createApprovedResult(modifiedArgs?: Record<string, unknown>): ToolConfirmationResult {
    return {
      approved: true,
      modifiedArgs
    };
  }

  /**
   * 创建拒绝结果
   *
   * @param reason 拒绝原因
   * @returns 拒绝结果
   */
  static createRejectedResult(reason: string): ToolConfirmationResult {
    return {
      approved: false,
      rejectionReason: reason
    };
  }

  /**
   * 创建带指令的批准结果
   *
   * @param userInstruction 用户额外指令
   * @param modifiedArgs 修改后的参数（可选）
   * @returns 批准结果
   */
  static createApprovedWithInstructionResult(
    userInstruction: string,
    modifiedArgs?: Record<string, unknown>
  ): ToolConfirmationResult {
    return {
      approved: true,
      userInstruction,
      modifiedArgs
    };
  }
}
