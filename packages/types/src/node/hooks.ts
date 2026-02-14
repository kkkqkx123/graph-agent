/**
 * 节点Hook相关类型定义
 */

import type { Condition } from '../condition';

/**
 * Hook类型枚举
 */
export enum HookType {
  /** 节点执行前触发 */
  BEFORE_EXECUTE = 'BEFORE_EXECUTE',
  /** 节点执行后触发 */
  AFTER_EXECUTE = 'AFTER_EXECUTE'
}

/**
 * 节点Hook配置
 */
export interface NodeHook {
  /** Hook类型 */
  hookType: HookType;
  /** 触发条件表达式（可选） */
  condition?: Condition;
  /** 要触发的自定义事件名称 */
  eventName: string;
  /** 事件载荷生成逻辑（可选） */
  eventPayload?: Record<string, any>;
  /** 是否启用（默认true） */
  enabled?: boolean;
  /** 权重（数字越大优先级越高） */
  weight?: number;
  /** Hook触发时是否创建检查点（新增） */
  createCheckpoint?: boolean;
  /** 检查点描述（新增） */
  checkpointDescription?: string;
}