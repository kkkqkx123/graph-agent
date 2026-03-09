/**
 * 中断管理器
 * 统一管理执行中断状态和操作
 *
 * 职责：
 * - 管理中断状态（PAUSE/STOP）
 * - 提供 AbortSignal 用于深度中断
 * - 统一中断请求和恢复操作
 *
 * 设计原则：
 * - 单一职责：只负责中断状态管理
 * - 封装性：隐藏内部实现细节
 * - 线程安全：确保状态变更的原子性
 * - 统一使用 AbortSignal 作为主要中断机制
 * - 通用性：可被 Graph 模块和 Agent 模块共享
 */

import { InterruptedException, ThreadInterruptedException } from '@modular-agent/types';

/**
 * 中断类型
 */
export type InterruptionType = 'PAUSE' | 'STOP' | null;

/**
 * 中断异常信息
 */
export interface InterruptionInfo {
  /** 中断类型 */
  type: InterruptionType;
  /** 中断消息 */
  message: string;
  /** 上下文 ID（如线程 ID、会话 ID 等） */
  contextId?: string;
  /** 节点 ID（可选） */
  nodeId?: string;
}

/**
 * 中断管理器配置
 */
export interface InterruptionManagerConfig {
  /** 上下文 ID（如线程 ID、会话 ID 等） */
  contextId: string;
  /** 节点 ID（可选） */
  nodeId?: string;
  /** 自定义中断异常创建函数 */
  createInterruptionError?: (info: InterruptionInfo) => InterruptedException;
}

/**
 * 中断管理器
 *
 * 通用中断管理组件，支持 Graph 模块和 Agent 模块共享使用。
 */
export class InterruptionManager {
  private abortController: AbortController = new AbortController();
  private interruptionType: InterruptionType = null;
  private contextId: string;
  private nodeId: string;
  private createInterruptionError?: (info: InterruptionInfo) => InterruptedException;

  /**
   * 构造函数
   * @param config 配置选项
   */
  constructor(config: InterruptionManagerConfig);

  /**
   * 构造函数（向后兼容）
   * @param threadId 线程 ID
   * @param nodeId 节点 ID
   * @deprecated 使用配置对象形式
   */
  constructor(threadId: string, nodeId: string);

  constructor(configOrThreadId: InterruptionManagerConfig | string, nodeId?: string) {
    if (typeof configOrThreadId === 'string') {
      // 向后兼容：旧的构造函数形式
      this.contextId = configOrThreadId;
      this.nodeId = nodeId ?? '';
    } else {
      // 新的配置对象形式
      this.contextId = configOrThreadId.contextId;
      this.nodeId = configOrThreadId.nodeId ?? '';
      this.createInterruptionError = configOrThreadId.createInterruptionError;
    }
  }

  /**
   * 请求暂停
   */
  requestPause(): void {
    if (this.interruptionType === 'PAUSE') {
      return; // 已经是暂停状态
    }

    this.interruptionType = 'PAUSE';
    const error = this.createError('Execution paused', 'PAUSE');
    this.abortController.abort(error);
  }

  /**
   * 请求停止
   */
  requestStop(): void {
    if (this.interruptionType === 'STOP') {
      return; // 已经是停止状态
    }

    this.interruptionType = 'STOP';
    const error = this.createError('Execution stopped', 'STOP');
    this.abortController.abort(error);
  }

  /**
   * 恢复执行
   */
  resume(): void {
    this.interruptionType = null;
    // 重置 AbortController
    this.abortController = new AbortController();
  }

  /**
   * 获取中断类型
   */
  getInterruptionType(): InterruptionType {
    return this.interruptionType;
  }

  /**
   * 获取 AbortSignal
   */
  getAbortSignal(): AbortSignal {
    return this.abortController.signal;
  }

  /**
   * 检查是否已中止
   */
  isAborted(): boolean {
    return this.abortController.signal.aborted;
  }

  /**
   * 检查是否应该暂停
   */
  shouldPause(): boolean {
    return this.interruptionType === 'PAUSE';
  }

  /**
   * 检查是否应该停止
   */
  shouldStop(): boolean {
    return this.interruptionType === 'STOP';
  }

  /**
   * 获取中止原因
   */
  getAbortReason(): Error | undefined {
    return this.abortController.signal.reason as Error | undefined;
  }

  /**
   * 更新当前节点ID
   */
  updateNodeId(nodeId: string): void {
    this.nodeId = nodeId;
  }

  /**
   * 获取上下文ID
   */
  getContextId(): string {
    return this.contextId;
  }

  /**
   * 获取线程ID（向后兼容）
   * @deprecated 使用 getContextId()
   */
  getThreadId(): string {
    return this.contextId;
  }

  /**
   * 获取节点ID
   */
  getNodeId(): string {
    return this.nodeId;
  }

  /**
   * 创建中断错误
   */
  private createError(message: string, type: 'PAUSE' | 'STOP'): InterruptedException {
    const info: InterruptionInfo = {
      type,
      message,
      contextId: this.contextId,
      nodeId: this.nodeId
    };

    if (this.createInterruptionError) {
      return this.createInterruptionError(info);
    }

    // 默认使用 ThreadInterruptedException（向后兼容）
    return new ThreadInterruptedException(message, type, this.contextId, this.nodeId);
  }
}
