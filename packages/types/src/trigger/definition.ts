/**
 * 触发器定义类型
 */

import type { ID, Timestamp, Metadata } from '../common.js';
import type { TriggerStatus } from './state.js';
import type { TriggerCondition, TriggerAction } from './config.js';

/**
 * 触发器定义接口
 *
 * 设计说明：
 * - 同时用于定义时（Workflow定义）和运行时
 * - 定义时使用：提供 id, name, condition, action, enabled 等基础字段
 * - 运行时使用：补充 status, triggerCount, createdAt, updatedAt 等运行时字段
 */
export interface Trigger {
  /** 触发器唯一标识符 */
  id: ID;
  /** 触发器名称 */
  name: string;
  /** 触发器描述 */
  description?: string;
  /** 触发条件 */
  condition: TriggerCondition;
  /** 触发动作 */
  action: TriggerAction;
  /** 触发次数限制（0表示无限制） */
  maxTriggers?: number;
  /** 触发器元数据 */
  metadata?: Metadata;
  /** 触发时是否创建检查点 */
  createCheckpoint?: boolean;
  /** 检查点描述 */
  checkpointDescription?: string;

  // ==========================================================================
  // 运行时字段（定义时可不提供，运行时自动填充）
  // ==========================================================================

  /**
   * 触发器状态（运行时）
   * - 定义时：可通过 enabled 字段间接设置
   * - 运行时：由系统维护
   */
  status?: TriggerStatus;

  /**
   * 是否启用（定义时使用）
   * - 默认 true
   * - 转换为 Trigger 时会映射为 status
   */
  enabled?: boolean;

  /** 关联的工作流 ID（运行时） */
  workflowId?: ID;
  /** 关联的线程 ID（运行时） */
  threadId?: ID;
  /** 已触发次数（运行时） */
  triggerCount?: number;
  /** 创建时间（运行时） */
  createdAt?: Timestamp;
  /** 更新时间（运行时） */
  updatedAt?: Timestamp;
}

/**
 * 工作流触发器类型别名
 * 用于表示在工作流中完整定义的触发器（相对于 TriggerReference）
 */
export type WorkflowTrigger = Trigger;
