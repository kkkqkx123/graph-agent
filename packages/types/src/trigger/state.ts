/**
 * 触发器状态类型定义
 */

import type { ID, Timestamp } from '../common';

/**
 * 触发器类型枚举
 */
export enum TriggerType {
  /** 事件触发器 - 监听 SDK 现有事件 */
  EVENT = 'event'
}

/**
 * 触发器状态枚举
 */
export enum TriggerStatus {
  /** 已启用 */
  ENABLED = 'enabled',
  /** 已禁用 */
  DISABLED = 'disabled',
  /** 已触发 */
  TRIGGERED = 'triggered'
}

/**
 * 触发器运行时状态接口
 * 只包含运行时状态，不包含触发器定义
 * 用于状态管理器和检查点中保存触发器的运行时状态
 */
export interface TriggerRuntimeState {
  /** 触发器 ID */
  triggerId: ID;
  /** 线程 ID */
  threadId: ID;
  /** 工作流 ID */
  workflowId: ID;
  /** 触发器状态 */
  status: TriggerStatus;
  /** 触发次数 */
  triggerCount: number;
  /** 最后更新时间 */
  updatedAt: Timestamp;
}