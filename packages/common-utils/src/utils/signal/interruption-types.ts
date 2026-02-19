/**
 * 中断结果类型定义
 * 使用返回值标记体系替代错误体系处理控制流中断
 */

import type { InterruptionType } from '@modular-agent/types';

/**
 * 中断检查结果
 */
export type InterruptionCheckResult =
  | { type: 'continue' }
  | { type: 'paused'; nodeId: string; threadId?: string }
  | { type: 'stopped'; nodeId: string; threadId?: string }
  | { type: 'aborted'; reason?: any };

/**
 * 中断信息
 */
export interface InterruptionInfo {
  type: Exclude<InterruptionType, null>;
  threadId: string;
  nodeId: string;
  timestamp?: number;
}

/**
 * 可中断操作的配置
 */
export interface InterruptibleOptions {
  /** 检查间隔（毫秒），默认 0（每次调用都检查） */
  checkInterval?: number;
  /** 自定义检查函数 */
  customCheck?: () => InterruptionCheckResult;
}